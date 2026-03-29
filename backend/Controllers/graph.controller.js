import Graph from "../Models/Graph.js";
import Table from "../Models/Tables.js";
import DBConnection from "../Models/Database.js";
import mysql from "mysql2/promise";
import { Client } from "pg";
import mongoose from "mongoose";

export const saveGraph = async (req, res, next) => {
  try {
    let config = trimConfig(req.body);
    if (!config.chartType && config.chart) config.chartType = config.chart.trim();
    if (!config.chartType) return res.status(400).json({ error: "chartType is required" });
    const graph = await Graph.create(config);
    res.status(201).json({ success: true, graph });
  } catch (error) {
    next(error);
  }
};

export const createGraph = async (req, res, next) => {
  try {
    const graph = await Graph.findById(req.body.graphId);
    if (!graph) return res.status(404).json({ error: "Graph not found" });

    const table = await Table.findById(graph.tableId);
    if (!table) return res.status(404).json({ error: "Table not found" });

    const connection = await DBConnection.findById(table.connectionId);
    if (!connection) return res.status(404).json({ error: "Connection not found" });

    const isHistogram = graph.chartType?.trim().toLowerCase() === "histogram";
    const fields = isHistogram
      ? [...(graph.xAxis || [])]
      : [...(graph.xAxis || []), ...(graph.yAxis || [])];

    const queryOptions = {
      filters:      graph.filters      || [],
      rowLimit:     graph.rowLimit     || null,
      rowSelection: graph.rowSelection || "all",
      sortBy:       graph.sortBy?.field ? graph.sortBy : null,
    };

    const rawData = await fetchRawData(
      connection.dbtype,
      connection.credentials,
      table.tableName,
      fields,
      queryOptions
    );

    const chartData = isHistogram
      ? buildHistogramData(rawData, graph)
      : buildChartData(aggregateData(rawData, graph), graph);

    res.json({ success: true, chartData });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL GRAPHS
// ─────────────────────────────────────────────────────────────────────────────
export const getAllgraphs = async (req, res, next) => {
  try {
    const graphs = await Graph.find({ userId: req.body.userId }).sort({ createdAt: -1 });
    res.json({ success: true, graphs });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE GRAPH
// ─────────────────────────────────────────────────────────────────────────────
export const deleteGraph = async (req, res, next) => {
  try {
    const { graphId } = req.params;
    const result = await Graph.deleteOne({ _id: graphId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Graph not found" });
    }
    res.json({ success: true, message: "Graph deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HISTOGRAM  — bins a numeric field into N frequency buckets
// ─────────────────────────────────────────────────────────────────────────────
function buildHistogramData(data, config) {
  const field = (config.xAxis || [])[0];
  if (!field) return { labels: [], datasets: [{ label: "Frequency", data: [] }] };

  // Extract and sanitise numeric values
  const values = data
    .map((row) => Number(row[field]))
    .filter((v) => !isNaN(v) && isFinite(v));

  if (values.length === 0) {
    return { labels: [], datasets: [{ label: `${field} (frequency)`, data: [] }] };
  }

  const binCount = Math.min(Number(config.binCount) || 10, 50); // cap at 50 bins
  const minVal   = Math.min(...values);
  const maxVal   = Math.max(...values);

  // Edge case: all values identical → single bin
  if (minVal === maxVal) {
    return {
      labels:   [String(minVal)],
      datasets: [{ label: `${field} (frequency)`, data: [values.length] }],
    };
  }

  const binWidth = (maxVal - minVal) / binCount;
  const bins     = Array(binCount).fill(0);

  values.forEach((v) => {
    let idx = Math.floor((v - minVal) / binWidth);
    if (idx >= binCount) idx = binCount - 1; // clamp the maximum value
    bins[idx]++;
  });

  // Format label numbers — integer if whole, 1 decimal otherwise
  const fmt = (n) => {
    if (Number.isInteger(n)) return String(n);
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  };

  const labels = bins.map((_, i) => {
    const lo = minVal + i * binWidth;
    const hi = minVal + (i + 1) * binWidth;
    return `${fmt(lo)}–${fmt(hi)}`;
  });

  return {
    labels,
    datasets: [{ label: `${field} (frequency)`, data: bins }],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — filter builders per DB
// ─────────────────────────────────────────────────────────────────────────────
function parseNumericValue(v) {
  const n = Number(v);
  return isNaN(n) ? v : n;
}

function buildMySQLWhere(filters, params) {
  if (!filters || filters.length === 0) return "";
  const clauses = filters
    .filter((f) => f.field && f.operator)
    .map((f) => {
      switch (f.operator) {
        case "=":            params.push(f.value);                   return `\`${f.field}\` = ?`;
        case "!=":           params.push(f.value);                   return `\`${f.field}\` != ?`;
        case ">":            params.push(parseNumericValue(f.value)); return `\`${f.field}\` > ?`;
        case ">=":           params.push(parseNumericValue(f.value)); return `\`${f.field}\` >= ?`;
        case "<":            params.push(parseNumericValue(f.value)); return `\`${f.field}\` < ?`;
        case "<=":           params.push(parseNumericValue(f.value)); return `\`${f.field}\` <= ?`;
        case "contains":     params.push(`%${f.value}%`);            return `\`${f.field}\` LIKE ?`;
        case "not_contains": params.push(`%${f.value}%`);            return `\`${f.field}\` NOT LIKE ?`;
        default:             params.push(f.value);                   return `\`${f.field}\` = ?`;
      }
    });
  return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
}

function buildPostgresWhere(filters, params) {
  if (!filters || filters.length === 0) return "";
  const clauses = filters
    .filter((f) => f.field && f.operator)
    .map((f) => {
      const idx = params.length + 1;
      switch (f.operator) {
        case "=":            params.push(f.value);                   return `"${f.field}" = $${idx}`;
        case "!=":           params.push(f.value);                   return `"${f.field}" != $${idx}`;
        case ">":            params.push(parseNumericValue(f.value)); return `"${f.field}" > $${idx}`;
        case ">=":           params.push(parseNumericValue(f.value)); return `"${f.field}" >= $${idx}`;
        case "<":            params.push(parseNumericValue(f.value)); return `"${f.field}" < $${idx}`;
        case "<=":           params.push(parseNumericValue(f.value)); return `"${f.field}" <= $${idx}`;
        case "contains":     params.push(`%${f.value}%`);            return `"${f.field}"::text ILIKE $${idx}`;
        case "not_contains": params.push(`%${f.value}%`);            return `"${f.field}"::text NOT ILIKE $${idx}`;
        default:             params.push(f.value);                   return `"${f.field}" = $${idx}`;
      }
    });
  return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
}

function buildMongoMatch(filters) {
  if (!filters || filters.length === 0) return {};
  const match = {};
  filters.forEach((f) => {
    if (!f.field || !f.operator) return;
    const v = parseNumericValue(f.value);
    switch (f.operator) {
      case "=":            match[f.field] = { $eq: v };                          break;
      case "!=":           match[f.field] = { $ne: v };                          break;
      case ">":            match[f.field] = { $gt: v };                          break;
      case ">=":           match[f.field] = { $gte: v };                         break;
      case "<":            match[f.field] = { $lt: v };                          break;
      case "<=":           match[f.field] = { $lte: v };                         break;
      case "contains":     match[f.field] = { $regex: f.value, $options: "i" }; break;
      case "not_contains": match[f.field] = { $not: new RegExp(f.value, "i") }; break;
      default:             match[f.field] = { $eq: v };
    }
  });
  return match;
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH RAW DATA
// ─────────────────────────────────────────────────────────────────────────────
async function fetchRawData(dbType, credentials, tableName, fields, options = {}) {
  const {
    filters      = [],
    rowLimit     = null,
    rowSelection = "all",
    sortBy       = null,
  } = options;

  const limit  = rowLimit ? Number(rowLimit) : null;
  const isHead = rowSelection === "head";
  const isTail = rowSelection === "tail";

  if (dbType === "mysql") {
    const conn = await mysql.createConnection({
      host:     credentials.host,
      port:     credentials.port || 3306,
      user:     credentials.user,
      password: credentials.password,
      database: credentials.database,
    });
    try {
      const escaped = fields.map((f) => `\`${f}\``).join(", ");
      const params  = [];
      const where   = buildMySQLWhere(filters, params);
      let orderDir  = "ASC";
      if (sortBy?.field) {
        orderDir = isTail
          ? (sortBy.order === "desc" ? "ASC" : "DESC")
          : (sortBy.order === "desc" ? "DESC" : "ASC");
      }
      const orderClause = sortBy?.field ? `ORDER BY \`${sortBy.field}\` ${orderDir}` : "";
      const limitClause = limit && (isHead || (isTail && sortBy?.field)) ? `LIMIT ${limit}` : "";
      const sql = `SELECT ${escaped} FROM \`${tableName}\` ${where} ${orderClause} ${limitClause}`.trim();
      const [rows] = await conn.execute(sql, params);
      if (isTail && sortBy?.field)          return rows.reverse();
      if (isTail && !sortBy?.field && limit) return rows.slice(-limit);
      if (rowSelection === "all" && limit)   return rows.slice(0, limit);
      return rows;
    } finally {
      await conn.end();
    }
  }

  if (dbType === "postgresql") {
    const client = new Client({
      host:     credentials.host,
      port:     credentials.port || 5432,
      user:     credentials.user,
      password: credentials.password,
      database: credentials.database,
    });
    await client.connect();
    try {
      const escaped = fields.map((f) => `"${f}"`).join(", ");
      const params  = [];
      const where   = buildPostgresWhere(filters, params);
      let orderDir  = "ASC";
      if (sortBy?.field) {
        orderDir = isTail
          ? (sortBy.order === "desc" ? "ASC" : "DESC")
          : (sortBy.order === "desc" ? "DESC" : "ASC");
      }
      const orderClause = sortBy?.field ? `ORDER BY "${sortBy.field}" ${orderDir}` : "";
      const limitClause = limit && (isHead || (isTail && sortBy?.field)) ? `LIMIT ${limit}` : "";
      const sql    = `SELECT ${escaped} FROM "${tableName}" ${where} ${orderClause} ${limitClause}`.trim();
      const result = await client.query(sql, params);
      const rows   = result.rows;
      if (isTail && sortBy?.field)          return rows.reverse();
      if (isTail && !sortBy?.field && limit) return rows.slice(-limit);
      if (rowSelection === "all" && limit)   return rows.slice(0, limit);
      return rows;
    } finally {
      await client.end();
    }
  }

  if (dbType === "mongodb") {
    const uri =
      credentials.uri ||
      `mongodb://${credentials.host}:${credentials.port || 27017}/${credentials.database}`;
    const conn = await mongoose.createConnection(uri).asPromise();
    try {
      const db         = conn.db;
      const projection = {};
      fields.forEach((f) => { projection[f] = 1; });
      const matchStage = buildMongoMatch(filters);
      let sortStage    = {};
      if (sortBy?.field) {
        const dir = isTail
          ? (sortBy.order === "desc" ? 1 : -1)
          : (sortBy.order === "desc" ? -1 : 1);
        sortStage = { [sortBy.field]: dir };
      }
      let cursor = db.collection(tableName).find(matchStage, { projection });
      if (sortBy?.field) cursor = cursor.sort(sortStage);
      if (limit && (isHead || (isTail && sortBy?.field))) {
        cursor = cursor.limit(limit);
      } else if (limit && isTail && !sortBy?.field) {
        const total = await db.collection(tableName).countDocuments(matchStage);
        cursor = cursor.skip(Math.max(0, total - limit));
      }
      const docs = await cursor.toArray();
      if (isTail && sortBy?.field)          return docs.reverse();
      if (rowSelection === "all" && limit)   return docs.slice(0, limit);
      return docs;
    } finally {
      await conn.close();
    }
  }

  if (dbType === "api") {
    const { uri, method = "GET", headers = {} } = credentials;
    const response = await fetch(uri, { method, headers });
    const data     = await response.json();
    let rows       = Array.isArray(data) ? data : data.data || [data];
    if (filters.length > 0) {
      rows = rows.filter((row) =>
        filters.every((f) => {
          const cellVal   = row[f.field];
          const filterVal = parseNumericValue(f.value);
          switch (f.operator) {
            case "=":            return cellVal == filterVal;
            case "!=":           return cellVal != filterVal;
            case ">":            return Number(cellVal) > Number(filterVal);
            case ">=":           return Number(cellVal) >= Number(filterVal);
            case "<":            return Number(cellVal) < Number(filterVal);
            case "<=":           return Number(cellVal) <= Number(filterVal);
            case "contains":     return String(cellVal).toLowerCase().includes(String(f.value).toLowerCase());
            case "not_contains": return !String(cellVal).toLowerCase().includes(String(f.value).toLowerCase());
            default:             return true;
          }
        })
      );
    }
    if (sortBy?.field) {
      rows.sort((a, b) => {
        const av = a[sortBy.field], bv = b[sortBy.field];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortBy.order === "desc" ? -cmp : cmp;
      });
    }
    if (limit) rows = isTail ? rows.slice(-limit) : rows.slice(0, limit);
    return rows;
  }

  throw new Error(`Unsupported database type: ${dbType}`);
}


function aggregateData(data, config) {
  const grouped = {};
  const avgCounter = {};
  const xKey = config.xAxis?.[0]; 
  const yAxis = config.yAxis || [];
  const agg = (config.aggregation || "sum").trim().toLowerCase();
  for (const row of data) {
    const key = row[xKey];
    if (!grouped[key]) {
      grouped[key] = { label: key, values: {} };
      if (agg === "avg" || agg === "average") {
        avgCounter[key] = {};
      }
      for (const y of yAxis) {
        grouped[key].values[y] = 0;
        if (avgCounter[key]) avgCounter[key][y] = 0;
      }
    }

    const groupValues = grouped[key].values;
    for (const y of yAxis) {
      const value = Number(row[y]) || 0;
      switch (agg) {
        case "sum":
          groupValues[y] += value;
          break;
        case "count":
          groupValues[y] += 1;
          break;
        case "avg":
        case "average":
          groupValues[y] += value;
          avgCounter[key][y] += 1;
          break;
        case "max":
          groupValues[y] = Math.max(groupValues[y], value);
          break;
        case "min":
          groupValues[y] =
          groupValues[y] === 0 ? value : Math.min(groupValues[y], value);
          break;
        default:
          groupValues[y] += value;
      }
    }
  }
  if (agg === "avg" || agg === "average") {
    for (const key in grouped) {
      for (const y of yAxis) {
        grouped[key].values[y] =
          grouped[key].values[y] / (avgCounter[key][y] || 1);
      }
    }
  }
  return Object.values(grouped);
}









function buildChartData(data, config) {
  const labels   = data.map((d) => d.label);
  const datasets = (config.yAxis || []).map((field) => ({
    label: field,
    data:  data.map((d) => d.values[field]),
  }));
  return { labels, datasets };
}

function trimConfig(config) {
  const t = { ...config };
  if (typeof t.chart       === "string") t.chart       = t.chart.trim();
  if (typeof t.chartType   === "string") t.chartType   = t.chartType.trim();
  if (typeof t.xLabel      === "string") t.xLabel      = t.xLabel.trim();
  if (typeof t.yLabel      === "string") t.yLabel      = t.yLabel.trim();
  if (typeof t.aggregation === "string") t.aggregation = t.aggregation.trim().toLowerCase();
  if (Array.isArray(t.xAxis))   t.xAxis   = t.xAxis.map((v) => v.trim());
  if (Array.isArray(t.yAxis))   t.yAxis   = t.yAxis.map((v) => v.trim());
  if (Array.isArray(t.fields))  t.fields  = t.fields.map((v) => v.trim());
  if (Array.isArray(t.filters)) {
    t.filters = t.filters.map((f) => ({
      field:    String(f.field    || "").trim(),
      operator: String(f.operator || "=").trim(),
      value:    String(f.value    ?? "").trim(),
    }));
  }
  return t;
}
// Services/dbAggregationService.js
// ─────────────────────────────────────────────────────────────────────────────
// Instead of pulling all rows into Node.js and aggregating in-memory, we push
// GROUP BY / aggregation pipeline queries down to the database engine.
//
// Exports:
//   fetchAggregatedData(dbType, credentials, tableName, config)
//     → [{ label, <y1>: n, <y2>: n, … }]   (already aggregated)
//
//   fetchRawColumn(dbType, credentials, tableName, field, options)
//     → [number, …]   (used only by histogram — needs individual values)
// ─────────────────────────────────────────────────────────────────────────────

import mysql from "mysql2/promise";
import { Client } from "pg";
import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// Filter helpers (inlined so this service is self-contained)
// ─────────────────────────────────────────────────────────────────────────────

function parseNumericValue(v) {
  const n = Number(v);
  return isNaN(n) ? v : n;
}

function buildMySQLWhere(filters, params) {
  if (!filters?.length) return "";
  const clauses = filters
    .filter((f) => f.field && f.operator)
    .map((f) => {
      switch (f.operator) {
        case "=":      params.push(f.value); return `\`${f.field}\` = ?`;
        case "!=":      params.push(f.value);   return `\`${f.field}\` != ?`;
        case ">":       params.push(parseNumericValue(f.value)); return `\`${f.field}\` > ?`;
        case ">=":      params.push(parseNumericValue(f.value)); return `\`${f.field}\` >= ?`;
        case "<":      params.push(parseNumericValue(f.value)); return `\`${f.field}\` < ?`;
        case "<=":    params.push(parseNumericValue(f.value)); return `\`${f.field}\` <= ?`;
        case "contains":  params.push(`%${f.value}%`);             return `\`${f.field}\` LIKE ?`;
        case "not_contains": params.push(`%${f.value}%`);             return `\`${f.field}\` NOT LIKE ?`;
        default:             params.push(f.value);                    return `\`${f.field}\` = ?`;
      }
    });
  return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
}

function buildPostgresWhere(filters, params) {
  if (!filters?.length) return "";
  const clauses = filters
    .filter((f) => f.field && f.operator)
    .map((f) => {
      const idx = params.length + 1;
      switch (f.operator) {
        case "=":            params.push(f.value);                    return `"${f.field}" = $${idx}`;
        case "!=":           params.push(f.value);                    return `"${f.field}" != $${idx}`;
        case ">":            params.push(parseNumericValue(f.value)); return `"${f.field}" > $${idx}`;
        case ">=":           params.push(parseNumericValue(f.value)); return `"${f.field}" >= $${idx}`;
        case "<":            params.push(parseNumericValue(f.value)); return `"${f.field}" < $${idx}`;
        case "<=":           params.push(parseNumericValue(f.value)); return `"${f.field}" <= $${idx}`;
        case "contains":     params.push(`%${f.value}%`);             return `"${f.field}"::text ILIKE $${idx}`;
        case "not_contains": params.push(`%${f.value}%`);             return `"${f.field}"::text NOT ILIKE $${idx}`;
        default:             params.push(f.value);                    return `"${f.field}" = $${idx}`;
      }
    });
  return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
}

function buildMongoMatch(filters) {
  if (!filters?.length) return {};
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

function sqlAggExpr(agg, escapedField) {
  switch (agg) {
    case "sum":        return `SUM(${escapedField})`;
    case "count":     return `COUNT(${escapedField})`;
    case "avg": case "average": return `AVG(${escapedField})`;
    case "min":         return `MIN(${escapedField})`;
    case "max":       return `MAX(${escapedField})`;
    default:         return `SUM(${escapedField})`;
  }
}

function mongoAccumulator(agg, field) {
  switch (agg) {
    case "sum":              return { $sum: `$${field}` };
    case "count":            return { $sum: 1 };
    case "avg": case "average": return { $avg: `$${field}` };
    case "min":              return { $min: `$${field}` };
    case "max":              return { $max: `$${field}` };
    default:                 return { $sum: `$${field}` };
  }
}
function applyRowSelection(rows, rowLimit, rowSelection, sortBy) {
  if (!rowLimit) return rows;
  const n = Number(rowLimit);
  if (rowSelection === "tail") return rows.slice(-n);
  return rows.slice(0, n); // head / all
}

export async function fetchAggregatedData(dbType, credentials, tableName, config) {
  const xField      = (config.xAxis || [])[0];
  const yFields     = config.yAxis || [];
  const filters     = config.filters || [];
  const sortBy      = config.sortBy?.field ? config.sortBy : null;
  const rowLimit    = config.rowLimit ? Number(config.rowLimit) : null;
  const rowSelection = config.rowSelection || "all";
  const agg          = (config.aggregation || "sum").trim().toLowerCase();

  if (!xField) throw new Error("xAxis[0] is required for aggregation");

  // MySQL 
  if (dbType === "mysql") {
    const conn = await mysql.createConnection({
      host:     credentials.host,
      port:     credentials.port || 3306,
      user:     credentials.user,
      password: credentials.password,
      database: credentials.database,
    });

    try {
      const params = [];
      const where  = buildMySQLWhere(filters, params);
      console.log("where->>>>>>>>",where,params);
        
      const selectParts = [
        `\`${xField}\` AS label`,
        ...yFields.map((y) => `${sqlAggExpr(agg, `\`${y}\``)} AS \`${y}\``),
      ].join(", ");
   
      console.log("selectParts->>>>>>",selectParts);

      const groupBy = `GROUP BY \`${xField}\``;

      // For tail without sortBy we fetch all and slice in JS
      const isTail = rowSelection === "tail";
      let orderClause = "";
      let limitClause = "";
      if (sortBy) {
        const dir = isTail
          ? (sortBy.order === "desc" ? "ASC" : "DESC")
          : (sortBy.order === "desc" ? "DESC" : "ASC");
        orderClause = `ORDER BY \`${sortBy.field}\` ${dir}`;
        if (rowLimit) limitClause = `LIMIT ${rowLimit}`;
      } else if (!isTail && rowLimit) {
        limitClause = `LIMIT ${rowLimit}`;
      }

      const sql = `SELECT ${selectParts} FROM \`${tableName}\` ${where} ${groupBy} ${orderClause} ${limitClause}`.trim();
      console.log("[dbAggSvc/mysql]", sql, params);

      const [rows] = await conn.execute(sql, params);
      console.log("rows----------->",rows[0]);
      let result = rows.map((r) => {
        const entry = { label: r.label };
        yFields.forEach((y) => { entry[y] = Number(r[y]) || 0; });
        return entry;
      });
      console.log("result->>>>>>>",result[0]);

      if (isTail && sortBy) result = result.reverse();
      if (isTail && !sortBy) result = applyRowSelection(result, rowLimit, "tail");
      return result;
    } finally {
      await conn.end();
    }
  }

  // PostgreSQL 
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
      const params = [];
      const where  = buildPostgresWhere(filters, params);

      const selectParts = [
        `"${xField}" AS label`,
        ...yFields.map((y) => `${sqlAggExpr(agg, `"${y}"`)} AS "${y}"`),
      ].join(", ");

      const groupBy = `GROUP BY "${xField}"`;
      const isTail  = rowSelection === "tail";
      let orderClause = "";
      let limitClause = "";
      if (sortBy) {
        const dir = isTail
          ? (sortBy.order === "desc" ? "ASC" : "DESC")
          : (sortBy.order === "desc" ? "DESC" : "ASC");
        orderClause = `ORDER BY "${sortBy.field}" ${dir}`;
        if (rowLimit) limitClause = `LIMIT ${rowLimit}`;
      } else if (!isTail && rowLimit) {
        limitClause = `LIMIT ${rowLimit}`;
      }

      const sql = `SELECT ${selectParts} FROM "${tableName}" ${where} ${groupBy} ${orderClause} ${limitClause}`.trim();
      console.log("[dbAggSvc/pg]", sql, params);

      const result = await client.query(sql, params);
      let rows = result.rows.map((r) => {
        const entry = { label: r.label };
        yFields.forEach((y) => { entry[y] = Number(r[y]) || 0; });
        return entry;
      });

      if (isTail && sortBy) rows = rows.reverse();
      if (isTail && !sortBy) rows = applyRowSelection(rows, rowLimit, "tail");
      return rows;
    } finally {
      await client.end();
    }
  }

  //  MongoDB 
  if (dbType === "mongodb") {
    const uri  = credentials.uri || `mongodb://${credentials.host}:${credentials.port || 27017}/${credentials.database}`;
    const conn = await mongoose.createConnection(uri).asPromise();

    try {
      const matchStage = buildMongoMatch(filters);

      // Build $group stage
      const groupStage = { _id: `$${xField}` };
      yFields.forEach((y) => { groupStage[y] = mongoAccumulator(agg, y); });


      const isTail = rowSelection === "tail";
      const sortField = sortBy
        ? (sortBy.field === xField ? "_id" : sortBy.field)
        : "_id";
      const sortDir = sortBy
        ? (isTail
            ? (sortBy.order === "desc" ? 1 : -1)
            : (sortBy.order === "desc" ? -1 : 1))
        : 1;

      const pipeline = [
        ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
        { $group: groupStage },
        { $sort: { [sortField]: sortDir } },
        ...(rowLimit && (!isTail || sortBy) ? [{ $limit: rowLimit }] : []),
      ];

      console.log("[dbAggSvc/mongo] pipeline:", JSON.stringify(pipeline));
      const docs = await conn.db.collection(tableName).aggregate(pipeline).toArray();

      let result = docs.map((d) => {
        const entry = { label: d._id };
        yFields.forEach((y) => { entry[y] = Number(d[y]) || 0; });
        return entry;
      });

      if (isTail && sortBy) result = result.reverse();
      if (isTail && !sortBy) result = applyRowSelection(result, rowLimit, "tail");
      return result;
    } finally {
      await conn.close();
    }
  }

  // API (client side fallback  cannot push down)
  if (dbType === "api") {
    const { uri, method = "GET", headers = {} } = credentials;
    const response = await fetch(uri, { method, headers });
    const data     = await response.json();
    let rows       = Array.isArray(data) ? data : data.data || [data];

    // Apply filters in JS
    if (filters.length) {
      rows = rows.filter((row) =>
        filters.every((f) => {
          const cv = row[f.field];
          const fv = parseNumericValue(f.value);
          switch (f.operator) {
            case "=":            return cv == fv;
            case "!=":           return cv != fv;
            case ">":            return Number(cv) > Number(fv);
            case ">=":           return Number(cv) >= Number(fv);
            case "<":            return Number(cv) < Number(fv);
            case "<=":           return Number(cv) <= Number(fv);
            case "contains":     return String(cv).toLowerCase().includes(String(f.value).toLowerCase());
            case "not_contains": return !String(cv).toLowerCase().includes(String(f.value).toLowerCase());
            default:             return true;
          }
        })
      );
    }

    // Aggregate in JS (only for API — unavoidable)
    const grouped   = {};
    const avgCounts = {};
    for (const row of rows) {
      const key = String(row[xField]);
      if (!grouped[key]) {
        grouped[key] = { label: key };
        avgCounts[key] = {};
        yFields.forEach((y) => { grouped[key][y] = 0; avgCounts[key][y] = 0; });
      }
      yFields.forEach((y) => {
        const val = Number(row[y]) || 0;
        switch (agg) {
          case "sum":              grouped[key][y] += val; break;
          case "count":            grouped[key][y] += 1; break;
          case "avg": case "average":
            grouped[key][y] += val;
            avgCounts[key][y]++;
            break;
          case "min":
            grouped[key][y] = grouped[key][y] === 0 ? val : Math.min(grouped[key][y], val); break;
          case "max":
            grouped[key][y] = Math.max(grouped[key][y], val); break;
          default: grouped[key][y] += val;
        }
      });
    }
    if (agg === "avg" || agg === "average") {
      for (const key in grouped)
        yFields.forEach((y) => { grouped[key][y] /= avgCounts[key][y] || 1; });
    }

    let result = Object.values(grouped);
    if (sortBy) {
      result.sort((a, b) => {
        const av = a[sortBy.field] ?? a.label;
        const bv = b[sortBy.field] ?? b.label;
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortBy.order === "desc" ? -cmp : cmp;
      });
    }
    return applyRowSelection(result, rowLimit, rowSelection);
  }

  throw new Error(`Unsupported database type: ${dbType}`);
}

export async function fetchRawColumn(dbType, credentials, tableName, field, options = {}) {
  const { filters = [], rowLimit = null } = options;
  const limit = rowLimit ? Number(rowLimit) : null;

  if (dbType === "mysql") {
    const conn = await mysql.createConnection({
      host: credentials.host, port: credentials.port || 3306,
      user: credentials.user, password: credentials.password, database: credentials.database,
    });
    try {
      const params = [];
      const where  = buildMySQLWhere(filters, params);
      const limitC = limit ? `LIMIT ${limit}` : "";
      const sql    = `SELECT \`${field}\` FROM \`${tableName}\` ${where} ${limitC}`.trim();
      const [rows] = await conn.execute(sql, params);
      return rows.map((r) => Number(r[field])).filter((v) => !isNaN(v) && isFinite(v));
    } finally { await conn.end(); }
  }

  if (dbType === "postgresql") {
    const client = new Client({
      host: credentials.host, port: credentials.port || 5432,
      user: credentials.user, password: credentials.password, database: credentials.database,
    });
    await client.connect();
    try {
      const params = [];
      const where  = buildPostgresWhere(filters, params);
      const limitC = limit ? `LIMIT ${limit}` : "";
      const sql    = `SELECT "${field}" FROM "${tableName}" ${where} ${limitC}`.trim();
      const result = await client.query(sql, params);
      return result.rows.map((r) => Number(r[field])).filter((v) => !isNaN(v) && isFinite(v));
    } finally { await client.end(); }
  }

  if (dbType === "mongodb") {
    const uri  = credentials.uri || `mongodb://${credentials.host}:${credentials.port || 27017}/${credentials.database}`;
    const conn = await mongoose.createConnection(uri).asPromise();
    try {
      const match  = buildMongoMatch(filters);
      let cursor   = conn.db.collection(tableName).find(match, { projection: { [field]: 1, _id: 0 } });
      if (limit) cursor = cursor.limit(limit);
      const docs = await cursor.toArray();
      return docs.map((d) => Number(d[field])).filter((v) => !isNaN(v) && isFinite(v));
    } finally { await conn.close(); }
  }

  if (dbType === "api") {
    const { uri, method = "GET", headers = {} } = credentials;
    const response = await fetch(uri, { method, headers });
    const data     = await response.json();
    let rows       = Array.isArray(data) ? data : data.data || [data];
    if (limit) rows = rows.slice(0, limit);
    return rows.map((r) => Number(r[field])).filter((v) => !isNaN(v) && isFinite(v));
  }

  throw new Error(`Unsupported database type: ${dbType}`);
}
import Graph from "../Models/Graph.js";
import Table from "../Models/Tables.js";
import DBConnection from "../Models/Database.js";
import { fetchAggregatedData, fetchRawColumn } from "../Services/dbAggregationSerivce.js";


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

    const queryOptions = {
      filters:      graph.filters      || [],
      rowLimit:     graph.rowLimit     || null,
      rowSelection: graph.rowSelection || "all",
      sortBy:       graph.sortBy?.field ? graph.sortBy : null,
      aggregation:  graph.aggregation  || "sum",
      xAxis:        graph.xAxis        || [],
      yAxis:        graph.yAxis        || [],
    };

    let chartData;

    if (isHistogram) {
      // Histogram: fetch only the single x-axis column (much lighter than all rows)
      const field  = (graph.xAxis || [])[0];
      if (!field) return res.status(400).json({ error: "xAxis[0] is required for histogram" });

      const values = await fetchRawColumn(
        connection.dbtype,
        connection.credentials,
        table.tableName,
        field,
        { filters: queryOptions.filters, rowLimit: queryOptions.rowLimit }
      );
      console.log("histogram,->>>>>>>>",values);
      chartData = buildHistogramData(values, field, graph.binCount);
    } else {
      // All other chart types: full DB-level aggregation
      const aggregated = await fetchAggregatedData(
        connection.dbtype,
        connection.credentials,
        table.tableName,
        queryOptions
      );
      // console.log("aggregated,->>>>>",aggregated);
      chartData = buildChartData(aggregated, graph.yAxis || []);
      // console.log("chartData->>>>",chartData);
    }

    res.json({ success: true, chartData });
  } catch (error) {
    next(error);
  }
};


export const getAllgraphs = async (req, res, next) => {
  try {
    const graphs = await Graph.find({ userId: req.body.userId }).sort({ createdAt: -1 });
    res.json({ success: true, graphs });
  } catch (error) {
    next(error);
  }
};


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


// Shapes already-aggregated rows into Chart.js dataset format
// aggregated rows: [{ label, y1: n, y2: n }]
function buildChartData(aggregated, yFields) {
  const labels   = aggregated.map((r) => r.label);
  const datasets = yFields.map((field) => ({
    label: field,
    data:  aggregated.map((r) => r[field] ?? 0),
  }));
  return { labels, datasets };
}

// Builds histogram bins from raw numeric values
function buildHistogramData(values, field, binCount) {
  if (values.length === 0) {
    return { 
      labels: [], 
      datasets: [
        { 
          label: `${field} (frequency)`, 
          data: [] 
        }] 
      };
  }
  
  const bins   = Math.min(Number(binCount) || 10, 50);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  
  if (minVal === maxVal) {
    return {
      labels:   [String(minVal)],
      datasets: [{ label: `${field} (frequency)`, data: [values.length] }],
    };
  }

  const binWidth  = (maxVal - minVal) / bins;
  const counts    = Array(bins).fill(0);

  values.forEach((v) => {
    let idx = Math.floor((v - minVal) / binWidth);
    if (idx >= bins) idx = bins - 1;
    counts[idx]++;
  });

  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const labels = counts.map((_, i) => {
    const lo = minVal + i * binWidth;
    const hi = minVal + (i + 1) * binWidth;
    return `${fmt(lo)}–${fmt(hi)}`;
  });

  return {
    labels,
    datasets: [{ label: `${field} (frequency)`, data: counts }],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG TRIMMER  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

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
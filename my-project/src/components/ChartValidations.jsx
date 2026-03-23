
export const CHART_RULES = {
  Bar: {
    label: "Bar Chart", icon: "📊",
    xAxis: { types: ["categorical"], min: 1, max: 1 },
    yAxis: { types: ["numerical"], min: 1, max: 3 },
    aggregationRequired: true,
    allowedAggregations: ["Sum", "Average", "Count", "Min", "Max"],
    hint: "Categorical X, numeric Y",
  },
  Line: {
    label: "Line Chart", icon: "📈",
    xAxis: { types: ["date", "numerical", "categorical"], min: 1, max: 1 },
    yAxis: { types: ["numerical"], min: 1, max: 5 },
    aggregationRequired: true,
    allowedAggregations: ["Sum", "Average", "Count", "Min", "Max"],
    hint: "Ordered X (date/numeric), numeric Y",
  },
  Pie: {
    label: "Pie Chart", icon: "🥧",
    xAxis: { types: ["categorical"], min: 1, max: 1 },
    yAxis: { types: ["numerical"], min: 1, max: 1 },
    aggregationRequired: true,
    allowedAggregations: ["Sum", "Count"],
    hint: "1 categorical + 1 numeric field",
  },
  Doughnut: {
    label: "Doughnut Chart", icon: "🍩",
    xAxis: { types: ["categorical"], min: 1, max: 1 },
    yAxis: { types: ["numerical"], min: 1, max: 1 },
    aggregationRequired: true,
    allowedAggregations: ["Sum", "Count"],
    hint: "1 categorical + 1 numeric field",
  },
  Scatter: {
    label: "Scatter Plot", icon: "🔵",
    xAxis: { types: ["numerical"], min: 1, max: 1 },
    yAxis: { types: ["numerical"], min: 1, max: 1 },
    aggregationRequired: false,
    allowedAggregations: [],
    hint: "Both axes must be numeric",
  },
  Histogram: {
    label: "Histogram", icon: "📉",
    xAxis: { types: ["numerical"], min: 1, max: 1 },
    yAxis: { types: [], min: 0, max: 0 },
    aggregationRequired: false,
    allowedAggregations: [],
    hint: "Single numeric field, no aggregation",
  },
  Area: {
    label: "Area Chart", icon: "🏔️",
    xAxis: { types: ["date", "numerical", "categorical"], min: 1, max: 1 },
    yAxis: { types: ["numerical"], min: 1, max: 5 },
    aggregationRequired: true,
    allowedAggregations: ["Sum", "Average", "Min", "Max"],
    hint: "Ordered X axis, numeric Y",
  },
  "Multi-series Bar": {
    label: "Multi-series Bar", icon: "📊",
    xAxis: { types: ["categorical"], min: 1, max: 1 },
    yAxis: { types: ["numerical"], min: 2, max: 5 },
    aggregationRequired: true,
    allowedAggregations: ["Sum", "Average", "Count", "Min", "Max"],
    hint: "Categorical X, 2–5 numeric Y fields",
  },
  "Stacked Bar": {
    label: "Stacked Bar", icon: "📊",
    xAxis: { types: ["categorical"], min: 1, max: 1 },
    yAxis: { types: ["numerical"], min: 2, max: 5 },
    aggregationRequired: true,
    allowedAggregations: ["Sum", "Count"],
    hint: "Categorical X, multiple numeric Y stacked",
  },
};

export const normalizeFieldType = (rawType = "") => {
  const t = rawType.toLowerCase();
  if (["int","integer","float","double","decimal","number","numeric","bigint"].includes(t)) return "numerical";
  if (["date","datetime","timestamp","time"].includes(t)) return "date";
  return "categorical";
};

export const validateChartConfig = ({ chartType, xFields = [], yFields = [], aggregation, tableSchema = [] }) => {
  const errors = [];
  const rule = CHART_RULES[chartType];
  if (!rule) return { valid: false, errors: [`Unknown chart type: "${chartType}"`] };

  const resolveType = (fieldName) => {
    const col = tableSchema.find((c) => c.name === fieldName);
    return col ? normalizeFieldType(col.type) : "categorical";
  };

  if (xFields.length < rule.xAxis.min) errors.push(`Requires at least ${rule.xAxis.min} X-axis field.`);
  if (xFields.length > rule.xAxis.max) errors.push(`Allows at most ${rule.xAxis.max} X-axis field(s).`);
  
  xFields.forEach((f) => {
    const ftype = resolveType(f);
    if (rule.xAxis.types.length && !rule.xAxis.types.includes(ftype))
      errors.push(`"${f}" (${ftype}) is not valid for X-axis. Needs: ${rule.xAxis.types.join(" or ")}.`);
  });

  if (chartType !== "Histogram") {
    if (yFields.length < rule.yAxis.min) errors.push(`Requires at least ${rule.yAxis.min} Y-axis field(s).`);
    if (yFields.length > rule.yAxis.max) errors.push(`Allows at most ${rule.yAxis.max} Y-axis field(s).`);
    yFields.forEach((f) => {
      const ftype = resolveType(f);
      if (rule.yAxis.types.length && !rule.yAxis.types.includes(ftype))
        errors.push(`"${f}" (${ftype}) is not valid for Y-axis. Needs: ${rule.yAxis.types.join(" or ")}.`);
    });
  }

  if (rule.aggregationRequired && (!aggregation?.type))
    errors.push("An aggregation function is required.");
  if (!rule.aggregationRequired && aggregation?.type)
    errors.push(`${rule.label} does not support aggregation.`);
  if (aggregation?.type && rule.allowedAggregations.length && !rule.allowedAggregations.includes(aggregation.type))
    errors.push(`"${aggregation.type}" is not allowed. Use: ${rule.allowedAggregations.join(", ")}.`);

  const dupes = [...xFields, ...yFields].filter((f, i, a) => a.indexOf(f) !== i);
  if (dupes.length) errors.push(`Duplicate fields: ${[...new Set(dupes)].join(", ")}`);
  return { valid: errors.length === 0, errors };
};

export const getFieldsForAxis = (chartType, axis, tableSchema = []) => {
  const rule = CHART_RULES[chartType];
  if (!rule) return tableSchema;
  const allowed = axis === "x" ? rule.xAxis.types : rule.yAxis.types;
  if (!allowed.length) return [];
  return tableSchema.filter((col) => allowed.includes(normalizeFieldType(col.type)));
};




export const isFieldAllowedForAxis = (chartType, axis, fieldType) => {
  const rule = CHART_RULES[chartType];
  if (!rule) return false;
  const allowed = axis === "x" ? rule.xAxis.types : rule.yAxis.types;
  return !allowed.length || allowed.includes(normalizeFieldType(fieldType));
};
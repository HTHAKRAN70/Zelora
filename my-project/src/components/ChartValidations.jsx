
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
 
};


import { useState, useMemo, useEffect } from "react";
import { getSuggestedGraphTypes, FIELD_TYPES } from "../utils/fieldTypeMapper.js";


const CHART_AGGREGATIONS = {
  "Bar Chart": ["Count", "Sum", "Average", "Min", "Max"],
  "Pie Chart": ["Count", "Sum", "Average", "Percentage"],
  "Donut Chart": ["Count", "Sum", "Average", "Percentage"],
  "Line Chart": ["Sum", "Average", "Count", "Min", "Max"],
  "Area Chart": ["Sum", "Average", "Count"],
  "Scatter Plot": ["Count", "Sum", "Average"],
  "Histogram": ["Count", "Average", "Min", "Max"],
  "Box Plot": ["Min", "Max", "Average", "Median", "Std Dev"],
  "Count Plot": ["Count", "Distinct Count"],
  "Timeline": ["Count", "Min", "Max"],
  "Word Cloud": ["Count", "Distinct Count"],
  "Tag Cloud": ["Count", "Distinct Count"],
  "Map": ["Count"],
  "Geo Chart": ["Count", "Average", "Sum"],
};

// Charts that allow only a single aggregation function (parts-of-whole visualizations)
const SINGLE_AGG_CHARTS = ["Pie Chart", "Donut Chart", "Word Cloud", "Tag Cloud", "Map"];

// Charts that allow multiple aggregation functions
const MULTI_AGG_CHARTS = ["Bar Chart", "Line Chart", "Area Chart", "Scatter Plot", "Histogram", "Box Plot", "Timeline", "Geo Chart", "Count Plot"];

const ALL_AGGREGATIONS = [
  { name: "Sum", description: "Total of all values" },
  { name: "Average", description: "Mean of all values" },
  { name: "Count", description: "Number of records" },
  { name: "Min", description: "Minimum value" },
  { name: "Max", description: "Maximum value" },
  { name: "Median", description: "Middle value" },
  { name: "Std Dev", description: "Standard deviation" },
  { name: "Distinct Count", description: "Unique values" },
  { name: "Percentage", description: "Percentage of total" },
  { name: "Mode", description: "Most frequent value" },
];

export default function ChartSuggestions({ fieldTypes = {}, onChartChange = () => {} }) {
  const [selectedChart, setSelectedChart] = useState(null);
  // memoize derived arrays so effects don't run every render
  const fieldNames = useMemo(() => Object.keys(fieldTypes), [fieldTypes]);

  useEffect(() => {
    if (fieldNames.length === 0) {
      setSelectedChart(null);
    }
  }, [fieldNames]);

  useEffect(() => {
    try {
      onChartChange(selectedChart);
    } catch (e) {
      // ignore if parent callback throws
    }
  }, [selectedChart, onChartChange]);

  // Get suggested charts based on all fields
  const suggestedCharts = useMemo(() => {
    if (fieldNames.length === 0) return [];

    const uniqueCharts = new Set();
    fieldNames.forEach((fieldName) => {
      const fieldType = fieldTypes[fieldName];
      const charts = getSuggestedGraphTypes(fieldType);
      charts.forEach((chart) => uniqueCharts.add(chart));
    });

    return Array.from(uniqueCharts).sort();
  }, [fieldNames, fieldTypes]);

  // available numeric fields to drive aggregation
  const numericFields = useMemo(
    () =>
      fieldNames.filter(
        (f) =>
          fieldTypes[f] === FIELD_TYPES?.NUMERICAL || fieldTypes[f] === "Numerical"
      ),
    [fieldNames, fieldTypes]
  );

  const requiresNumeric = (aggName) => {
    return [
      "Sum",
      "Average",
      "Min",
      "Max",
      "Median",
      "Std Dev",
      "Percentage",
    ].includes(aggName);
  };

  // user-selected aggregations along with chosen field (if required)
  const [selectedAggs, setSelectedAggs] = useState([]);

  // drop any pending agg selections if the numeric field used disappears
  useEffect(() => {
    setSelectedAggs((prev) => {
      const filtered = prev.filter(
        (a) => !requiresNumeric(a.name) || numericFields.includes(a.field)
      );
      // only update if actual change occurred to avoid endless re-renders
      if (filtered.length === prev.length && filtered.every((v, i) => v === prev[i])) {
        return prev;
      }
      return filtered;
    });
  }, [numericFields]);

  // when chart changes start fresh
  useEffect(() => {
    setSelectedAggs([]);
  }, [selectedChart]);

  // Get aggregations for selected chart
  const applicableAggregations = useMemo(() => {
    if (!selectedChart) return [];
    const aggNames = CHART_AGGREGATIONS[selectedChart] || [];
    return ALL_AGGREGATIONS.filter((agg) => aggNames.includes(agg.name));
  }, [selectedChart]);


  // Check if current chart allows only single aggregation
  const allowsSingleAggOnly = SINGLE_AGG_CHARTS.includes(selectedChart);

  const toggleAggregation = (aggName) => {
    setSelectedAggs((prev) => {
      const exists = prev.find((a) => a.name === aggName);
      if (exists) {
        // Removing an aggregation is always allowed
        return prev.filter((a) => a.name !== aggName);
      } else {
        // Adding a new aggregation
        if (allowsSingleAggOnly) {
          // For single-agg charts, replace any existing aggregation
          return [{ name: aggName, field: numericFields[0] || "" }];
        } else {
          // For multi-agg charts, add to the list
          return [...prev, { name: aggName, field: numericFields[0] || "" }];
        }
      }
    });
  };

  const updateAggField = (aggName, field) => {
    setSelectedAggs((prev) =>
      prev.map((a) => (a.name === aggName ? { ...a, field } : a))
    );
  };

  return (
    <div className="space-y-3">
      {/* Suggested Charts Section */}
      <div>
        <h5 className="text-xs font-bold text-slate-900 mb-2.5 uppercase tracking-wide">Chart Type</h5>
        {suggestedCharts.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {suggestedCharts.map((chart) => (
              <button
                key={chart}
                onClick={() => setSelectedChart(selectedChart === chart ? null : chart)}
                className={`px-2.5 py-1.5 rounded text-xs font-bold transition transform hover:scale-105 ${
                  selectedChart === chart
                    ? "bg-indigo-600 text-white border-2 border-indigo-700 shadow-lg"
                    : "bg-white text-slate-700 border-2 border-slate-300 hover:border-indigo-400 hover:shadow-md"
                }`}
              >
                {chart}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-600 italic">No charts available</p>
        )}
      </div>

      {/* Aggregation Functions Section */}
      {selectedChart && fieldNames.length > 0 && applicableAggregations.length > 0 && (
        <div className="border-t-2 border-slate-300 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wide">⚙️ Aggregations</h5>
            {allowsSingleAggOnly && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-semibold">Single only</span>
            )}
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto bg-white p-2 rounded border border-slate-200">
            {applicableAggregations.map((agg) => {
              const checked = selectedAggs.some((a) => a.name === agg.name);
              const needsField = requiresNumeric(agg.name);
              const selectedObj = selectedAggs.find((a) => a.name === agg.name) || {};
              return (
                <div key={agg.name} className="flex flex-col">
                  <label
                    className={`flex items-center gap-2 p-2 rounded text-xs transition ${
                      !checked && allowsSingleAggOnly && selectedAggs.length > 0
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-indigo-50 cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={needsField && numericFields.length === 0 || (!checked && allowsSingleAggOnly && selectedAggs.length > 0)}
                      onChange={() => toggleAggregation(agg.name)}
                      className="mt-0.5 rounded accent-indigo-600 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{agg.name}</div>
                      <div className="text-slate-600 text-xs">{agg.description}</div>
                    </div>
                  </label>
                  {needsField && checked && (
                    <select
                      value={selectedObj.field || ""}
                      onChange={(e) => updateAggField(agg.name, e.target.value)}
                      className="ml-8 mt-1 w-40 text-xs px-2 py-1 border border-slate-300 rounded"
                    >
                      <option value="" disabled>Select field</option>
                      {numericFields.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

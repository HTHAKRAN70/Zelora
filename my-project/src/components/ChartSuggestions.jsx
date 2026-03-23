import { useState, useMemo, useEffect } from "react";
import { getSuggestedGraphTypes, FIELD_TYPES } from "../utils/fieldTypeMapper.js";4
import {setChartType} from "../store/graphSlice.js";
import { useDispatch,useSelector } from "react-redux";
const CHART_AGGREGATIONS = {
  "Bar ": ["Count", "Sum", "Average", "Min", "Max"],
  "Pie ": ["Count", "Sum", "Average", "Percentage"],
  "Donut ": ["Count", "Sum", "Average", "Percentage"],
  "Line": ["Sum", "Average", "Count", "Min", "Max"],
  "Area": ["Sum", "Average", "Count"],
  "Scatter": ["Count", "Sum", "Average"],
  "Histogram": ["Count", "Average", "Min", "Max"],
  "Box": ["Min", "Max", "Average", "Median", "Std Dev"],
  "Count": ["Count", "Distinct Count"],
  "Timeline": ["Count", "Min", "Max"],
  "Word": ["Count", "Distinct Count"],
  "Tag": ["Count", "Distinct Count"],
  "Map": ["Count"],
  "Geo Chart": ["Count", "Average", "Sum"],
};
const allCharts = Object.keys(CHART_AGGREGATIONS);

const SINGLE_AGG_CHARTS = ["Pie ", "Donut ", "Word ", "Tag ", "Map"];

// Charts that allow multiple aggregation functions
const MULTI_AGG_CHARTS = ["Bar ", "Line", "Area", "Scatter", "Histogram", "Box", "Timeline", "Geo Chart", "Count"];

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
const dispatch = useDispatch();
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
  const { currentSelectedChartType } = useSelector((state) => state.graph); 
  useEffect(() => {
    // console.log("ChartSuggestions - currentSelectedChartType from Redux:", currentSelectedChartType);
    setSelectedChart(currentSelectedChartType);
  }, [currentSelectedChartType]);
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

  const [selectedAggs, setSelectedAggs] = useState([]);

  useEffect(() => {
    setSelectedAggs((prev) => {
      const filtered = prev.filter(
        (a) => !requiresNumeric(a.name) || numericFields.includes(a.field)
      );
      if (filtered.length === prev.length && filtered.every((v, i) => v === prev[i])) {
        return prev;
      }
      return filtered;
    });
  }, [numericFields]);


  useEffect(() => {
    setSelectedAggs([]);
  }, [selectedChart]);

  
  const applicableAggregations = useMemo(() => {
    if (!selectedChart) return [];
    const aggNames = CHART_AGGREGATIONS[selectedChart] || [];
    return ALL_AGGREGATIONS.filter((agg) => aggNames.includes(agg.name));
  }, [selectedChart]);


  const allowsSingleAggOnly = SINGLE_AGG_CHARTS.includes(selectedChart);

  const toggleAggregation = (aggName) => {
    setSelectedAggs((prev) => {
      const exists = prev.find((a) => a.name === aggName);
      if (exists) {
        return prev.filter((a) => a.name !== aggName);
      } else {
        if (allowsSingleAggOnly) {
          return [{ name: aggName, field: numericFields[0] || "" }];
        } else {
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

  const handlechartClick = (chart) => {;
    if (selectedChart === chart) {
      dispatch(setChartType(null));
    } else {
      dispatch(setChartType(chart));
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h5 className="text-xs font-bold text-slate-900 mb-2.5 uppercase tracking-wide">Chart Type</h5>
        {allCharts.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {allCharts.map((chart) => (
              <button
                key={chart}
                onClick={() => handlechartClick(chart)}
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

      
    </div>
  );
}

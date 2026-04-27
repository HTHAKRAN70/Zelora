import { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  fetchImportedTables, fetchTableData, fetchTableRows,
  updateTableName, setSelectedTable, resetTableRows, deleteTable,
} from "../store/dbSlice.js";
import {
  settableSelected, setFieldTypes, updateFieldType,
  removeField, addField, addnewGraph, saveGraph,
} from "../store/graphSlice.js";
import { mapFieldsWithTypes, FIELD_TYPES } from "../utils/fieldTypeMapper.js";
import ChartSuggestions from "../components/ChartSuggestions.jsx";
import DataFilters from "../components/DataFilters.jsx";
import { CHART_RULES } from "../components/ChartValidations.jsx";

export default function Tables() {
  const dispatch = useDispatch();
  const { importedTables, selectedTable, tableRows, tablePagination, loading } =
    useSelector((state) => state.db);
  const { CurrentSelectedTable, currentSelectedChartType, fieldTypes } =
    useSelector((state) => state.graph);
  const { user } = useSelector((state) => state.auth);

  const [viewMode,         setViewMode]         = useState("list");
  const [selectedforgraph, setselectedforgraph] = useState(false);
  const [showGraphPopup,   setShowGraphPopup]   = useState(false);

  const [chartSelected, setChartSelected] = useState(null);
  const [xAxis,         setXAxis]         = useState([]);
  const [yAxis,         setYAxis]         = useState([]);
  const [xLabel,        setXLabel]        = useState("");
  const [yLabel,        setYLabel]        = useState("");
  const [aggregation,   setAggregation]   = useState("sum");

  const [filters,      setFilters]      = useState([]);
  const [rowLimit,     setRowLimit]     = useState(null);
  const [rowSelection, setRowSelection] = useState("all");
  const [sortConfig,   setSortConfig]   = useState({ field: "", order: "asc" });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const tableBodyRef = useRef(null);
  const pageSize     = 10;

  const chartKey     = currentSelectedChartType?.trim();
  const currentRules =
    Object.entries(CHART_RULES).find(
      ([key]) => key.toLowerCase() === chartKey?.toLowerCase()
    )?.[1] || {};

  const xRule               = currentRules?.xAxis           || {};
  const yRule               = currentRules?.yAxis           || {};
  const maxX                = xRule.max                     ?? 1;
  const minX                = xRule.min                     ?? 1;
  const maxY                = yRule.max                     ?? 1;
  const allowedAggregations = currentRules?.allowedAggregations || [];
  const isHistogramSelected = chartKey?.toLowerCase() === "histogram";

  const availableFields =
    CurrentSelectedTable?.selectedFields?.length > 0
      ? CurrentSelectedTable.selectedFields
      : Object.keys(tableRows[0] || {});

  const getFieldsForAxis = (axis) => {
    const rule = axis === "x" ? xRule : yRule;
    if (!rule?.types || !Array.isArray(rule.types)) return [];
    const alreadySelected = axis === "x" ? xAxis : yAxis;
    return availableFields.filter((field) => {
      if (alreadySelected.includes(field)) return false;
      const matchedKey = Object.keys(fieldTypes).find(
        (k) => k.toLowerCase() === field.trim().toLowerCase()
      );
      const type = matchedKey ? fieldTypes[matchedKey] : undefined;
      if (!type) return false;
      return rule.types.map((t) => t.toLowerCase()).includes(type.toLowerCase());
    });
  };

  // ── Axis helpers ────────────────────────────────────────────────────────────
  const addXField    = (f) => {
    if (!f || xAxis.length >= maxX || xAxis.includes(f)) return;
    setXAxis([...xAxis, f]);
  };
  const removeXField = (f) => setXAxis(xAxis.filter((x) => x !== f));
  const addYField    = (f) => {
    if (!f || yAxis.length >= maxY || yAxis.includes(f)) return;
    setYAxis([...yAxis, f]);
  };
  const removeYField = (f) => setYAxis(yAxis.filter((y) => y !== f));

  // ── Reset popup state ───────────────────────────────────────────────────────
  const resetPopupState = useCallback(() => {
    setChartSelected(null);
    setXAxis([]);
    setYAxis([]);
    setXLabel("");
    setYLabel("");
    setAggregation("sum");
    setFilters([]);
    setRowLimit(null);
    setRowSelection("all");
    setSortConfig({ field: "", order: "asc" });
    setShowAdvanced(false);
  }, []);

  // ── Chart compatibility check ───────────────────────────────────────────────
  const checkChartCompatibility = (ft, chart) => {
    if (!chart) return false;
    const types          = Object.values(ft);
    const hasNumeric     = types.includes(FIELD_TYPES.NUMERICAL);
    const hasCategorical = types.includes(FIELD_TYPES.CATEGORICAL);
    switch (chart?.trim()) {
      case "Pie":
      case "Doughnut":  return hasCategorical;
      case "Bar":       return hasCategorical && hasNumeric;
      case "Line":
      case "Area":
      case "Scatter":
      case "Histogram": return hasNumeric;
      default:          return true;
    }
  };

  // Histogram only needs xAxis; all others need both (unless maxY is 0)
  const axesValid = isHistogramSelected
    ? xAxis.length >= minX
    : xAxis.length >= minX && (maxY === 0 || yAxis.length > 0);

  const chartValid =
    Object.keys(fieldTypes).length > 0 &&
    !!chartSelected &&
    checkChartCompatibility(fieldTypes, chartSelected) &&
    axesValid;

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = showGraphPopup ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [showGraphPopup]);

  useEffect(() => {
    dispatch(fetchImportedTables());
  }, [dispatch]);

  useEffect(() => {
    if (CurrentSelectedTable?.selectedFields) {
      const mappedFields  = mapFieldsWithTypes(
        CurrentSelectedTable.selectedFields,
        tableRows
      );
      const fieldTypesObj = {};
      mappedFields.forEach(({ fieldName, type }) => {
        fieldTypesObj[fieldName] = type;
      });
      dispatch(setFieldTypes(fieldTypesObj));
    }
  }, [CurrentSelectedTable, tableRows, dispatch]);

  useEffect(() => {
    const handleScroll = () => {
      if (!tableBodyRef.current || loading || !tablePagination.hasMore) return;
      const el = tableBodyRef.current;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
        dispatch(fetchTableRows({
          tableId:  selectedTable._id,
          page:     tablePagination.page + 1,
          pageSize,
        }));
      }
    };
    const el = tableBodyRef.current;
    if (el && viewMode === "detail") {
      el.addEventListener("scroll", handleScroll);
      return () => el.removeEventListener("scroll", handleScroll);
    }
  }, [dispatch, selectedTable, tablePagination, loading, viewMode]);

  // When chart switches to histogram clear any y-axis selection
  useEffect(() => {
    if (isHistogramSelected) setYAxis([]);
  }, [isHistogramSelected]);

  // When chart changes reset both axes (rules may have changed)
  useEffect(() => {
    setXAxis([]);
    setYAxis([]);
  }, [currentSelectedChartType]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleGraphClick = (table) => {
    resetPopupState();
    dispatch(resetTableRows());
    dispatch(settableSelected(table));
    setShowGraphPopup(true);
    dispatch(fetchTableRows({ tableId: table._id, page: 1, pageSize: 50 }));
  };

  const handleTableClick = async (table) => {
    try {
      await dispatch(fetchTableData(table._id)).unwrap();
      await dispatch(fetchTableRows({ tableId: table._id, page: 1, pageSize: 10 })).unwrap();
      setViewMode("detail");
    } catch {
      toast.error("Failed to load table data");
    }
  };

  const handleNameUpdate = async (tableId, newName) => {
    try {
      await dispatch(updateTableName({ tableId, displayName: newName })).unwrap();
      toast.success("Table name updated");
      dispatch(fetchImportedTables());
    } catch {
      toast.error("Failed to update name");
    }
  };

  const handleDeleteTable = async (tableId) => {
    try {
      await dispatch(deleteTable(tableId));
      dispatch(fetchImportedTables());
    } catch (e) {
      console.error(e);
    }
  };

  const handleClosePopup = () => {
    setShowGraphPopup(false);
    setselectedforgraph(false);
    resetPopupState();
  };

  const handleSaveGraph = () => {
    const payload = {
      userId:       user._id,
      tableId:      CurrentSelectedTable?._id,
      xAxis,
      yAxis:        isHistogramSelected ? [] : yAxis,
      xLabel,
      yLabel,
      aggregation,
      fields:       Object.keys(fieldTypes),
      chart:        chartSelected,
      filters:      filters.length > 0 ? filters : [],
      rowLimit:     rowLimit  || null,
      rowSelection: rowSelection || "all",
      sortBy:       sortConfig?.field
        ? { field: sortConfig.field, order: sortConfig.order || "asc" }
        : null,
    };
    dispatch(saveGraph(payload));
    toast.success("Graph configuration saved");
    setShowGraphPopup(false);
    setselectedforgraph(false);
    resetPopupState();
  };

  // ── Detail view ──────────────────────────────────────────────────────────────
  const renderTableData = () => {
    if (!tableRows || tableRows.length === 0) {
      return (
        <div className="text-center py-12 text-slate-500">
          {loading ? "Loading data..." : "No data available"}
        </div>
      );
    }
    const columns =
      selectedTable.selectedFields?.length > 0
        ? selectedTable.selectedFields
        : Object.keys(tableRows[0] || {});
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase border-b border-slate-200">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {tableRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-3 text-sm text-slate-700 border-b border-slate-100">
                    {row[col] !== null && row[col] !== undefined
                      ? typeof row[col] === "object" ? JSON.stringify(row[col]) : String(row[col])
                      : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (viewMode === "detail" && selectedTable) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {selectedTable.displayName || selectedTable.tableName}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {selectedTable.totalRowCount || 0} rows × {selectedTable.columnCount || 0} columns
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setViewMode("list"); dispatch(setSelectedTable(null)); }}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            ← Back to List
          </button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div ref={tableBodyRef} className="overflow-x-auto max-h-[calc(100vh-300px)]">
            {renderTableData()}
          </div>
        </div>
      </div>
    );
  }

  // ── List page ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-2">

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Imported Tables</h1>
          <p className="text-slate-600">View and manage your imported database tables.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setselectedforgraph((prev) => !prev);
              if (selectedforgraph) {
                setShowGraphPopup(false);
                dispatch(settableSelected(null));
              }
            }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              selectedforgraph
                ? "bg-gray-600 text-white"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {selectedforgraph ? "✕ Cancel" : "Make Graph 📈"}
          </button>
          {selectedforgraph && (
            <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
              📊 Graph mode — click any table row to configure a chart
            </div>
          )}
        </div>
      </div>

      {/* Tables list */}
      {importedTables.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <p className="text-slate-500">No tables imported yet. Go to Databases to import tables.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={selectedforgraph ? "bg-gray-800" : "bg-slate-100"}>
                <tr>
                  {["Table Name","Connection","Database Type","Rows","Columns","Actions"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={selectedforgraph ? "bg-gray-50 divide-y divide-gray-200" : "divide-y divide-slate-200"}>
                {importedTables.map((table) => (
                  <tr
                    key={table._id}
                    className={`cursor-pointer transition ${
                      selectedforgraph ? "hover:bg-indigo-50 hover:shadow-sm" : "hover:bg-slate-50"
                    }`}
                    onClick={() => selectedforgraph ? handleGraphClick(table) : handleTableClick(table)}
                  >
                    <td className="px-6 py-4">
                      {table.displayName ? (
                        <span className="text-slate-900 font-medium">{table.displayName}</span>
                      ) : (
                        <input
                          type="text"
                          placeholder="Enter table name"
                          defaultValue={table.tableName}
                          className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => { if (e.target.value.trim()) handleNameUpdate(table._id, e.target.value.trim()); }}
                          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{table.connectionId?.connectionName || "—"}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm">
                        {(table.databaseType === "mongodb"    || table.databaseType === "MongoDB")    && "🍃"}
                        {(table.databaseType === "mysql"      || table.databaseType === "MySQL")      && "🐬"}
                        {(table.databaseType === "postgresql" || table.databaseType === "PostgreSQL") && "🐘"}
                        {(table.databaseType === "api"        || table.databaseType === "API")        && "🔗"}
                        {table.databaseType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{table.totalRowCount || 0}</td>
                    <td className="px-6 py-4 text-slate-600">{table.columnCount   || 0}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteTable(table._id); }}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-700 transition"
                      >
                        Disconnect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Graph configuration popup */}
      {showGraphPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-hidden p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col border border-slate-200">

            {/* Popup header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  📊 {CurrentSelectedTable?.displayName || CurrentSelectedTable?.tableName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {CurrentSelectedTable?.databaseType}
                  {" · "}{CurrentSelectedTable?.totalRowCount || 0} rows
                  {" · "}{CurrentSelectedTable?.columnCount || 0} columns
                </p>
              </div>
              <button
                type="button"
                onClick={handleClosePopup}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm transition"
              >
                ✕ Close
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Row 1: Chart Type + Configuration */}
              <div className="grid grid-cols-2 gap-4">

                {/* Chart type selector */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-3">Chart Type</h3>
                  <ChartSuggestions
                    fieldTypes={fieldTypes}
                    onChartChange={(chart) => setChartSelected(chart)}
                  />
                  {chartSelected && (
                    <p className="mt-3 text-xs text-green-600 font-semibold">
                      ✓ Selected: {chartSelected}
                    </p>
                  )}
                </div>

                {/* Chart configuration */}
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4">⚙ Chart Configuration</h3>

                  {!currentSelectedChartType ? (
                    <p className="text-sm text-slate-400 italic">Select a chart type first</p>
                  ) : (
                    <div className="space-y-4">

                      {/* ── X Axis ── */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            X Axis
                          </label>
                          {/* capacity pill */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            xAxis.length >= maxX
                              ? "bg-amber-50 text-amber-600 border-amber-200"
                              : xAxis.length >= minX
                              ? "bg-green-50 text-green-600 border-green-200"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}>
                            {xAxis.length} / {maxX} field{maxX !== 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Multi-X hint when chart supports it */}
                        {maxX > 1 && (
                          <p className="text-[11px] text-slate-400 mb-1.5 italic">
                            Multiple fields are combined as a single label
                            {" ("}e.g. <span className="font-mono">year_month</span>
                            {")"}
                          </p>
                        )}

                        {/* Histogram hint */}
                        {isHistogramSelected && (
                          <p className="text-[11px] text-slate-400 mb-1.5 italic">
                            Choose the numeric field to bin into frequency buckets
                          </p>
                        )}

                        <select
                          disabled={xAxis.length >= maxX}
                          onChange={(e) => { addXField(e.target.value); e.target.value = ""; }}
                          className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm
                                     focus:outline-none focus:ring-2 focus:ring-indigo-300
                                     disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <option value="">
                            {xAxis.length >= maxX ? "Limit reached" : "Select field…"}
                          </option>
                          {getFieldsForAxis("x").map((f) => (
                            <option key={f}>{f}</option>
                          ))}
                        </select>

                        {/* Selected X fields */}
                        {xAxis.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {xAxis.map((f, idx) => (
                              <span
                                key={f}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-mono cursor-pointer hover:bg-blue-200 transition"
                                onClick={() => removeXField(f)}
                              >
                                {/* order badge when multiple */}
                                {maxX > 1 && (
                                  <span className="text-[9px] font-bold text-blue-400 bg-blue-200 rounded px-1">
                                    {idx + 1}
                                  </span>
                                )}
                                {f}
                                <span className="text-blue-400 hover:text-blue-600 font-bold">✕</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Preview of combined label when multiple selected */}
                        {maxX > 1 && xAxis.length > 1 && (
                          <p className="text-[11px] text-indigo-500 mt-1.5 font-mono bg-indigo-50 px-2 py-1 rounded">
                            Preview label: <strong>{xAxis.join("_")}</strong>
                          </p>
                        )}
                      </div>

                      {/* ── Y Axis — hidden for Histogram ── */}
                      {maxY > 0 ? (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                              Y Axis
                            </label>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              yAxis.length >= maxY
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : yAxis.length > 0
                                ? "bg-green-50 text-green-600 border-green-200"
                                : "bg-slate-50 text-slate-500 border-slate-200"
                            }`}>
                              {yAxis.length} / {maxY} field{maxY !== 1 ? "s" : ""}
                            </span>
                          </div>

                          <select
                            disabled={yAxis.length >= maxY}
                            onChange={(e) => { addYField(e.target.value); e.target.value = ""; }}
                            className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm
                                       focus:outline-none focus:ring-2 focus:ring-indigo-300
                                       disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <option value="">
                              {yAxis.length >= maxY ? "Limit reached" : "Select field…"}
                            </option>
                            {getFieldsForAxis("y").map((f) => (
                              <option key={f}>{f}</option>
                            ))}
                          </select>

                          {yAxis.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {yAxis.map((f) => (
                                <span
                                  key={f}
                                  onClick={() => removeYField(f)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-mono cursor-pointer hover:bg-green-200 transition"
                                >
                                  {f}
                                  <span className="text-green-400 hover:text-green-600 font-bold">✕</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="text-xs text-orange-700 font-medium">
                            📊 Histogram automatically computes frequency bins from the X-axis
                            field — no Y-axis field is needed.
                          </p>
                        </div>
                      )}

                      {/* X / Y Labels */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">X Label</label>
                          <input
                            value={xLabel}
                            onChange={(e) => setXLabel(e.target.value)}
                            className="w-full border border-slate-200 px-3 py-2 rounded-lg mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Y Label</label>
                          <input
                            value={yLabel}
                            onChange={(e) => setYLabel(e.target.value)}
                            className="w-full border border-slate-200 px-3 py-2 rounded-lg mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                        </div>
                      </div>

                      {/* Aggregation — not shown for Histogram */}
                      {currentRules.aggregationRequired && !isHistogramSelected && (
                        <div>
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Aggregation
                          </label>
                          <select
                            value={aggregation}
                            onChange={(e) => setAggregation(e.target.value)}
                            className="w-full border border-slate-200 px-3 py-2 rounded-lg mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          >
                            {allowedAggregations.map((agg) => (
                              <option key={agg} value={agg}>{agg}</option>
                            ))}
                          </select>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Advanced Options */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((p) => !p)}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition text-sm font-semibold text-slate-700"
                >
                  <span className="flex items-center gap-2">
                    <span>⚙️</span>
                    <span>Advanced Options — Filters, Sort &amp; Row Limit</span>
                    {(filters.length > 0 || rowLimit || sortConfig?.field) && (
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        {[
                          filters.length > 0 && `${filters.length} filter${filters.length > 1 ? "s" : ""}`,
                          sortConfig?.field && "sorted",
                          rowLimit && `limit ${rowLimit}`,
                        ].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                  <span className={`text-slate-400 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}>
                    ▼
                  </span>
                </button>

                {showAdvanced && (
                  <div className="p-5 bg-white border-t border-slate-200">
                    <DataFilters
                      availableFields={availableFields}
                      filters={filters}
                      onFiltersChange={setFilters}
                      rowLimit={rowLimit}
                      onRowLimitChange={setRowLimit}
                      rowSelection={rowSelection}
                      onRowSelectionChange={setRowSelection}
                      sortConfig={sortConfig}
                      onSortChange={setSortConfig}
                    />
                  </div>
                )}
              </div>

            </div>

            {/* Popup footer */}
            <div className="flex-shrink-0 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between bg-slate-50 rounded-b-2xl">
              <p className="text-xs text-slate-400">
                {Object.keys(fieldTypes).length} field{Object.keys(fieldTypes).length !== 1 ? "s" : ""} mapped
                {xAxis.length > 0 && ` · X: ${xAxis.join(" + ")}`}
                {!isHistogramSelected && yAxis.length > 0 && ` · Y: ${yAxis.join(", ")}`}
                {filters.length > 0 && ` · ${filters.length} filter${filters.length > 1 ? "s" : ""}`}
                {rowLimit && ` · ${rowSelection} ${rowLimit} rows`}
              </p>
              <button
                type="button"
                disabled={!chartValid}
                onClick={handleSaveGraph}
                className={`px-6 py-2 rounded-lg font-bold text-sm transition shadow-sm ${
                  chartValid
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                Make Graph 📊
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
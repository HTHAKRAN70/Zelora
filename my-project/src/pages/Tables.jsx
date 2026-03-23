import { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { fetchImportedTables, fetchTableData, fetchTableRows, updateTableName,setSelectedTable, resetTableRows,deleteTable } from "../store/dbSlice.js";
import { settableSelected, setFieldTypes, updateFieldType, removeField, addField, addnewGraph,saveGraph } from "../store/graphSlice.js";
import { mapFieldsWithTypes, detectFieldType, FIELD_TYPES } from "../utils/fieldTypeMapper.js";
import FieldTypeEditor from "../components/FieldTypeEditor.jsx";
import ChartSuggestions from "../components/ChartSuggestions.jsx";
import { CHART_RULES } from "../components/ChartValidations.jsx";
export default function Tables() {
  const dispatch = useDispatch();
  const { importedTables, selectedTable, tableRows, tablePagination, loading } = useSelector((state) => state.db);
  const { CurrentSelectedTable,currentSelectedChartType, Allgraphs, fieldTypes } = useSelector((state) => state.graph);
  const [viewMode, setViewMode] = useState("list");
  const [selectedforgraph,setselectedforgraph]=useState(false);
  const [showGraphPopup, setShowGraphPopup] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [xAxis, setXAxis] = useState([]);
  const [yAxis, setYAxis] = useState([]);
  const [xLabel, setXLabel] = useState("");
  const [yLabel, setYLabel] = useState("");
  const [aggregation, setAggregation] = useState("sum");
  const [aggregationField,setaggregationField]=useState("");
  const chartKey = currentSelectedChartType?.trim();
  const currentRules =Object.entries(CHART_RULES).find(([key]) => key.toLowerCase() === chartKey?.toLowerCase())?.[1] || {};
  // const currentRules = CHART_RULES[currentSelectedChartType] || {};

  const { user } =useSelector((state) => state.auth);;




  const [chartSelected, setChartSelected] = useState(null);
    const tableBodyRef = useRef(null);
    const pageSize = 10;


  const addXField = (field) => {
    if (xAxis.length >= maxX) return;
    if (!xAxis.includes(field)) {
      setXAxis([...xAxis, field]);
    }
  };
  const removeXField = (field) => {
    setXAxis(xAxis.filter((f) => f !== field));
  };
  const addYField = (field) => {
    if (yAxis.length >= maxY) return;
    if (!yAxis.includes(field)) {
      setYAxis([...yAxis, field]);
    }
  };

  const removeYField = (field) => {
    setYAxis(yAxis.filter((f) => f !== field));
  };
  
  
  const getFieldsForAxis = (axis) => {
  const rule = axis === "x" ? xRule : yRule;

  if (!rule?.types || !Array.isArray(rule.types)) {
    return [];
  }

  return availableFields.filter((field) => {
    const matchedKey = Object.keys(fieldTypes).find(
      (key) => key.toLowerCase() === field.trim().toLowerCase()
    );

    const type = matchedKey ? fieldTypes[matchedKey] : undefined;

    if (!type) return false;

    return rule.types
      .map((t) => t.toLowerCase())
      .includes(type.toLowerCase());
  });
};




  const checkChartCompatibility = (fieldTypes, chart) => {
    if (!chart) return false;
    const types = Object.values(fieldTypes);
    const hasNumeric = types.includes(FIELD_TYPES.NUMERICAL);
    const hasCategorical = types.includes(FIELD_TYPES.CATEGORICAL);
    const hasTemporal = types.includes(FIELD_TYPES.TEMPORAL);

    switch (chart) {
      case "Pie Chart":
      case "Donut Chart":
        return hasCategorical;
      case "Bar Chart":
        return hasCategorical && hasNumeric;
      case "Line Chart":
      case "Area Chart":
      case "Scatter Plot":
      case "Histogram":
      case "Box Plot":
        return hasNumeric;
      case "Timeline":
        return hasTemporal || hasNumeric;
      default:
        return true;
    }
  };

  const chartValid = checkChartCompatibility(fieldTypes, chartSelected);

  useEffect(() => {
    if (showGraphPopup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showGraphPopup]);

  const availableFields =
    (CurrentSelectedTable?.selectedFields && CurrentSelectedTable.selectedFields.length > 0)
      ? CurrentSelectedTable.selectedFields
      : Object.keys(tableRows[0] || {});

  const findMatchingField = (name) => {
    if (!name) return null;
    return availableFields.find((f) => f.toLowerCase() === name.toLowerCase()) || null;
  };

  const alreadyAdded = (name) => {
    if (!name) return false;
    return Object.keys(fieldTypes).some((f) => f.toLowerCase() === name.toLowerCase());
  };

  const isAddValid =
    newFieldName &&
    !!findMatchingField(newFieldName) &&
    !alreadyAdded(newFieldName);

  useEffect(() => {
    dispatch(fetchImportedTables());
  }, [dispatch]);

  useEffect(() => {
    if (CurrentSelectedTable && CurrentSelectedTable.selectedFields) {
      const mappedFields = mapFieldsWithTypes(CurrentSelectedTable.selectedFields);
      const fieldTypesObj = {};
      mappedFields.forEach(field => {
        fieldTypesObj[field.fieldName] = field.type;
      });

      dispatch(setFieldTypes(fieldTypesObj));
      console.log("Initialized field types:", fieldTypesObj);
    }
  }, [CurrentSelectedTable, dispatch]);


  const handleGraphClick = (table) => {
    dispatch(settableSelected(table));
    setShowGraphPopup(true);
  };

  const handleTableClick = async (table) => {
    try {
      await dispatch(fetchTableData(table._id)).unwrap();
      await dispatch(fetchTableRows({ tableId: table._id, page: 1, pageSize: 10 })).unwrap();
      setViewMode("detail");
    } catch (error) {
      toast.error("Failed to load table data");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!tableBodyRef.current || loading || !tablePagination.hasMore) return;
      
      const element = tableBodyRef.current;
      const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
      
      if (isNearBottom && !loading) {
        dispatch(fetchTableRows({
          tableId: selectedTable._id,
          page: tablePagination.page + 1,
          pageSize: pageSize
        }));
      }
    };

    const element = tableBodyRef.current;
    if (element && viewMode === "detail") {
      element.addEventListener("scroll", handleScroll);
      return () => element.removeEventListener("scroll", handleScroll);
    }
  }, [dispatch, selectedTable, tablePagination, loading, viewMode, pageSize]);

    const handleNameUpdate = async (tableId, newName) => {
    try {
      await dispatch(updateTableName({ tableId, displayName: newName })).unwrap();
      toast.success("Table name updated");
      dispatch(fetchImportedTables());
    } catch (error) {
      toast.error("Failed to update name");
    }
    };

    const xRule = currentRules?.xAxis || {};
    const yRule = currentRules?.yAxis || {};

    const maxX = xRule.max || 1;
    const minX = xRule.min || 0;

    const maxY = yRule.max || 1;
    const minY = yRule.min || 0;

    const allowedAggregations = currentRules?.allowedAggregations || [];

    const handleDeleteTable=async (tableId)=>{
      try{
        await  dispatch(deleteTable(tableId));
        dispatch(fetchImportedTables())
      }catch(error){
        console.log("error",error);
      }
      
    }
    const renderTableData = () => {
    if (!tableRows || tableRows.length === 0) {
      return (
        <div className="text-center py-12 text-slate-500">
          {loading ? "Loading data..." : "No data available in this table"}
        </div>
      );
    }

    const data = tableRows;
    const columns = selectedTable.selectedFields.length > 0
      ? selectedTable.selectedFields
      : Object.keys(data[0] || {});
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase border-b border-slate-200"
                >
                {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-4 py-3 text-sm text-slate-700 border-b border-slate-100"
                  >
                    {row[col] !== null && row[col] !== undefined
                      ? typeof row[col] === "object"
                        ? JSON.stringify(row[col])
                        : String(row[col])
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
            onClick={() => {
              setViewMode("list");
              dispatch(setSelectedTable(null));
            }}
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

  return (
    <div className="space-y-6">
      <div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Imported Tables</h1>
        <p className="text-slate-600">View and manage your imported database tables.</p>
      </div>
      <div>
        <button 
        type="button"
          onClick={() => {
            setselectedforgraph((prev) => !prev);
            // when toggling out of graph mode clear any popup and redux selection
            if (selectedforgraph) {
              setShowGraphPopup(false);
              dispatch(settableSelected(null));
            }
          }}
        className={selectedforgraph ? "px-4 py-1 mt-3 bg-gray-600 text-white rounded-lg" : "px-4 py-1 mt-3 bg-green-600 text-white rounded-lg hover:bg-slate-700"}>
          Make Graph 📈
        </button>
      </div>
      </div>
      

      {importedTables.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <p className="text-slate-500">No tables imported yet. Go to Databases to import tables.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead 
              className={selectedforgraph ? "bg-gray-800" : "bg-slate-200"}
              >
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Table Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Connection</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Database Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rows</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Columns</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className={selectedforgraph ? "bg-gray-100 divide-y divide-gray-700" : "divide-y divide-slate-200"}>
                {importedTables.map((table) => (
                  <tr
                    key={table._id}
                    className={selectedforgraph ? "hover:bg-gray-200 hover:shadow cursor-pointer" : "hover:bg-slate-50 cursor-pointer"}
                    onClick={() => selectedforgraph ? handleGraphClick(table) : handleTableClick(table)}
                  >
                    <td 
                    className={`px-6 py-4 ${selectedforgraph ? 'bg-gray-50' : ''}`}>
                      {table.displayName ? (
                        <span className="text-slate-900 font-medium">{table.displayName}</span>
                      ) : (
                        <input
                          type="text"
                          placeholder="Enter table name"
                          defaultValue={table.tableName}
                          className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => {
                            if (e.target.value.trim()) {
                              handleNameUpdate(table._id, e.target.value.trim());
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.target.blur();
                            }
                          }}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {table.connectionId?.connectionName || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm">
                        {(table.databaseType === "mongodb" || table.databaseType === "MongoDB") && "🍃"}
                        {(table.databaseType === "mysql" || table.databaseType === "MySQL") && "🐬"}
                        {(table.databaseType === "postgresql" || table.databaseType === "PostgreSQL") && "🐘"}
                        {(table.databaseType === "api" || table.databaseType === "API") && "🔗"}
                        {table.databaseType }
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{table.totalRowCount || 0}</td>
                    <td className="px-6 py-4 text-slate-600">{table.columnCount || 0}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"

                        onClick={(e) =>{ 
                          e.stopPropagation();
                          console.log("tableee",table);
                          handleDeleteTable(table._id)}}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-700"
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

      {/* Graph popup overlay */}
      {showGraphPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 overflow-hidden">
          <div className="bg-white rounded-xl shadow-2xl p-5 max-w-6xl w-full min-h-[50vh] flex flex-col border-2 border-slate-200 overflow-hidden">
            {/* Header - Fixed */}
            <div className="flex justify-between items-center mb-4 pb-4 border-b-2 border-slate-400 flex-shrink-0 bg-gradient-to-r from-slate-50 to-indigo-50 -m-5 mb-4 p-5 rounded-t-lg">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">📊 {CurrentSelectedTable?.displayName || CurrentSelectedTable?.tableName}</h2>
                <p className="text-xs text-slate-700 mt-1 font-semibold">Database: {CurrentSelectedTable?.databaseType}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowGraphPopup(false);
                  setselectedforgraph(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm transition shadow-md"
              >
                ✕ Close
              </button>
            </div>

            
            <div className="flex-1 overflow-y-auto">
              

              <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-50 p-4 rounded-lg border">
                <h3 className="font-bold text-lg mb-3">Chart Type</h3>

                <ChartSuggestions
                  fieldTypes={fieldTypes}
                  onChartChange={(chart) => setChartSelected(chart)}
                />

                {chartSelected && (
                  <div className="mt-3 text-sm text-green-600">
                    Selected: <b>{chartSelected}</b>
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-lg border">

                <h3 className="font-bold text-lg mb-4">
                ⚙ Chart Configuration
                </h3>

                <div className="mb-4">
                  <label className="font-medium">
                    X Axis Fields ({xAxis.length}/{maxX})
                  </label>

                  <select
                  onChange={(e)=>addXField(e.target.value)}
                  className="w-full border px-3 py-2 rounded mt-1"
                  >
                  <option value="">Select Field</option>

                  {getFieldsForAxis("x").map((f)=>(
                  <option key={f}>{f}</option>
                  ))}

                  </select>

                  <div className="flex flex-wrap gap-2 mt-2">
                  {xAxis.map((f)=>(
                      <span
                      key={f}
                      className="px-2 py-1 bg-blue-100 rounded text-sm cursor-pointer"
                      onClick={()=>removeXField(f)}
                      >
                    {f} ✕
                    </span>
                    ))}
                  </div>
                  </div>


                  <div className="mb-4">
                    <label className="font-medium">
                    Y Axis Fields ({yAxis.length}/{maxY})
                    </label>

                    <select
                    onChange={(e)=>addYField(e.target.value)}
                    className="w-full border px-3 py-2 rounded mt-1"
                    >
                    <option value="">Select Field</option>

                    {getFieldsForAxis("y").map((f)=>(
                    <option key={f}>{f}</option>
                    ))}

                  </select>

                  <div className="flex flex-wrap gap-2 mt-2">
                      {yAxis.map((f)=>(
                      <span
                      key={f}
                      className="px-2 py-1 bg-green-100 rounded text-sm cursor-pointer"
                      onClick={()=>removeYField(f)}
                      >
                      {f} ✕
                    </span>
                    ))}
                  </div>
                  </div>


                  <div className="grid grid-cols-2 gap-3 mb-4">

                    <div>
                      <label className="text-sm font-medium">X Label</label>
                      <input
                      value={xLabel}
                      onChange={(e)=>setXLabel(e.target.value)}
                      className="w-full border px-3 py-2 rounded"
                      />
                      </div>

                      <div>
                      <label className="text-sm font-medium">Y Label</label>
                      <input
                      value={yLabel}
                      onChange={(e)=>setYLabel(e.target.value)}
                      className="w-full border px-3 py-2 rounded"
                      />
                    </div>

                  </div>

                  {currentRules.aggregationRequired && (
                  <div>
                    <div>
                  <label className="text-sm font-medium">
                  Aggregation
                  </label>

                      <select
                      value={aggregation}
                      onChange={(e)=>setAggregation(e.target.value)}
                      className="w-full border px-3 py-2 rounded mt-1"
                      >
                  {allowedAggregations.map((agg)=>(
                        <option key={agg} value={agg}>
                        {agg}
                        </option>
                        ))}
                        </select>
                        </div>
                  </div> 
                  )}
                    </div>
            </div>
              <div>
              
              </div>
            </div>
            
            <div className="flex-shrink-0 border-t px-4 py-3 flex justify-end gap-3 bg-white">
              <button
                type="button"
                disabled={!(Object.keys(fieldTypes).length > 0 && chartSelected && chartValid)}
                onClick={() => {
                  const payload = {
                    userId:user._id,
                    id: Date.now(),
                    tableId: CurrentSelectedTable?._id,
                    xAxis:xAxis,
                    yAxis:yAxis,
                    xLabel:xLabel,
                    yLabel:yLabel,
                    aggregation:aggregation,
                    fields: Object.keys(fieldTypes),
                    chart: chartSelected,
                  };

                 dispatch(saveGraph(payload));
                    toast.success("Graph configuration saved");
                    setShowGraphPopup(false);
                 }}
                
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  Object.keys(fieldTypes).length > 0 && chartSelected
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                Make Graph
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

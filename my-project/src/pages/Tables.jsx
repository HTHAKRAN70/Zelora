import { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { fetchImportedTables, fetchTableData, fetchTableRows, updateTableName,setSelectedTable, resetTableRows } from "../store/dbSlice.js";
import { settableSelected, setFieldTypes, updateFieldType, removeField, addField, addnewGraph } from "../store/graphSlice.js";
import { mapFieldsWithTypes, detectFieldType, FIELD_TYPES } from "../utils/fieldTypeMapper.js";
import FieldTypeEditor from "../components/FieldTypeEditor.jsx";
import ChartSuggestions from "../components/ChartSuggestions.jsx";

export default function Tables() {
  const dispatch = useDispatch();
  const { importedTables, selectedTable, tableRows, tablePagination, loading } = useSelector((state) => state.db);
  const { CurrentSelectedTable, Allgraphs, fieldTypes } = useSelector((state) => state.graph);
  const [viewMode, setViewMode] = useState("list");
  const [selectedforgraph,setselectedforgraph]=useState(false);
  const [showGraphPopup, setShowGraphPopup] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [chartSelected, setChartSelected] = useState(null);
    const tableBodyRef = useRef(null);
     const pageSize = 10;

  // helper to check if chosen chart works with current field types
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

  // lock scrolling on body when modal visible
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
    console.log("Selected Table:", selectedTable);
  },  [selectedTable]);

  useEffect(() => {
    console.log("Imported Tables:", importedTables);
  }, [importedTables]);

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

            {/* Content - Scrollable Only Here */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-5 gap-4">
                {/* Left - Field Editors (Takes 3 columns) */}
                <div className="col-span-3 pr-4 border-r-2 border-slate-300 max-h-full">
                  <h4 className="font-bold text-slate-900 text-base mb-4 text-indigo-700">🏷️ Fields Configuration</h4>
                  {/* Add New Field Input */}
                  <div className="relative flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newFieldName}
                      onChange={(e) => {
                        setNewFieldName(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      placeholder="Add new field"
                      className={`flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        newFieldName && !isAddValid ? "border-red-500" : "border-slate-300"
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && isAddValid) {
                          e.preventDefault();
                          // reuse add button logic below
                          const name = findMatchingField(newFieldName);
                          if (name) {
                            dispatch(addField(name));
                            toast.success(`Field '${name}' added`);
                            setNewFieldName("");
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const nameInput = newFieldName.trim();
                        if (!nameInput) return;
                        const matched = findMatchingField(nameInput);
                        if (!matched) {
                          toast.error("Field not available in this table");
                          return;
                        }
                        if (alreadyAdded(matched)) {
                          toast.error("Field already exists");
                        } else {
                          // additional validation: reject absurdly long names
                          if (matched.length > 100) {
                            toast.error("Field name too long");
                            return;
                          }
                          dispatch(addField(matched));
                          const t = detectFieldType(matched);
                          if (t === "Unknown") {
                            toast.warn(
                              `Field '${matched}' added – type unknown, please verify.`
                            );
                          } else {
                            toast.success(`Field '${matched}' added`);
                          }
                          setNewFieldName("");
                        }
                      }}
                      disabled={!isAddValid}
                      className={`px-3 py-1 rounded text-sm font-medium transition ${
                        isAddValid
                          ? "bg-indigo-500 text-white hover:bg-indigo-600"
                          : "bg-slate-300 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      Add
                    </button>

                    {/* Suggestions dropdown */}
                    {showSuggestions && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-slate-300 rounded mt-1 max-h-40 overflow-y-auto z-50">
                        {availableFields
                          .filter((f) => !alreadyAdded(f))
                          .filter((f) =>
                            newFieldName
                              ? f.toLowerCase().includes(newFieldName.toLowerCase())
                              : true
                          )
                          .length > 0 ? (
                          availableFields
                            .filter((f) => !alreadyAdded(f))
                            .filter((f) =>
                              newFieldName
                                ? f.toLowerCase().includes(newFieldName.toLowerCase())
                                : true
                            )
                            .map((opt) => (
                              <div
                                key={opt}
                                onMouseDown={() => {
                                  setNewFieldName(opt);
                                  setShowSuggestions(false);
                                }}
                                className="px-2 py-1 hover:bg-indigo-50 cursor-pointer text-sm"
                              >
                                {opt}
                              </div>
                            ))
                        ) : (
                          <div className="px-2 py-1 text-sm text-slate-500 italic">
                            No available fields
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {Object.keys(fieldTypes).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(fieldTypes).map((fieldName) => (
                        <div key={fieldName} className="flex-shrink-0">
                          <FieldTypeEditor
                            fieldName={fieldName}
                            fieldType={fieldTypes[fieldName] || 'Unknown'}
                            onRemove={(name) => {
                              dispatch(removeField(name));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic text-xs">No fields available.</p>
                  )}
                </div>

                {/* Right - Chart Suggestions & Aggregations */}
                <div className="col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-indigo-200 max-h-full overflow-y-auto">
                  <h4 className="font-bold text-slate-900 text-base mb-3 text-indigo-700">📈 Visualization</h4>
                  <ChartSuggestions fieldTypes={fieldTypes} onChartChange={(c) => setChartSelected(c)} />
                  {chartSelected && !chartValid && (
                    <div className="mt-2 text-red-500 text-xs">
                      Selected chart "{chartSelected}" is incompatible with your current field types.
                    </div>
                  )}
                  
                </div>
              </div>
            </div>
            {/* Footer - actions */}
            <div className="flex-shrink-0 border-t px-4 py-3 flex justify-end gap-3 bg-white">
              <button
                type="button"
                disabled={!(Object.keys(fieldTypes).length > 0 && chartSelected && chartValid)}
                onClick={() => {
                  // minimal graph creation action; payload can be enhanced later
                  const payload = {
                    id: Date.now(),
                    tableId: CurrentSelectedTable?._id,
                    fields: Object.keys(fieldTypes),
                    chart: chartSelected,
                  };

                  console.log("Payload for new graph:", payload);
                  dispatch(addnewGraph(payload));
                  toast.success("Graph configuration saved");
                  // optionally close popup
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

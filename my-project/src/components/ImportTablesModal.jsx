import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { importTable, clearTablesFromDb } from "../store/dbSlice.js";

export default function ImportTablesModal({ onClose }) {
  const dispatch = useDispatch();
  const { selectedConnection, tablesFromDb,importedTablesFromAPI, loading } = useSelector((state) => state.db);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [displayName, setDisplayName] = useState("");
  const [importing, setImporting] = useState(false);

  if (!selectedConnection || !tablesFromDb) {
    return null;
  }
  console.log("importedTablesFromAPI", importedTablesFromAPI);

  const tables = Object.keys(tablesFromDb || {});
  const fields = selectedTable ? (tablesFromDb[selectedTable] || []) : [];

  const handleFieldToggle = (field) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleSelectAll = () => {
    if (selectedFields.length === fields.length) {
      setSelectedFields([]);
    } else {
      setSelectedFields([...fields]);
    }
  };

  const handleImport = async () => {
    if (!selectedTable) {
      toast.error("Please select a table");
      return;
    }
    if (selectedFields.length === 0) {
      toast.error("Please select at least one field");
      return;
    }

    setImporting(true);
    try {
      await dispatch(
        importTable({
          connectionId: selectedConnection._id,
          tableName: selectedTable,
          selectedFields,
          displayName: displayName || selectedTable,
        })
      ).unwrap();
      toast.success("Table imported successfully!");
      dispatch(clearTablesFromDb());
      onClose();
    } catch (error) {
      toast.error(error.message || "Failed to import table");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            Import Tables from {selectedConnection.connectionName || "Connection"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Table</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {tables.map((table) => (
                <button
                  key={table}
                  type="button"
                  onClick={() => {
                    setSelectedTable(table);
                    setSelectedFields([]);
                    setDisplayName(table);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedTable === table
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {table}
                </button>
              ))}
            </div>
          </div>

          {selectedTable && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={selectedTable}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">Select Fields</label>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    {selectedFields.length === fields.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                  {fields.map((field) => (
                    <label
                      key={field}
                      className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field)}
                        onChange={() => handleFieldToggle(field)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700">{field}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {selectedFields.length} of {fields.length} fields selected
                </p>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!selectedTable || selectedFields.length === 0 || importing}
            className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import Table"}
          </button>
        </div>
      </div>
    </div>
  );
}

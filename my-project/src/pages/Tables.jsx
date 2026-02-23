import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { fetchImportedTables, fetchTableData, updateTableName, setSelectedTable } from "../store/dbSlice.js";

export default function Tables() {
  const dispatch = useDispatch();
  const { importedTables, selectedTable, loading } = useSelector((state) => state.db);
  const [viewMode, setViewMode] = useState("list");

  useEffect(() => {
    dispatch(fetchImportedTables());
  }, [dispatch]);

  const handleTableClick = async (table) => {
    try {
      await dispatch(fetchTableData(table._id)).unwrap();
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
    if (!selectedTable || !selectedTable.data || selectedTable.data.length === 0) {
      return (
        <div className="text-center py-12 text-slate-500">
          No data available in this table
        </div>
      );
    }

    const data = selectedTable.data;
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
              {selectedTable.rowCount} rows × {selectedTable.columnCount} columns
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
          <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
            {renderTableData()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Imported Tables</h1>
        <p className="text-slate-600">View and manage your imported database tables.</p>
      </div>

      {importedTables.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <p className="text-slate-500">No tables imported yet. Go to Databases to import tables.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Table Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Connection</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Database Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rows</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Columns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {importedTables.map((table) => (
                  <tr
                    key={table._id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => handleTableClick(table)}
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
                    <td className="px-6 py-4 text-slate-600">{table.rowCount || 0}</td>
                    <td className="px-6 py-4 text-slate-600">{table.columnCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, use } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  fetchConnections,
  saveConnection,
  updateConnectionName,
  fetchTables,
  importTable,
  deleteconnection,
  importAPITable,
} from "../store/dbSlice.js";
import { setSelectedConnection, clearTablesFromDb } from "../store/dbSlice.js";
import ImportTablesModal from "../components/ImportTablesModal.jsx";
// import { set } from "mongoose";

const DB_TYPES = [
  { id: "mongodb", label: "MongoDB", icon: "🍃" },
  { id: "mysql", label: "MySQL", icon: "🐬" },
  { id: "postgresql", label: "PostgreSQL", icon: "🐘" },
  { id: "api", label: "API", icon: "🔗" },
];

const getDefaultCredentials = (dbType) => {
  switch (dbType) {
    case "mongodb":
      return { host: "", port: 27017, database: "", uri: "" };
    case "mysql":
      return { host: "", port: 3306, user: "", password: "", database: "" };
    case "postgresql":
      return { host: "", port: 5432, user: "", password: "", database: "" };
    case "api":
      return { uri: "" };
      default:
      return {};
  }
};

export default function Databases() {
  const [selectedDbType, setSelectedDbType] = useState("mongodb");
  const [credentials, setCredentials] = useState(getDefaultCredentials("mongodb"));
  const [connectionName, setConnectionName] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const {user}=useSelector((state)=>state.auth);
  const dispatch = useDispatch();
  const { connections, loading: connectionsLoading } = useSelector((state) => state.db);

  useEffect(() => {
    dispatch(fetchConnections());
  }, [dispatch]);
  // useEffect(()=>{
  //   console.log("connections",connections);
  // },connections);

  useEffect(() => {
    console.log("Selected DB Type:", selectedDbType);
    setCredentials(getDefaultCredentials(selectedDbType));
  }, [selectedDbType]);

  const handleCredentialChange = (key, value) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/db/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("zelora_token")}`,
        },
        
        body: JSON.stringify({ dbType: selectedDbType, credentials }),
      });
      // console.log("credentials being sent for test:", { dbType: selectedDbType, credentials });
      const data = await res.json();
      if (data.success) {
        toast.success("Connection successful!");
      } else {
        console.log("Connection test failed:", data.message);
        toast.error(data.message || "Connection failed");
      }
    } catch (error) {
      toast.error("Connection test failed");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      console.log("Attempting to save connection with data:", { dbType: selectedDbType, credentials, connectionName });
      await dispatch(saveConnection({ dbType: selectedDbType, credentials, connectionName })).unwrap();
      toast.success("Connection saved successfully!");
      setCredentials(getDefaultCredentials(selectedDbType));
      setConnectionName("");
      dispatch(fetchConnections());
    } catch (error) {
      toast.error(error.message || "Failed to save connection");
    } finally {
      setLoading(false);
    }
  };

  const handleImportTables = async (connection) => {
    dispatch(setSelectedConnection(connection));
    dispatch(clearTablesFromDb());
    try {
      await dispatch(fetchTables(connection._id)).unwrap();
      setShowImportModal(true);
    } catch (error) {
      toast.error("Failed to fetch tables");
    }
  };
  const handleApiImport = async (connection) => {
    dispatch(setSelectedConnection(connection));
    dispatch(clearTablesFromDb());
    try {
      await dispatch(importAPITable(connection._id)).unwrap();
      setShowImportModal(true);
    } catch (error) {
      toast.error("Failed to fetch data from API");
    }
  }
   useEffect(() => {
    console.log("showImportModal changed to", showImportModal);
  }, [showImportModal]);

  const handleNameUpdate = async (connectionId, newName) => {
    try {
      await dispatch(updateConnectionName({ connectionId, connectionName: newName })).unwrap();
      toast.success("Connection name updated");
      dispatch(fetchConnections());
    } catch (error) {
      toast.error("Failed to update name");
    }
  };
  
  const handleDeleteConnection= async(conn)=>{
     const connectionId=conn._id;
     console.log("cpnnection Id",connectionId);
   await dispatch(deleteconnection(connectionId)).unwrap();
    dispatch(fetchConnections());
  }


  const renderCredentialFields = () => {
    switch (selectedDbType) {
      case "mongodb":
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Connection URI (optional)</label>
              <input
                type="text"
                value={credentials.uri || ""}
                onChange={(e) => handleCredentialChange("uri", e.target.value)}
                placeholder="mongodb://localhost:27017/mydb"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Host</label>
                <input
                  type="text"
                  value={credentials.host || ""}
                  onChange={(e) => handleCredentialChange("host", e.target.value)}
                  placeholder="localhost"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Port</label>
                <input
                  type="number"
                  value={credentials.port || ""}
                  onChange={(e) => handleCredentialChange("port", e.target.value)}
                  placeholder="27017"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Database</label>
              <input
                type="text"
                value={credentials.database || ""}
                onChange={(e) => handleCredentialChange("database", e.target.value)}
                placeholder="mydb"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
          </>
        );
      case "mysql":
         return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Host</label>
                <input
                  type="text"
                  value={credentials.host || ""}
                  onChange={(e) => handleCredentialChange("host", e.target.value)}
                  placeholder="localhost"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Port</label>
                <input
                  type="number"
                  value={credentials.port || ""}
                  onChange={(e) => handleCredentialChange("port", e.target.value)}
                  placeholder={selectedDbType === "mysql" ? "3306" : "5432"}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Database</label>
              <input
                type="text"
                value={credentials.database || ""}
                onChange={(e) => handleCredentialChange("database", e.target.value)}
                placeholder="mydb"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={credentials.user || ""}
                  onChange={(e) => handleCredentialChange("user", e.target.value)}
                  placeholder="username"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={credentials.password || ""}
                  onChange={(e) => handleCredentialChange("password", e.target.value)}
                  placeholder="password"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </>
        );
      case "postgresql":
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Host</label>
                <input
                  type="text"
                  value={credentials.host || ""}
                  onChange={(e) => handleCredentialChange("host", e.target.value)}
                  placeholder="localhost"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Port</label>
                <input
                  type="number"
                  value={credentials.port || ""}
                  onChange={(e) => handleCredentialChange("port", e.target.value)}
                  placeholder={selectedDbType === "mysql" ? "3306" : "5432"}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Database</label>
              <input
                type="text"
                value={credentials.database || ""}
                onChange={(e) => handleCredentialChange("database", e.target.value)}
                placeholder="mydb"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={credentials.user || ""}
                  onChange={(e) => handleCredentialChange("user", e.target.value)}
                  placeholder="username"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={credentials.password || ""}
                  onChange={(e) => handleCredentialChange("password", e.target.value)}
                  placeholder="password"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </>
        );
      case "api":
        return (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API Endpoint</label>
            <input
              type="text"
              value={credentials.uri || ""}
              onChange={(e) => handleCredentialChange("uri", e.target.value)}
              placeholder="https://api.example.com/data"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        );
        default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Database Connections</h1>
        <p className="text-slate-600">Connect to your databases and import tables.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Select Database Type</label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {DB_TYPES.map((db) => (
              <button
                key={db.id}
                type="button"
                onClick={() => setSelectedDbType(db.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedDbType === db.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>{db.icon}</span>
                {db.label}
              </button>
            ))}
           
          </div>
        </div>

        <div className="space-y-4">{renderCredentialFields()}</div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Test Connection
          </button>
          <button
            type="button"
            onClick={handleConnect}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-50"
          >
            {loading ? "Connecting..." : selectedDbType === "api" ? "Fetch & Save" : "Connect "}
          </button>
        </div>
      </div>

      {connections.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Saved Connections</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Connection Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Database Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Import</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Disconnect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {connections.map((conn) => (
                  <tr key={conn._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      {conn.connectionName ? (
                        <span className="text-slate-900">{conn.connectionName}</span>
                      ) : (
                        <input
                          type="text"
                          placeholder="Enter connection name"
                          className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          onBlur={(e) => {
                            if (e.target.value.trim()) {
                              handleNameUpdate(conn._id, e.target.value.trim());
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
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm">
                        {DB_TYPES.find((d) => d.id === conn.dbtype)?.icon} {DB_TYPES.find((d) => d.id ===  conn.dbtype)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Connected
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => conn.dbtype === "api" ? handleApiImport(conn) : handleImportTables(conn)}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                      >
                         Import Tables
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleDeleteConnection(conn)}
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

      {showImportModal && (
        <ImportTablesModal
          onClose={() => {
            setShowImportModal(false);
            dispatch(clearTablesFromDb());
          }}
        />
      )}
    </div>
  );
}

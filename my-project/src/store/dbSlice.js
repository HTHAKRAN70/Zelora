import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api.js";

export const fetchConnections = createAsyncThunk("db/fetchConnections", async () => {
  const res = await api.get("/db/connections");
  return res.data;
});

export const saveConnection = createAsyncThunk("db/saveConnection", async (data) => {
  console.log("Attempting to save connection with data:", data);
  const res = await api.post("/db/save", data);
  return res.data;
});

export const updateConnectionName = createAsyncThunk("db/updateConnectionName", async ({ connectionId, connectionName }) => {
  const res = await api.put(`/db/connection/${connectionId}/name`, { connectionName });
  return res.data;
});

export const fetchTables = createAsyncThunk("db/fetchTables", async (connectionId) => {
  const res = await api.get(`/db/connection/${connectionId}/tables`);
  return res.data;
});
export const importAPITable = createAsyncThunk("db/importAPITable", async (connectionId) => {
  try {
    console.log("Importing API data for connectionId:", connectionId);
    const res = await api.post(`/db/importapidata/${connectionId}`);
    return res.data;
  } catch (error) {
    console.error("error while importing API data", error);
    throw error;
  }
});
export const importTable = createAsyncThunk("db/importTable", async (data) => {
 let res;
  try{
    res = await api.post("/db/import", data);

    console.log("res=data",res);
 }catch(error){
  console.log("error while importing table",error);
 }
  return res.data;
});

export const fetchImportedTables = createAsyncThunk("db/fetchImportedTables", async () => {
  const res = await api.get("/db/tables");
  return res.data;
});

export const fetchTableData = createAsyncThunk("db/fetchTableData", async (tableId) => {
  const res = await api.get(`/db/table/${tableId}`);
  return res.data;
});

export const fetchTableRows = createAsyncThunk(
  "db/fetchTableRows",
  async ({ tableId, page = 1, pageSize = 10 }) => {
    const res = await api.get(`/db/table/${tableId}/rows`, {
      params: { page, pageSize },
    });
    return res.data;
  }
);

export const updateTableName = createAsyncThunk("db/updateTableName", async ({ tableId, displayName }) => {
  const res = await api.put(`/db/table/${tableId}/name`, { displayName });
  return res.data;
});
export const deleteconnection = createAsyncThunk(
  "db/deleteConnection",
  async (connectionId) => {
    const res = await api.delete(`/db/connections/delete`, {
      data: { connectionId },
    });
    return res.data;
  }
);
export const deleteTable=createAsyncThunk("db/deleteTable",async(tableId)=>{
  const res=await api.delete(`/db/table/delete/${tableId}`);
  return res.data;
})

const dbSlice = createSlice({
  name: "db",
  initialState: {
    connections: [],
    importedTables: [],
    importedTablesFromAPI: [],
    selectedConnection: null,
    tablesFromDb: null,
    selectedTable: null,
    tableRows: [],
    tablePagination: {
      page: 1,
      pageSize: 10,
      totalRows: 0,
      hasMore: false,
    },
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedConnection: (state, action) => {
      console.log("Setting selected connection:", action.payload);
      state.selectedConnection = action.payload;
    },
    clearTablesFromDb: (state) => {
      state.tablesFromDb = null;
    },
    setSelectedTable: (state, action) => {
      state.selectedTable = action.payload;
    },
    resetTableRows: (state) => {
      state.tableRows = [];
      state.tablePagination = {
        page: 1,
        pageSize: 10,
        totalRows: 0,
        hasMore: false,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConnections.pending, (state) => {
        state.loading = true;
      })
      
      .addCase(fetchConnections.fulfilled, (state, action) => {
        state.loading = false;
        state.connections = action.payload.connections || [];
      })
      .addCase(fetchConnections.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(deleteTable.fulfilled,(state,action)=>{
        state.importedTables=state.importedTables.filter(
          (table)=>{
            table._id!==action.payload.tableId}
        );
      })
      .addCase(deleteconnection.fulfilled,(state,action)=>{
       const { connectionId } = action.payload;
        state.connections = state.connections.filter(
          (conn) => conn._id !== connectionId
        );
        state.importedTables = state.importedTables.filter(
          (table) => table.connectionId !== connectionId
        );
      })
      .addCase(saveConnection.fulfilled, (state, action) => {
        state.connections.push(action.payload.connection);
      })
      .addCase(updateConnectionName.fulfilled, (state, action) => {
        const idx = state.connections.findIndex((c) => c._id === action.payload.connection._id);
        if (idx !== -1) {
          state.connections[idx] = action.payload.connection;
        }
      })
      .addCase(fetchTables.fulfilled, (state, action) => {
        if (action.payload.tables) {
          state.tablesFromDb = action.payload.tables;
        } else if (action.payload.Fields) {
          state.tablesFromDb = { API: action.payload.Fields };
        } else {
          state.tablesFromDb = null;
        }
      })
      .addCase(importAPITable.fulfilled, (state, action) => {
        console.log("Table imported from API:", action.payload);
        if (action.payload.Fields) {
          state.tablesFromDb = { API: action.payload.Fields };
        }
        if (action.payload.Fields) {
          state.importedTablesFromAPI.push(action.payload.Fields);
        } else if (action.payload.data) {
          state.importedTablesFromAPI.push(action.payload.data);
        }
      })
      .addCase(importTable.fulfilled, (state, action) => {
        state.importedTables.push(action.payload.table);
      })
      .addCase(fetchImportedTables.fulfilled, (state, action) => {
        state.importedTables = action.payload.tables || [];
      })
      .addCase(fetchTableData.fulfilled, (state, action) => {
        state.selectedTable = action.payload.table;
        state.tableRows = [];
        state.tablePagination = {
          page: 1,
          pageSize: 10,
          totalRows: action.payload.table.totalRowCount || 0,
          hasMore: true,
        };
      })
      .addCase(fetchTableRows.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTableRows.fulfilled, (state, action) => {
        state.loading = false;
        const { rows, page, pageSize, totalRows, hasMore } = action.payload;
        state.tableRows = [...state.tableRows, ...rows];
        state.tablePagination = {
          page,
          pageSize,
          totalRows,
          hasMore,
        };
      })
      .addCase(fetchTableRows.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(updateTableName.fulfilled, (state, action) => {
        const idx = state.importedTables.findIndex((t) => t._id === action.payload.table._id);
        if (idx !== -1) {
          state.importedTables[idx] = action.payload.table;
        }
      });
  },
});

export const { setSelectedConnection, clearTablesFromDb, setSelectedTable, resetTableRows } = dbSlice.actions;
export default dbSlice.reducer;

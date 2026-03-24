import {createAsyncThunk,createSlice} from "@reduxjs/toolkit";
import { detectFieldType } from "../utils/fieldTypeMapper.js";
import api from "../services/api.js";
import { deleteconnection,deleteTable } from "./dbSlice.js";

export const fetchAllGraphs = createAsyncThunk("graph/fetchAllGraphs", async (data) => {
    const res = await api.post("/graph/getAllGraphs", data);
    return res.data;
});

export const addnewGraph = createAsyncThunk("graph/addnewGraph", async (data) => {
    const res = await api.post("/graph/create", data);
    return res.data;
});

export const saveGraph = createAsyncThunk("graph/savegraph", async (data) => {
    const res = await api.post("graph/saveGraph", data);
    return res.data;
});

export const deleteGraph = createAsyncThunk(
    "graph/deleteGraph",
    async (graphId, { rejectWithValue }) => {
        try {
            await api.delete(`/graph/deleteGraph/${graphId}`); 
            return graphId;
        } catch (err) {
            return rejectWithValue(err?.response?.data?.message || "Failed to delete graph.");
        }
    }
);

const graphSlice = createSlice({
    name: "graph",
    initialState: {
        Allgraphs: [],
        currentSelectedChartType: null,
        CurrentSelectedTable: null,
        fieldTypes: {},
        deletingId: null,   // tracks which graph is currently being deleted
        deleteError: null,
    },
    reducers: {
        setChartType: (state, action) => {
            state.currentSelectedChartType = action.payload;
        },
        settableSelected: (state, action) => {
            console.log("Graph Slice - Setting selected table:", action.payload);
            state.CurrentSelectedTable = action.payload;
            state.fieldTypes = {};
        },
        setFieldTypes: (state, action) => {
            state.fieldTypes = action.payload;
        },
        updateFieldType: (state, action) => {
            const { fieldName, type } = action.payload;
            state.fieldTypes[fieldName] = type;
        },
        removeField: (state, action) => {
            const fieldName = action.payload;
            delete state.fieldTypes[fieldName];
        },
        addField: (state, action) => {
            const fieldName = action.payload;
            const type = detectFieldType(fieldName);
            state.fieldTypes[fieldName] = type;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(deleteconnection.fulfilled, (state, action) => {
            const { deletedTableIds } = action.payload;
            state.Allgraphs = state.Allgraphs.filter(
                (g) => !deletedTableIds.includes(g.tableId)
            );
        });
        builder.addCase(deleteTable.fulfilled, (state, action) => {
            const { tableId } = action.payload;
            state.Allgraphs = state.Allgraphs.filter(
                (g) => g.tableId !== tableId
            );
        });
        builder.addCase(fetchAllGraphs.fulfilled, (state, action) => {
            state.Allgraphs = action.payload.graphs;
        });

    
        
        builder.addCase(addnewGraph.fulfilled, (state, action) => {
            if (action.payload.graphs) {           // guard before pushing
                state.Allgraphs.push(action.payload.graphs);
            }
            });

        builder.addCase(saveGraph.fulfilled, (state, action) => {
            if (action.payload.graph) {            // was payload.grphs — typo
                state.Allgraphs.push(action.payload.graph);
            }
            });




        // ── deleteGraph lifecycle ────────────────────────────────────────────
        builder.addCase(deleteGraph.pending, (state, action) => {
            state.deletingId  = action.meta.arg; // graphId passed to the thunk
            state.deleteError = null;
        });
        builder.addCase(deleteGraph.fulfilled, (state, action) => {
            state.Allgraphs  = state.Allgraphs.filter((g) => g._id !== action.payload);
            state.deletingId = null;
        });
        builder.addCase(deleteGraph.rejected, (state, action) => {
            state.deletingId  = null;
            state.deleteError = action.payload;
        });
    },
});

export const {
    settableSelected,
    setFieldTypes,
    updateFieldType,
    setChartType,
    removeField,
    addField,
} = graphSlice.actions;

export default graphSlice.reducer;
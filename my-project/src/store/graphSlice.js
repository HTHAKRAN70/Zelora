import {createAsyncThunk,createSlice} from "@reduxjs/toolkit";
import { detectFieldType } from "../utils/fieldTypeMapper.js"; // for default type when adding a field

export const fetchAllGraphs = createAsyncThunk("graph/fetchAllGraphs", async () => {
    const res = await api.get("/graph/all");
    return res.data;
});
export const addnewGraph = createAsyncThunk("graph/addnewGraph", async (data) => {
    const res = await api.post("/graph/create", data);
    return res.data;
});



const graphSlice = createSlice({
    name: "graph",
    initialState: {
    Allgraphs: [],
    CurrentSelectedTable: null,
    fieldTypes: {},
    },
    reducers: {
        settableSelected: (state, action) => {
            console.log("Graph Slice - Setting selected table:", action.payload);
            state.CurrentSelectedTable = action.payload;
            state.fieldTypes = {};
        },
        setFieldTypes: (state, action) => {
            // action.payload should be { fieldName: type, ... }
            state.fieldTypes = action.payload;
        },
        updateFieldType: (state, action) => {
            // action.payload should be { fieldName, type }
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
        builder.addCase(fetchAllGraphs.fulfilled, (state, action) => {
            state.Allgraphs = action.payload.graphs;
        });
        builder.addCase(addnewGraph.fulfilled, (state, action) => {
            state.Allgraphs.push(action.payload.graph);
        });
    },
});


export const { settableSelected, setFieldTypes, updateFieldType, removeField, addField} = graphSlice.actions;
export default graphSlice.reducer;
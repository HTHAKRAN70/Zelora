import {createAsyncThunk,createSlice} from "@reduxjs/toolkit";
import { detectFieldType } from "../utils/fieldTypeMapper.js"; // for default type when adding a field
import api from "../services/api.js";
export const fetchAllGraphs = createAsyncThunk("graph/fetchAllGraphs", async (data) => {
    const res = await api.post("/graph/getAllGraphs",data);
    return res.data;
});
export const addnewGraph = createAsyncThunk("graph/addnewGraph", async (data) => {
    const res = await api.post("/graph/create", data);
    return res.data;
});
export const saveGraph=createAsyncThunk("graph/savegraph",async(data)=>{
    const res=await api.post("graph/saveGraph",data);
    return res.data;
})
const graphSlice = createSlice({
    name: "graph",
    initialState: {
    Allgraphs: [],
    currentSelectedChartType:null,
    CurrentSelectedTable: null,
    fieldTypes: {},
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
        builder.addCase(fetchAllGraphs.fulfilled, (state, action) => {
            state.Allgraphs = action.payload.graphs;
        });
        builder.addCase(addnewGraph.fulfilled, (state, action) => {
            state.Allgraphs.push(action.payload.graphs);
        });
        builder.addCase(saveGraph.fulfilled,(state,action)=>{
            state.Allgraphs.push(action.payload.grphs);
        });
    },
});


export const { settableSelected, setFieldTypes, updateFieldType,setChartType, removeField, addField} = graphSlice.actions;
export default graphSlice.reducer;
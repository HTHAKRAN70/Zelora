import mongoose from "mongoose";
const GraphSchema=new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true, 
    },
    tableId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Table",   
        required: true,
    },
    fields:[{
        type:String,
        required:true,
    }],
    chartType:{
        type:String,
        enum:["bar","line","pie","scatter"],
        required:true,
    },
    

})
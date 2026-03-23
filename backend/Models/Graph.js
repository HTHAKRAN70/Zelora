import mongoose from "mongoose";

const graphSchema = new mongoose.Schema(
  {
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "now Table",
      required: true,
    },
    userId:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"User",
      required:true,
    },
    chartType: {
      type: String,
      required: true,
    },
    xAxis: [
      {
        type: String,
        required: true,
      },
    ],

    yAxis: [
      {
        type: String,
        required: true,
      },
    ],

    xLabel: {
      type: String,
      default: "",
    },

    yLabel: {
      type: String,
      default: "",
    },

    aggregation: {
      type: String,
      enum: ["sum", "avg", "count", "min", "max"],
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Graph = mongoose.model("Graph", graphSchema);

export default Graph;
// import mongoose from "mongoose";

// const graphSchema = new mongoose.Schema(
//   {
//     tableId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "now Table",
//       required: true,
//     },
    
//     userId:{
//       type:mongoose.Schema.Types.ObjectId,
//       ref:"User",
//       required:true,
//     },
//     chartType: {
//       type: String,
//       required: true,
//     },
//     xAxis: [
//       {
//         type: String,
//         required: true,
//       },
//     ],

//     yAxis: [
//       {
//         type: String,
//         required: true,
//       },
//     ],

//     xLabel: {
//       type: String,
//       default: "",
//     },

//     yLabel: {
//       type: String,
//       default: "",
//     },

//     aggregation: {
//       type: String,
//       enum: ["sum", "average", "count", "min", "max"],
//       default: null,
//     },
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// const Graph = mongoose.model("Graph", graphSchema);

// export default Graph;


import mongoose from "mongoose";

const filterSchema = new mongoose.Schema(
  {
    field:    { type: String, required: true },
    operator: { type: String, required: true }, // =, !=, >, >=, <, <=, contains, not_contains
    value:    { type: String, required: true },
  },
  { _id: false }
);

const sortBySchema = new mongoose.Schema(
  {
    field: { type: String, default: null },
    order: { type: String, enum: ["asc", "desc"], default: "asc" },
  },
  { _id: false }
);

const graphSchema = new mongoose.Schema(
  {
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    chartType: {
      type: String,
      required: true,
    },
    xAxis: [{ type: String }],
    yAxis: [{ type: String }],
    xLabel: { type: String, default: "" },
    yLabel: { type: String, default: "" },

    aggregation: {
      type: String,
      // No enum — trimConfig lowercases it; controller validates
      default: null,
    },

    // ── Advanced query options ───────────────────────────────────────
    filters:      { type: [filterSchema], default: [] },
    rowLimit:     { type: Number, default: null },
    rowSelection: { type: String, enum: ["head", "tail", "all"], default: "all" },
    sortBy:       { type: sortBySchema, default: null },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Graph = mongoose.model("Graph", graphSchema);
export default Graph;
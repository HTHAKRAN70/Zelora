import mongoose from "mongoose";

const TableSchema = new mongoose.Schema(
  {
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DBConnection",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tableName: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      default: "",
    },
    databaseType: {
      type: String,
      enum: ["mysql", "postgresql", "mongodb", "api"],
      required: true,
    },
    selectedFields: {
      type: [String],
      default: [],
    },
    totalRowCount: {
      type: Number,
      default: 0,
    },
    columnCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Table", TableSchema);

import mongoose from "mongoose";

const dbconnectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    connectionName: {
      type: String,
      default: "",
    },
    dbtype: {
      type: String,
      enum: ["mysql", "postgresql", "mongodb","api"],
      required: true,
    },
    credentials: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("DBConnection", dbconnectionSchema);

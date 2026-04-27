import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role:      { type: String, enum: ["user", "assistant"], required: true },
    content:   { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const chatSessionSchema = new mongoose.Schema(
  {
    graphId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Graph",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messages:   { type: [messageSchema], default: [] },
    lastIntent: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// One session per (graph, user) pair — guarantees isolation
chatSessionSchema.index({ graphId: 1, userId: 1 }, { unique: true });

export default mongoose.model("ChatSession", chatSessionSchema);
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authroutes from "./Routes/auth.route.js";
import dbRoutes from "./Routes/db.route.js";
import graphRoutes from "./Routes/graph.route.js";
import chatRoutes from "./Routes/chat.routes.js";
dotenv.config();
const app = new express();
app.use(express.json());
app.use(cors());
connectDB();
const PORT = process.env.PORT || 5000;
app.use("/api/auth", authroutes);
app.use("/api/db", dbRoutes);
app.use("/api/graph", graphRoutes);
app.use("/api/chat", chatRoutes);
 
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
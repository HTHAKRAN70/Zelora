import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authroutes from "./Routes/auth.route.js";
import dbRoutes from "./Routes/db.route.js";
dotenv.config();
const app = new express();
app.use(express.json());
app.use(cors());
connectDB();
const PORT = process.env.PORT || 5000;
app.use("/api/auth", authroutes);
app.use("/api/db", dbRoutes);
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
import express from "express";
import {
  sendMessageStream,
  getChatHistory,
  clearChatHistory,
} from "../Controllers/chat.controller.js";

// ⚠️ Replace this import path with your actual auth middleware path
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(  "/stream",        authenticateToken, sendMessageStream);
router.get(   "/history/:graphId", authenticateToken, getChatHistory);
router.delete("/clear",         authenticateToken, clearChatHistory);

export default router;
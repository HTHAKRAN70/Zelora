import express from "express";
import {
  testDbConnection,
  saveConnection,
  getConnections,
  updateConnectionName,
  getTablesFromDb,
  importTable,
  getImportedTables,
  getTableData,
  getTableRows,
  updateTableName,
  deleteConnection,
  getTableFromAPI
} from "../Controllers/db.controller.js";
import { authenticateToken } from "../Middleware/auth.middleware.js";

const router = express.Router();

router.post("/test", authenticateToken, testDbConnection);
router.post("/save", authenticateToken, saveConnection);
router.get("/connections", authenticateToken, getConnections);
router.put("/connection/:connectionId/name", authenticateToken, updateConnectionName);
router.get("/connection/:connectionId/tables", authenticateToken, getTablesFromDb);
router.post("/import", authenticateToken, importTable);
router.post("/importapidata/:connectionId", authenticateToken, getTableFromAPI);
router.get("/tables", authenticateToken, getImportedTables);
router.get("/table/:tableId", authenticateToken, getTableData);
router.get("/table/:tableId/rows", authenticateToken, getTableRows);
router.put("/table/:tableId/name", authenticateToken, updateTableName);
router.delete("/connection/:connectionId", authenticateToken, deleteConnection);

export default router;

import express from 'express';
import {createGraph,getAllgraphs,saveGraph,deleteGraph} from "../Controllers/graph.controller.js";
import { authenticateToken } from "../Middleware/auth.middleware.js";
const router=express.Router();
router.post('/saveGraph',authenticateToken,saveGraph);
router.post('/create',authenticateToken,createGraph);
router.post('/getAllGraphs',authenticateToken,getAllgraphs);
router.delete('/deleteGraph/:graphId',authenticateToken,deleteGraph);
export default router;
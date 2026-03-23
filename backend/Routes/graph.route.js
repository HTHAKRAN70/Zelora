import express from 'express';
import {createGraph,getAllgraphs,saveGraph} from "../Controllers/graph.controller.js";
const router=express.Router();
router.post('/saveGraph',saveGraph);
router.post('/create',createGraph);
router.post('/getAllGraphs',getAllgraphs);
export default router;
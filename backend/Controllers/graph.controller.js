import Graph from "../Models/Graph.js";
import Table from "../Models/Tables.js";
import DBConnection from "../Models/Database.js";

import mysql from "mysql2/promise";
import { Client } from "pg";
import mongoose from "mongoose";
export const saveGraph =async (req,res,next)=>{
  try{
    
    let config = trimConfig(req.body);
    if (!config.chartType && config.chart) {
      config.chartType = config.chart.trim();
    }

    if (!config.chartType) {
      return res.status(400).json({
        error: "chartType is required"
      });
    }
    const graph = await Graph.create(config);
     res.status(201).json({
      success: true,
      graph
    });
  }
  catch(error){
    next(error);
  }
};

export const createGraph = async (req, res, next) => {
  try {
    // console.log("req",req.body);
    let config = req.body;
    const graph_id=req.body.graphId;
    
    const graph = await Graph.findById(graph_id);
    // console.log("graph",graph);
    const table = await Table.findById(graph.tableId);

    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    const connection = await DBConnection.findById(table.connectionId);

    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }

    const fields = [...graph.xAxis, ...graph.yAxis];
    const rawData = await fetchRawData(
      connection.dbtype,
      connection.credentials,
      table.tableName,
      fields
    );

    const aggregated = aggregateData(rawData, graph);
    const chartData = buildChartData(aggregated, graph);

    console.log("charData",chartData);
    res.json({
      success: true,
      chartData
    });

  } catch (error) {
    next(error);
  }
};



export const getAllgraphs = async (req, res, next) => {
  // console.log("req",req.body);
  try {

    const graphs = await Graph.find({userId:req.body.userId}).sort({ createdAt: -1 });
    // console.log("graphs",graphs);
    res.json({
      success: true,
      graphs
    });

  } catch (error) {
    next(error);
  }
};

function trimConfig(config) {

  const trimmed = { ...config };

  if (typeof trimmed.chart === "string")
    trimmed.chart = trimmed.chart.trim();

  if (typeof trimmed.chartType === "string")
    trimmed.chartType = trimmed.chartType.trim();

  if (typeof trimmed.xLabel === "string")
    trimmed.xLabel = trimmed.xLabel.trim();

  if (typeof trimmed.aggregation === "string")
    trimmed.aggregation = trimmed.aggregation.trim().toLowerCase();

  if (Array.isArray(trimmed.xAxis))
    trimmed.xAxis = trimmed.xAxis.map(v => v.trim());

  if (Array.isArray(trimmed.yAxis))
    trimmed.yAxis = trimmed.yAxis.map(v => v.trim());

  if (Array.isArray(trimmed.fields))
    trimmed.fields = trimmed.fields.map(v => v.trim());

  return trimmed;
}


async function fetchRawData(dbType, credentials, tableName, fields) {

  switch (dbType) {

    case "mysql": {

      const conn = await mysql.createConnection({
        host: credentials.host,
        port: credentials.port || 3306,
        user: credentials.user,
        password: credentials.password,
        database: credentials.database,
      });

      const [rows] = await conn.execute(
        `SELECT ${fields.join(",")} FROM ${tableName}`
      );

      await conn.end();

      return rows;
    }



    case "postgresql": {

      const client = new Client({
        host: credentials.host,
        port: credentials.port || 5432,
        user: credentials.user,
        password: credentials.password,
        database: credentials.database,
      });

      await client.connect();

      const result = await client.query(
        `SELECT ${fields.join(",")} FROM "${tableName}"`
      );

      await client.end();

      return result.rows;
    }



    case "mongodb": {

      const uri =
        credentials.uri ||
        `mongodb://${credentials.host}:${credentials.port || 27017}/${credentials.database}`;

      const conn = await mongoose.createConnection(uri).asPromise();

      const db = conn.db;

      const projection = {};

      fields.forEach(f => {
        projection[f] = 1;
      });

      const docs = await db
        .collection(tableName)
        .find({}, { projection })
        .toArray();

      await conn.close();

      return docs;
    }



    case "api": {

      const { uri, method = "GET", headers = {} } = credentials;

      const response = await fetch(uri, { method, headers });

      const data = await response.json();

      return Array.isArray(data)
        ? data
        : data.data || [data];
    }

    default:
      throw new Error("Unsupported database type");
  }
}



function aggregateData(data, config) {

  const grouped = {};
  const avgCounter = {};
  data.forEach(row => {
    // console.log("row",row);
    const key = config.xAxis.map(x => row[x]).join("_");
    
    // console.log("key",key);
    if (!grouped[key]) {

      grouped[key] = {
        label: key,
        values: {}
      };

      avgCounter[key] = {};

      config.yAxis.forEach(y => {
        grouped[key].values[y] = 0;
        avgCounter[key][y] = 0;
      });

    }
    

    config.yAxis.forEach(y => {

      const value = Number(row[y]) || 0;
      const agg=config.aggregation.trim().toLowerCase()

      switch (agg) {

        case "sum":
          grouped[key].values[y] += value;
          break;

        case "count":
          grouped[key].values[y] += 1;
          break;

        case "avg":
          grouped[key].values[y] += value;
          avgCounter[key][y] += 1;
          break;
        case "max":
          grouped[key].values[y]=Math.max(value,grouped[key].values[y]);
          break;
        case "min":
          grouped[key].values[y]=Math.min(value,grouped[key].values[y]);
          break;
          

        default:
          grouped[key].values[y] += value;
      }

    });

  });


  if (config.aggregation === "avg") {

    Object.keys(grouped).forEach(key => {

      config.yAxis.forEach(y => {

        grouped[key].values[y] =
          grouped[key].values[y] / (avgCounter[key][y] || 1);

      });

    });

  }
  

  return Object.values(grouped);
}


function buildChartData(data, config) {
  const labels = data.map(d => d.label);
  const datasets = config.yAxis.map(field => ({
    label: field,
    data: data.map(d => d.values[field])
  }));

  return {
    labels,
    datasets
  };
}

export const deleteGraph=async(req,res,next)=>{
  try{
    const {graphId}=req.params;
    const result=await Graph.deleteOne({_id:graphId});
    if(result.deletedCount===0){
      console.log("asdfasdfdsfsdf",graphId);
      res.status(404).json({success:false,message:"Graph not found"});
    }
    res.json({success:true,message:"graph deleted successfully"})

  }catch(error){
    console.log("error",error);
    res.status(500).json({success:false,message:"Internal Server Error"});

  }
}
// Services/dbQueryService.js
// 
// Executes LLM-generated queries against the target database.
//
// Safety guarantees:
//   • SQL: only SELECT statements allowed — refuses INSERT/UPDATE/DELETE/DROP etc.
//   • MongoDB: blocks $out and $merge pipeline stages.
//   • Results truncated to MAX_ROWS (50) to stay within LLM context limits.
//
// Exports:
//   executeQuery(dbType, credentials, parsedQuery)
//   buildSchemaContext(dbType, tableName, availableFields)
//

import mysql from "mysql2/promise";
import { Client } from "pg";
import mongoose from "mongoose";

const MAX_ROWS = 50;

function validateSQL(query) {
  let q = query.trim().replace(/\s+/g, " ");
  if (!q.toLowerCase().startsWith("select ") && !q.toLowerCase().startsWith("select\n")) {
    throw new Error("Only SELECT queries are permitted.");
  }
  const blocked = ["drop ", "delete ", "insert ", "update ", "alter ", "create ", "truncate ", "exec(", "execute(", "xp_", "sp_"];
  for (const kw of blocked) {
    if (q.toLowerCase().includes(kw)) throw new Error(`Forbidden keyword: "${kw.trim()}"`);
  }
  if (!/\blimit\s+\d+/i.test(q)) {
    q = q.replace(/;?\s*$/, "") + " LIMIT 50";
  }
  return q;
}



export async function executeQuery(dbType, credentials, parsedQuery) {
  if (dbType === "mysql") {
    let sql;
    try { sql = validateSQL(parsedQuery.query); }
    catch (e) { return { success: false, error: e.message }; }

    const conn = await mysql.createConnection({
      host:     credentials.host,
      port:     credentials.port || 3306,
      user:     credentials.user,
      password: credentials.password,
      database: credentials.database,
    });
    try {
      const [rows] = await conn.execute(sql);
      const truncated = rows.slice(0, MAX_ROWS);
      return { success: true, data: truncated, rowCount: rows.length, truncated: rows.length > MAX_ROWS };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      await conn.end();
    }
  }

   if (dbType === "postgresql") {
    let sql;
    try { sql = validateSQL(parsedQuery.query); }
    catch (e) { return { success: false, error: e.message }; }

    const client = new Client({
      host:     credentials.host,
      port:     credentials.port || 5432,
      user:     credentials.user,
      password: credentials.password,
      database: credentials.database,
    });
    await client.connect();
    try {
      const result = await client.query(sql);
      const truncated = result.rows.slice(0, MAX_ROWS);
      return { success: true, data: truncated, rowCount: result.rows.length, truncated: result.rows.length > MAX_ROWS };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      await client.end();
    }
  }

  if (dbType === "mongodb") {
    const { collection, pipeline } = parsedQuery;

    if (!collection || !Array.isArray(pipeline)) {
      return { success: false, error: "MongoDB query must have { type: 'mongo', collection, pipeline: [] }" };
    }

    const dangerous = pipeline.filter((s) => s.$out !== undefined || s.$merge !== undefined);
    if (dangerous.length) {
      return { success: false, error: "$out and $merge stages are not permitted." };
    }

    const uri  = credentials.uri || `mongodb://${credentials.host}:${credentials.port || 27017}/${credentials.database}`;
    const conn = await mongoose.createConnection(uri).asPromise();
    try {
      const docs = await conn.db.collection(collection).aggregate([...pipeline, { $limit: MAX_ROWS }]).toArray();
      return { success: true, data: docs, rowCount: docs.length, truncated: false };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      await conn.close();
    }
  }

  // ── API ──────────────────────────────────────────────────────────────────
  if (dbType === "api") {
    return { success: false, error: "Executing custom queries on API data sources is not supported." };
  }

  return { success: false, error: `Unknown database type: ${dbType}` };
}


export function buildSchemaContext(dbType, tableName, availableFields) {
  const fieldList = (availableFields || []).join(", ");

  if (dbType === "mysql") {
    return `Database: MySQL\nTable: \`${tableName}\`\nAvailable fields: ${fieldList}`;
  }
  if (dbType === "postgresql") {
    return `Database: PostgreSQL\nTable: "${tableName}"\nAvailable fields: ${fieldList}`;
  }
  if (dbType === "mongodb") {
    return `Database: MongoDB\nCollection: "${tableName}"\nAvailable fields: ${fieldList}\n` +
      `Note: Queries must be MongoDB aggregation pipelines in JSON format.`;
  }
  return `Database: API\nAvailable fields: ${fieldList}`;
}
import mysql from "mysql2/promise";
import pg from "pg";
import mongoose from "mongoose";

const { Client } = pg;

export async function testConnection(dbType, credentials) {
  console.log("Testing connection with dbType:", dbType, "credentials:", credentials);
  try {
    switch (dbType) {
      case "mysql": {
        const connection = await mysql.createConnection({
          host: credentials.host,
          port: credentials.port || 3306,
          user: credentials.user,
          password: credentials.password,
          database: credentials.database,
        });
        await connection.end();
        return { success: true };
      }
      case "postgresql": {
        const pgClient = new Client({
          host: credentials.host,
          port: credentials.port || 5432,
          user: credentials.user,
          password: credentials.password,
          database: credentials.database,
        });
        await pgClient.connect();
        await pgClient.end();
        return { success: true };
      }
      case "mongodb": {
         let mongoUri = credentials.uri;

        if (!mongoUri) {
          if (credentials.user && credentials.password) {
            mongoUri = `mongodb://${encodeURIComponent(
              credentials.user
            )}:${encodeURIComponent(credentials.password)}@${credentials.host}:${credentials.port || 27017}/${credentials.database}`;
          } else {
            mongoUri = `mongodb://${credentials.host}:${credentials.port || 27017}/${credentials.database}`;
          }
        }
        const conn = await mongoose.createConnection(mongoUri, {
          serverSelectionTimeoutMS: 5000,
        });
        console.log("MongoDB connection test successful");
        // await conn.db.admin().ping();
        await conn.close();

        return { success: true };
      }
      case "api": {
        let apiUrl = credentials.uri;
        if (!apiUrl) {
          throw new Error("API URL is required");
        } 
        fetch("https://fakestoreapi.com/products")
          .then(response => {
            if (response.ok) {
              console.log("✅ API is working fine!");
            } else {
              console.log("❌ API responded but with error:", response.status);
            }
          })
          .catch(error => {
            console.log("❌ API connection failed:", error.message);
          });

        return { success: true };
      }
      default:
        throw new Error("Unsupported database type");
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getTables(dbType, credentials) {
  try {
    switch (dbType) {
      case "mysql": {
        const mysqlConn = await mysql.createConnection({
          host: credentials.host,
          port: credentials.port || 3306,
          user: credentials.user,
          password: credentials.password,
          database: credentials.database,
        });
        const [tables] = await mysqlConn.execute("SHOW TABLES");
        const tableNames = tables.map((row) => Object.values(row)[0]);
        const tablesWithFields = {};
        for (const tableName of tableNames) {
          const [fields] = await mysqlConn.execute(`DESCRIBE ${tableName}`);
          tablesWithFields[tableName] = fields.map((f) => f.Field);
        }
        await mysqlConn.end();
        return { success: true, tables: tablesWithFields };
      }
      case "postgresql": {
        const pgClient = new Client({
          host: credentials.host,
          port: credentials.port || 5432,
          user: credentials.user,
          password: credentials.password,
          database: credentials.database,
        });
        await pgClient.connect();
        const tablesRes = await pgClient.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        );
        const tableNames = tablesRes.rows.map((r) => r.table_name);
        const tablesWithFields = {};
        for (const tableName of tableNames) {
          const fieldsRes = await pgClient.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
            [tableName]
          );
          tablesWithFields[tableName] = fieldsRes.rows.map((r) => r.column_name);
        }
        await pgClient.end();
        return { success: true, tables: tablesWithFields };
      }
      case "mongodb": {
        let conn;
        // try {
          const uri =
            credentials.uri ||
            (credentials.user && credentials.password
              ? `mongodb://${credentials.user}:${credentials.password}@${credentials.host}:${credentials.port || 27017}/${credentials.database}`
              : `mongodb://${credentials.host}:${credentials.port || 27017}/${credentials.database}`);
            conn = mongoose.createConnection(uri, {
            serverSelectionTimeoutMS: 5000,
            });

            await conn.asPromise();

            console.log("Connected to MongoDB, fetching collections...");

            const db = conn.db;

          // 4️⃣ Fetch collections
            const collections = await db.listCollections().toArray();

            const tablesWithFields = {};

            for (const coll of collections) {
            const sampleDoc = await db.collection(coll.name).findOne({});

            // Send fields to frontend
            tablesWithFields[coll.name] = sampleDoc
              ? Object.keys(sampleDoc)
              : [];
            }

            return { success: true, tables: tablesWithFields };
          }
      case "api": {
        const response = await fetch(credentials.uri, {
          method: credentials.method || "GET",
          headers: credentials.headers || {},
        } );

          if (!response.ok) {
            throw new Error("API connection failed");
          }

          const data = await response.json();

          const Fields = [];
          // console.log("Raw API data:", data);
          const objectData = Array.isArray(data) ? data[0] : data;
          if (objectData && typeof objectData === "object") {
            Object.keys(objectData).forEach((key) => {  
              Fields.push(key);
            });
          // console.log("Extracted fields from API data:", Fields);

          return {
            success: true,
            Fields: Fields
          };
        
          }
        }
      default:
        throw new Error("Unsupported database type");
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function importTableData(dbType, credentials, tableName, selectedFields) {
  try {
    switch (dbType) {
      case "mysql": {
        const mysqlConn = await mysql.createConnection({
          host: credentials.host,
          port: credentials.port || 3306,
          user: credentials.user,
          password: credentials.password,
          database: credentials.database,
        });
        const fieldsStr = selectedFields.length > 0 ? selectedFields.join(", ") : "*";
        const [rows] = await mysqlConn.execute(`SELECT ${fieldsStr} FROM ${tableName}`);
        await mysqlConn.end();
        return {
          success: true,
          data: rows,
          rowCount: rows.length,
          columnCount: selectedFields.length || (rows[0] ? Object.keys(rows[0]).length : 0),
        };
      }
      case "postgresql": {
        const pgClient = new Client({
          host: credentials.host,
          port: credentials.port || 5432,
          user: credentials.user,
          password: credentials.password,
          database: credentials.database,
        });
        await pgClient.connect();
        const fieldsStr = selectedFields.length > 0 ? selectedFields.map((f) => `"${f}"`).join(", ") : "*";
        const result = await pgClient.query(`SELECT ${fieldsStr} FROM "${tableName}"`);
        await pgClient.end();
        return {
          success: true,
          data: result.rows,
          rowCount: result.rows.length,
          columnCount: selectedFields.length || (result.rows[0] ? Object.keys(result.rows[0]).length : 0),
        };
      }
      // case "mongodb": {
      //   const uri = credentials.uri || `mongodb://${credentials.host}:${credentials.port || 27017}/${credentials.database}`;
      //   let conn;
      //   if (credentials.user && credentials.password) {
      //     const authUri = `mongodb://${credentials.user}:${credentials.password}@${credentials.host}:${credentials.port || 27017}/${credentials.database}`;
      //     conn = await mongoose.connect(authUri);
      //   } else {
      //     conn = await mongoose.connect(uri);
      //   }
      //   const db = mongoose.connection.db;
      //   let query = {};
      //   let projection = {};
      //   if (selectedFields.length > 0) {
      //     selectedFields.forEach((field) => {
      //       projection[field] = 1;
      //     });
      //   }
      //   const docs = await db.collection(tableName).find(query, { projection }).toArray();
      //   await mongoose.disconnect();
      //   return {
      //     success: true,
      //     data: docs,
      //     rowCount: docs.length,
      //     columnCount: selectedFields.length || (docs[0] ? Object.keys(docs[0]).length : 0),
      //   };
      // }
      case "mongodb": {
  const uri =
    credentials.uri ||
    `mongodb://${credentials.host}:${credentials.port || 27017}/${credentials.database}`;

  let conn;

  if (credentials.user && credentials.password) {
    const authUri = `mongodb://${encodeURIComponent(
      credentials.user
    )}:${encodeURIComponent(credentials.password)}@${
      credentials.host
    }:${credentials.port || 27017}/${credentials.database}`;

    conn = await mongoose.createConnection(authUri, {
      serverSelectionTimeoutMS: 5000,
    }).asPromise();
  } else {
    conn = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 5000,
    }).asPromise();
  }

  const db = conn.db;

  // Projection handling
  const projection = {};
  if (selectedFields.length > 0) {
    selectedFields.forEach((field) => {
      projection[field] = 1;
    });
  }

  const docs = await db
    .collection(tableName)
    .find({}, selectedFields.length > 0 ? { projection } : {})
    .toArray();

  await conn.close(); // 🔥 IMPORTANT: close only this connection

  return {
    success: true,
    data: docs,
    rowCount: docs.length,
    columnCount:
      selectedFields.length ||
      (docs[0] ? Object.keys(docs[0]).length : 0),
  };
}
    case "api": {
      // use the connection credentials to build the request
      const { uri, method = "GET", headers = {}, queryParams = {} } = credentials;
      if (!uri) {
        throw new Error("API URI is required");
      }

      const finalUrl = new URL(uri);
      Object.entries(queryParams).forEach(([key, value]) => {
        finalUrl.searchParams.append(key, value);
      });

      const response = await fetch(finalUrl.toString(), {
        method,
        headers,
      });

      if (!response.ok) {
        throw new Error(`API request failed with ${response.status}`);
      }

      const rawData = await response.json();
      const docs = Array.isArray(rawData)
        ? rawData
        : rawData.data || [rawData];

      let finalDocs = docs;
      if (selectedFields.length > 0) {
        finalDocs = docs.map((doc) => {
          const filtered = {};
          selectedFields.forEach((field) => {
            if (field in doc) {
              filtered[field] = doc[field];
            }
          });
          return filtered;
        });
      }

      const columnCount =
        selectedFields.length ||
        (finalDocs[0] ? Object.keys(finalDocs[0]).length : 0);

      return {
        success: true,
        table: tableName || "API",
        data: finalDocs,
        rowCount: finalDocs.length,
        columnCount,
      };
    }

      default:
        throw new Error("Unsupported database type");
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

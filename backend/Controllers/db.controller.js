import DBConnection from "../Models/Database.js";
import Table from "../Models/Tables.js";
import Graph from "../Models/Graph.js";
import { testConnection, getTables, importTableData } from "../Services/dbConnectionService.js";

export const testDbConnection = async (req, res) => {
  try {
    // console.log("Testing DB connection with data:", req.body);
    const { dbType, credentials } = req.body;
    const result = await testConnection(dbType, credentials);
    if (result.success) {
      res.json({ success: true, message: "Connection successful" });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.log("Error testing DB connection:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveConnection = async (req, res) => {
  try {
    console.log("Saving DB connection with data:", req);
    const { dbType, credentials, connectionName } = req.body;
    const userId = req.userId;
    // con
    const testResult = await testConnection(dbType, credentials);
    if (!testResult.success) {
      console.log("Connection test failed:", testResult.error);
      return res.status(400).json({ success: false, message: testResult.error });
    }

    const connection = new DBConnection({
      userId,
      dbtype: dbType,
      credentials,
      connectionName: connectionName || "",
    });
    await connection.save();

    res.json({ success: true, connection });
  } catch (error) {
    console.log("Error saving DB connection:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getConnections = async (req, res) => {
  try {
    const userId = req.userId;
    const connections = await DBConnection.find({ userId, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, connections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateConnectionName = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { connectionName } = req.body;
    const userId = req.userId;

    const connection = await DBConnection.findOne({ _id: connectionId, userId });
    if (!connection) {
      return res.status(404).json({ success: false, message: "Connection not found" });
    }

    connection.connectionName = connectionName;
    await connection.save();

    res.json({ success: true, connection });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTablesFromDb = async (req, res) => {
  try {

    const { connectionId } = req.params;
    const userId = req.userId;
    // console.log("Fetching tables for connectionId:", connectionId, "userId:", userId);
    const connection = await DBConnection.findOne({ _id: connectionId, userId });
    if (!connection) {
      return res.status(404).json({ success: false, message: "Connection not found" });
    }

    const result = await getTables(connection.dbtype, connection.credentials);
    if (result.success) {
      res.json({ success: true, tables: result.tables });
    } else {
      console.log("Error fetching tables:93 ", result.error);
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const getTableFromAPI = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.userId;
    // console.log("Fetching tables from API for connectionId:", connectionId, "userId:", userId);
    const connection = await DBConnection.findOne({ _id: connectionId, userId });

    if (!connection) {
      return res.status(404).json({ success: false, message: "Connection not found" });
    }
    const result = await getTables(connection.dbtype, connection.credentials, true);
    if (result.success) {
      res.json({ success: true, Fields: result.Fields });
    }
      else {
      // console.log("Error fetching tables from API: ", result.error);
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const importAPITable = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.userId;
    // console.log("Importing API data for connectionId:", connectionId, "userId:", userId);
    const connection = await

      DBConnection.findOne({ _id: connectionId, userId });
    if (!connection) {
      return res.status(404).json({ success: false, message: "Connection not found" });
    }
    const result = await importTableData(connection.dbtype, connection.credentials, null, null, true);
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      console.log("Error importing API data: ", result.error);
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.log("Error importing API data: ", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const importTable = async (req, res) => {
  try {
    const { connectionId, tableName, selectedFields, displayName } = req.body;
    const userId = req.userId;
    // console.log("Importing table metadata:", req.body);

    const connection = await DBConnection.findOne({ _id: connectionId, userId });
    if (!connection) {
      return res.status(404).json({ success: false, message: "Connection not found" });
    }

    const result = await importTableData(connection.dbtype, connection.credentials, tableName, selectedFields || []);
    if (!result.success) {
      console.log("not success",result.error);
      return res.status(400).json({ success: false, message: result.error });
    }

    const table = new Table({
      connectionId,
      userId,
      tableName,
      displayName: displayName || tableName,
      databaseType: connection.dbtype,
      selectedFields: selectedFields || [],
      totalRowCount: result.rowCount,
      columnCount: result.columnCount,
    });
    await table.save();
    console.log("table",table);
    res.json({ success: true, table });
  } catch (error) {
    console.log("error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getImportedTables = async (req, res) => {
  try {
    const userId = req.userId;
    const tables = await Table.find({ userId })
      .populate("connectionId", "connectionName dbtype")
      .sort({ createdAt: -1 });
    res.json({ success: true, tables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTableData = async (req, res) => {
  try {
    const { tableId } = req.params;
    const userId = req.userId;

    const table = await Table.findOne({ _id: tableId, userId }).populate(
      "connectionId",
      "connectionName dbtype credentials"
    );
    if (!table) {
      return res.status(404).json({ success: false, message: "Table not found" });
    }
    console.log("Fetched table metadata for tableId:", tableId);
    res.json({ success: true, table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTableRows = async (req, res) => {
  try {
    
    const { tableId } = req.params;
    const { page = 1, pageSize = 10 } = req.query;
    const userId = req.userId;
    const table = await Table.findOne({ _id: tableId, userId }).populate(
      "connectionId",
      "dbtype credentials"
    );
    if (!table) {
      return res.status(404).json({ success: false, message: "Table not found" });
    }

    const { getTableRowsWithPagination } = await import(
      "../Services/dbConnectionService.js"
    );
    // console.log("table credentials",table);
    const result = await getTableRowsWithPagination(
      table.databaseType,
      table.connectionId.credentials,
      table.tableName,
      table.selectedFields,
      parseInt(page),
      parseInt(pageSize)
    );
    // console.log("result",result);

    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      rows: result.data,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalRows: table.totalRowCount,
      hasMore: page * pageSize < table.totalRowCount,
    });
  } catch (error) {
    console.log("Error fetching table rows:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTableName = async (req, res) => {
  try {
    const { tableId } = req.params;
    const { displayName } = req.body;
    const userId = req.userId;

    const table = await Table.findOne({ _id: tableId, userId });
    if (!table) {
      return res.status(404).json({ success: false, message: "Table not found" });
    }

    table.displayName = displayName;
    await table.save();

    res.json({ success: true, table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteConnection = async (req, res) => {
  try {
    const { connectionId } = req.body;
    const tables = await Table.find({ connectionId });
    const deletedTableIds = tables.map((t) => t._id.toString());

    await Graph.deleteMany({ tableId: { $in: deletedTableIds } });
    await Table.deleteMany({ connectionId });
    const result =await DBConnection.findOneAndDelete({ _id: connectionId });
   
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Connection not found" });
    }

    res.json({ success: true, connectionId,deletedTableIds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTable =async(req,res)=>{
  try{
    const {tableId}=req.params
    await Graph.deleteMany({tableId});
    const result=await Table.deleteOne({_id:tableId});
    if(result.deletedCount===0){
      return res.status(404).json({success:false,message:"Table not found"});
    }
    res.json({success:true,tableId});

  }catch(error){
    res.status(500).json({success:false,message:error.message});

  }
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import Graph from "../Models/Graph.js";
import Table from "../Models/Tables.js";
import DBConnection from "../Models/Database.js";
import ChatSession from "../Models/chatSession.js";
import { executeQuery, buildSchemaContext } from "../Services/dbQueryService.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model  = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

function buildQueryGenPrompt({ schemaContext, graphContext, history, userMessage }) {
  const historyLines = history
    .map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.content}`)
    .join("\n");

  return `You are a database expert embedded in a data-visualization dashboard.
        === DATABASE SCHEMA ===
        ${schemaContext}
        === CURRENT GRAPH CONFIGURATION ===
        ${graphContext}
        === RECENT CONVERSATION ===
        ${historyLines || "(no prior conversation)"}
        === TASK ===
        The user asked: "${userMessage}"
        Generate a safe, read-only database query to answer this question.
        OUTPUT FORMAT — respond ONLY with valid JSON (no markdown, no explanation outside JSON):
        {
          "canAnswer": true,
          "type": "sql",
          "query": "SELECT ...",
          "explanation": "one-line summary of what this query retrieves",
          "error": null
        }
        RULES:
        - For MySQL / PostgreSQL: "type" = "sql". "query" must be a SELECT statement only.
          Never use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, EXEC.
          Always add LIMIT 50 to the query.
        - For MongoDB: "type" = "mongo". "query" must be a JSON object:
          { "collection": "<tableName>", "pipeline": [ ... ] }
          Do NOT include $out or $merge stages.
          Add { "$limit": 50 } as the last pipeline stage.
        - Use ONLY the available fields listed in DATABASE SCHEMA.
        - If the question cannot be answered with a database query (e.g. it is a general
          question about the chart or a follow-up that needs no data), set:
          "canAnswer": false, "type": null, "query": null, "explanation": "<your direct answer>", "error": null
        - If the question is harmful or requests destructive operations, set:
          "canAnswer": false, "type": null, "query": null, "explanation": null,
          "error": "Refused: <reason>"`;
        }

function buildAnswerGenPrompt({ schemaContext, graphContext, history, userMessage, executedQuery, queryResults, queryError }) {
  const historyLines = history
    .map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.content}`)
    .join("\n");

  const resultsSection = queryError
    ? `The query failed with error: ${queryError}\n(Answer using your general knowledge of the graph config.)`
    : `Query executed: ${executedQuery}\n\nResults (up to 50 rows):\n${JSON.stringify(queryResults, null, 2)}`;

  return `You are an expert data analyst embedded in a data-visualization dashboard.
        === DATABASE SCHEMA ===
        ${schemaContext}
        === CURRENT GRAPH CONFIGURATION ===
        ${graphContext}
        === RECENT CONVERSATION ===
        ${historyLines || "(no prior conversation)"}
        === DATA RETRIEVED FOR THIS QUESTION ===
        ${resultsSection}
        === TASK ===
        Answer the user's question clearly and concisely using the data above.
        USER: ${userMessage}
        ASSISTANT:

        Guidelines:
        - Lead with the direct answer, then support it with data.
        - Use bullet points for lists of values or comparisons.
        - Round numbers sensibly (2 decimal places max).
        - If you spot a trend or anomaly, mention it.
        - Do NOT invent data not present in the results.
        - If the results are empty, say so and explain what that likely means.
        - Keep answers under ~200 words unless detail is truly needed.
        - If the user asks to change the chart (rowLimit, filters, sortBy, etc.), append:
        \`\`\`json
        {"action":"UPDATE_QUERY","changes":{"rowLimit":10}}
        \`\`\`
        Allowed keys for changes: rowLimit, rowSelection, sortBy, filters.`;
        }

  function buildGraphContext(graph) {
        return [
          `Chart Type    : ${graph.chartType}`,
          `X-Axis        : ${graph.xAxis?.join(", ") || "None"}`,
          `Y-Axis        : ${graph.yAxis?.join(", ") || "None"}`,
          `Aggregation   : ${graph.aggregation || "None"}`,
          `Active Filters: ${JSON.stringify(graph.filters ?? [])}`,
          `Row Limit     : ${graph.rowLimit ?? "All rows"}`,
          `Row Selection : ${graph.rowSelection ?? "all"}`,
          `Sort By       : ${graph.sortBy?.field ? `${graph.sortBy.field} (${graph.sortBy.order})` : "Default"}`,
        ].join("\n");
      }

  function extractJsonFromText(text) {
      if (!text || typeof text !== "string") return null;
      const candidate = text.trim();
      const firstBrace = candidate.indexOf("{");
      if (firstBrace === -1) return null;
      const payload = candidate.slice(firstBrace);
      try {
        return JSON.parse(payload);
      } catch {
        const match = payload.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try { return JSON.parse(match[0]); } catch { return null; }
      }
    }

  function enforceSqlLimit(query) {
      const trimmed = query.trim().replace(/;?\s*$/, "");
      if (/\blimit\s+\d+/i.test(trimmed)) return trimmed;
      return `${trimmed} LIMIT 50`;
    }


export const sendMessageStream = async (req, res) => {
  const { graphId, message } = req.body;
  const userId = req.userId;

  // ── SSE setup ──────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const emit = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  try {
    if (!graphId || !message?.trim()) {
      emit({ error: "graphId and message are required." });
      return res.end();
    }

    // ── Load graph, table, connection ────────────────────────────────────
    const graph = await Graph.findOne({ _id: graphId, userId });
    if (!graph) { emit({ error: "Graph not found or access denied." }); return res.end(); }

    const table = await Table.findById(graph.tableId).lean();
    if (!table) { emit({ error: "Table not found." }); return res.end(); }

    const connection = await DBConnection.findById(table.connectionId).lean();
    if (!connection) { emit({ error: "Connection not found." }); return res.end(); }

    // ── Load / create chat session ────────────────────────────────────────
    const session = await ChatSession.findOneAndUpdate(
      { graphId, userId },
      { $setOnInsert: { messages: [], lastIntent: null } },
      { returnDocument: "after", upsert: true }
    );

    const history = session.messages.slice(-8); // last 4 turns
    const schemaContext  = buildSchemaContext(connection.dbtype, table.tableName, table.selectedFields);
    const graphContext   = buildGraphContext(graph);

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 1 — Query generation (non-streaming)
    // ═══════════════════════════════════════════════════════════════════
    emit({ phase: "querying", message: "Generating database query…" });

    let parsedQueryInstruction = null;
    let executedQueryStr       = null;
    let queryResults           = null;
    let queryError             = null;

    try {
      const phase1Prompt = buildQueryGenPrompt({
        schemaContext,
        graphContext,
        history,
        userMessage: message.trim(),
      });

      const phase1Result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: phase1Prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
      });

      const rawJson = phase1Result.response
        .candidates[0].content.parts
        .map((p) => p.text || "")
        .join("")
        .trim();

      console.log("[chat/phase1] Raw LLM JSON:", rawJson);
      const extracted = extractJsonFromText(rawJson);
      if (!extracted) throw new Error("Unable to locate valid JSON in LLM response.");
      parsedQueryInstruction = extracted;
    } catch (err) {
      console.error("[chat/phase1] Failed to parse query instruction:", err);
      emit({ phase: "analyzing", message: "Could not generate a safe query; answering from chart context." });
      // Graceful degradation: skip query execution, answer from context only
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 2 — Execute the LLM-generated query
    // ═══════════════════════════════════════════════════════════════════
    if (parsedQueryInstruction?.canAnswer && parsedQueryInstruction?.query) {
      emit({
        phase:       "analyzing",
        message:     "Running query on your database…",
        explanation: parsedQueryInstruction.explanation,
        query:       typeof parsedQueryInstruction.query === "string"
          ? parsedQueryInstruction.query
          : JSON.stringify(parsedQueryInstruction.query),
      });

      // Parse query into shape executeQuery() expects
      let queryPayload;
      if (parsedQueryInstruction.type === "sql") {
        queryPayload = { type: "sql", query: parsedQueryInstruction.query };
      } else if (parsedQueryInstruction.type === "mongo") {
        // LLM may return the collection+pipeline as a nested object or inline
        const q = typeof parsedQueryInstruction.query === "string"
          ? JSON.parse(parsedQueryInstruction.query)
          : parsedQueryInstruction.query;
        queryPayload = { type: "mongo", collection: q.collection, pipeline: q.pipeline };
      }

      if (queryPayload) {
        const result = await executeQuery(connection.dbtype, connection.credentials, queryPayload);
        if (result.success) {
          queryResults      = result.data;
          executedQueryStr  = typeof queryPayload.query === "string"
            ? queryPayload.query
            : JSON.stringify(queryPayload);
          emit({
            phase:    "results",
            message:  `Query returned ${result.rowCount} row${result.rowCount !== 1 ? "s" : ""}${result.truncated ? " (truncated to 50)" : ""}.`,
            rowCount: result.rowCount,
          });
        } else {
          queryError = result.error;
          console.warn("[chat/phase2] Query execution failed:", result.error);
          emit({ phase: "results", message: `Query failed: ${result.error}` });
        }
      }
    } else if (parsedQueryInstruction?.canAnswer === false && parsedQueryInstruction?.explanation) {
      // LLM decided it can answer without a query (e.g. general chart question)
      // We'll still run phase 3 so the answer is streamed normally
      emit({ phase: "analyzing", message: "Analysing chart context…" });
    } else if (!parsedQueryInstruction) {
      // No valid query could be parsed; continue with answer generation from context.
      emit({ phase: "analyzing", message: "Preparing context for the answer…" });
    }

    emit({ phase: "streaming", message: "Generating answer…" });

    const phase3Prompt = buildAnswerGenPrompt({
      schemaContext,
      graphContext,
      history,
      userMessage:   message.trim(),
      executedQuery: executedQueryStr,
      queryResults,
      queryError,
    });

    const streamResult = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: phase3Prompt }] }],
      generationConfig: { temperature: 0.45, maxOutputTokens: 700 },
    });

    let fullAnswer = "";
    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) {
        fullAnswer += text;
        emit({ content: text });
      }
    }

    session.messages.push(
      { role: "user",      content: message.trim(), timestamp: new Date() },
      { role: "assistant", content: fullAnswer,      timestamp: new Date() }
    );
    if (session.messages.length > 100) session.messages = session.messages.slice(-100);
    await session.save();

    emit({ done: true });
    res.end();
  } catch (err) {
    console.error("[chat/stream]", err);
    emit({ error: "AI service error. Please try again." });
    res.end();
  }
};


export const getChatHistory = async (req, res) => {
  try {
    const { graphId } = req.params;
    const userId = req.userId;

    const graph = await Graph.findOne({ _id: graphId, userId }).lean();
    if (!graph) return res.status(403).json({ message: "Access denied." });

    const session = await ChatSession.findOne({ graphId, userId }).lean();
    return res.json({ messages: session?.messages ?? [] });
  } catch (err) {
    console.error("[chat/history]", err);
    return res.status(500).json({ message: "Server error." });
  }
};

export const clearChatHistory = async (req, res) => {
  try {
    const { graphId } = req.body;
    const userId = req.userId;

    const graph = await Graph.findOne({ _id: graphId, userId }).lean();
    if (!graph) return res.status(403).json({ message: "Access denied." });

    await ChatSession.findOneAndUpdate(
      { graphId, userId },
      { messages: [], lastIntent: null }
    );
    return res.json({ message: "Chat cleared." });
  } catch (err) {
    console.error("[chat/clear]", err);
    return res.status(500).json({ message: "Server error." });
  }
};
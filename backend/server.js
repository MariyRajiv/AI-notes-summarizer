import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer"; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN }));
app.use(express.json({ limit: "4mb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// OpenAI-compatible client
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.PUBLIC_BASE_URL || "http://localhost:" + PORT,
    "X-Title": process.env.APP_TITLE || "AI Meeting Notes"
  }
});

const shares = new Map();

// AI summary endpoint
app.post("/api/summarize", async (req, res) => {
  try {
    const { transcript, instruction } = req.body || {};
    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 10) {
      return res.status(400).json({ error: "Provide a transcript with at least 10 characters." });
    }

    const userInstruction = typeof instruction === "string" && instruction.trim().length > 0
      ? instruction.trim()
      : "Summarize the following transcript into concise bullet points. Include an 'Action Items' section at the end.";

    const systemPrompt = `You are an assistant that writes clean, structured, business-ready meeting summaries.
- Follow the user's instruction style strictly.
- Prefer bullet points, section headers, and clear action items with owners and due dates when available.
- Keep it concise but complete.
- If transcript seems like a call transcript, infer participants and summarize decisions.`;

    const userPrompt = `Instruction: ${userInstruction}

Transcript:
-----------------
${transcript}
-----------------`;

    const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-r1:free";

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const summary = completion?.choices?.[0]?.message?.content?.trim();
    if (!summary) {
      return res.status(500).json({ error: "No summary generated." });
    }

    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Failed to generate summary" });
  }
});

// Create share link
app.post("/api/create-share", (req, res) => {
  const { content } = req.body || {};
  if (!content || typeof content !== "string") {
    return res.status(400).json({ error: "content (string) is required" });
  }
  const id = uuidv4();
  shares.set(id, { content, createdAt: Date.now() });
  const base = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
  res.json({ id, url: `${base}/share/${id}` });
});

// View share
app.get("/share/:id", (req, res) => {
  const { id } = req.params;
  const entry = shares.get(id);
  if (!entry) {
    return res.status(404).send("<h1>Not Found</h1><p>This share link is invalid or expired.</p>");
  }
  const escape = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Shared Summary</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 40px; }
      pre { white-space: pre-wrap; word-wrap: break-word; }
      .wrap { max-width: 900px; margin: 0 auto; }
      .card { border: 1px solid #ddd; border-radius: 10px; padding: 16px; }
      .muted { color: #666; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Shared Summary</h1>
      <div class="card">
        <pre>${escape(entry.content)}</pre>
      </div>
      <p class="muted">Created: ${new Date(entry.createdAt).toLocaleString()}</p>
    </div>
  </body>
  </html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// ✅ Send email using Nodemailer
app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, content } = req.body || {};
    if (!to || !content) {
      return res.status(400).json({ error: "Fields 'to' and 'content' are required." });
    }

    const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});


    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: subject || "Meeting Summary",
      text: content
    });

    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error("Mail error:", err);
    res.status(500).json({ error: err?.message || "Failed to send email" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

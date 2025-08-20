import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

// CORS config
app.use(
  cors({
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "4mb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ✅ Hugging Face Summarization
// ✅ Hugging Face Summarization
async function summarizeWithHF(text) {
  const model = process.env.HF_MODEL || "facebook/bart-large-cnn";
  const url = `https://api-inference.huggingface.co/models/${model}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: text,   // ✅ only "inputs"
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HF API failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (Array.isArray(data) && data[0]?.summary_text) {
    return data[0].summary_text;
  }
  return JSON.stringify(data); // fallback
}


// ✅ Summarize API
app.post("/api/summarize", async (req, res) => {
  try {
    const { transcript, instruction } = req.body || {};
    if (!transcript || transcript.trim().length < 10) {
      return res.status(400).json({ error: "Transcript too short." });
    }

    const instructionText =
      instruction?.trim() || "Summarize the following transcript.";

    const combinedText = `${instructionText}\n\n${transcript}`;
    const summary = await summarizeWithHF(combinedText);

    res.json({ summary });
  } catch (err) {
    console.error("Summarize error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Email Share API (matches frontend route)
app.post("/api/send-email", async (req, res) => {
  try {
    const { email, summary } = req.body;
    if (!email || !summary) {
      return res.status(400).json({ error: "Email and summary required." });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "AI Meeting Notes Summary",
      text: summary,
    });

    res.json({ success: true, message: "Email sent successfully!" });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ error: "Failed to send email." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

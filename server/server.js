import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load fake data
const catalogPath = path.join(__dirname, "json", "course_catalog.json");
const studentPath = path.join(__dirname, "json", "student_schedule.json");

const classesCatalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
const studentSchedule = JSON.parse(fs.readFileSync(studentPath, "utf-8"));

const studentClasses = classesCatalog.filter((c) =>
  studentSchedule.classes.includes(c.id)
);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- Gemini setup ---
if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is missing in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Test route
app.get("/", (req, res) => {
  res.send("Express + Gemini server is running");
});

// Chat route
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required." });
    }

    const systemPrompt = `
    You are a direct, concise schedule helper.

    There is a catalog of all available classes:
    ${JSON.stringify(classesCatalog, null, 2)}

    The student is currently enrolled in these classes (subset of the catalog):
    ${JSON.stringify(studentClasses, null, 2)}

    INTERPRETATION RULES:
    - When the user says "my classes" or "my schedule", use the enrolled list above.
    - When they ask about "other classes" or "what else is offered", you may reference the full catalog.
    - When suggesting study blocks, avoid conflicts with the student's enrolled classes.
    - If the student suggests adding something that conflicts, point out the conflict clearly.

    STYLE RULES:
    - Be brief and direct.
    - Do not introduce yourself unless asked.
    - Keep responses focused on scheduling, classes, and time management.
    - Ask follow-up questions only when necessary.
        
    FORMAT RULES (IMPORTANT):
    - When the user asks to SHOW or LIST classes or the schedule, respond in this format:

    [one short intro sentence]
    <table> ... </table>

    - The intro sentence must be simple and direct, such as:
    - "Here is your weekly schedule:"
    - "Here are the classes you're taking:"
    - "Here are the available classes without conflicts:"
    - "Here are the classes you asked about:"

    - After the intro sentence, output ONLY raw HTML for the table.
    - Do NOT wrap the table in backticks, Markdown, or quotes.
    - Do NOT put anything AFTER the table (no summaries, no advice — the table should be the last part).

    - Use this exact structure for the table:

    <table>
    <tr>
        <th>Course</th>
        <th>Name</th>
        <th>Days</th>
        <th>Time</th>
        <th>Location</th>
    </tr>
    <tr>
        <td>ENGR110</td>
        <td>Introduction to Engineering Design</td>
        <td>Mon & Wed</td>
        <td>10:00 AM – 11:15 AM</td>
        <td>ELC Room 204</td>
    </tr>
    </table>

    NO explanations, NO backticks, NO formatting around it.
    Just the table.
    `;

    const historyText = (history || [])
      .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
      .join("\n");

    const fullPrompt = `
${systemPrompt}

CHAT SO FAR:
${historyText}

USER: ${message}
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const replyText = response.text();

    res.json({ reply: replyText });
  } catch (err) {
    console.error("Error in /api/chat:", err);
    res.status(500).json({ error: "Failed to contact Gemini API" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

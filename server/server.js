import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Conversation from "./models/conversation.model.js";
import User from "./models/user.model.js";
import Course from "./models/course.model.js";
import StudentSchedule from "./models/studentSchedule.model.js";

const DEMO_USER_ID = "demo-student-001";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const { message, history, conversationId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required." });
    }

    // ------------------------------------------------------------
    // 1) Find or create conversation (scoped to user)
    // ------------------------------------------------------------
    let convo = null;

    if (conversationId) {
      try {
        convo = await Conversation.findOne({
          _id: conversationId,
          userId: DEMO_USER_ID,
        });
      } catch {
        // ignore invalid id
      }
    }

    if (!convo) {
      const shortTitle =
        message.length > 40
          ? message.slice(0, 37) + "..."
          : message || "New Chat";

      convo = new Conversation({
        userId: DEMO_USER_ID, // SET OWNER THIS IS SET TO ALWAYS DUMMY USER
        title: shortTitle,
        messages: [],
      });
    }

    // Add the current user message to the conversation
    convo.messages.push({ role: "user", content: message });

    // Load all available courses from Mongo
    const classesCatalog = await Course.find({}).lean();

    // Load this student's schedule from Mongo
    const currentSchedule = await StudentSchedule.findOne({
      userId: DEMO_USER_ID,
      semester: "Fall 2025", // TODO: make this dynamic
    }).lean();

    // Build student's enrolled classes as full course objects
    let studentClasses = [];
    if (currentSchedule && currentSchedule.classes?.length) {
      const enrolledIds = currentSchedule.classes;
      studentClasses = classesCatalog.filter((c) => enrolledIds.includes(c.id));
    }

    // ------------------------------------------------------------
    // 2) Build the Gemini prompt
    // ------------------------------------------------------------
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
    - If the user just greets you (e.g., "hi", "hello"), respond with a short greeting
      first (e.g., "Hi! How can I help with your schedule today?").

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

    THIS IS MANDATORY: if you show a schedule or list of classes, always include the intro sentence, followed by the table, and nothing after the table.
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

    // ------------------------------------------------------------
    // 3) Save assistant reply to conversation
    // ------------------------------------------------------------
    convo.messages.push({ role: "assistant", content: replyText });
    await convo.save();

    // Send reply + conversationId back
    res.json({
      reply: replyText,
      conversationId: convo._id.toString(),
    });
  } catch (err) {
    console.error("Error in /api/chat:", err);
    res.status(500).json({ error: "Failed to contact Gemini API" });
  }
});

// -----------------------------------------------------------------------------
// Get list of conversations (for sidebar history)
// -----------------------------------------------------------------------------
app.get("/api/conversations", async (req, res) => {
  try {
    const convos = await Conversation.find(
      { userId: DEMO_USER_ID },
      "title updatedAt"
    )
      .sort({ updatedAt: -1 })
      .lean();

    res.json(
      convos.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        updatedAt: c.updatedAt,
      }))
    );
  } catch (err) {
    console.error("Error in GET /api/conversations:", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// -----------------------------------------------------------------------------
// Get a single conversation's messages
// -----------------------------------------------------------------------------
app.get("/api/conversations/:id", async (req, res) => {
  try {
    const convo = await Conversation.findOne({
      _id: req.params.id,
      userId: DEMO_USER_ID,
    });

    if (!convo) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json({
      id: convo._id.toString(),
      title: convo.title,
      messages: convo.messages,
    });
  } catch (err) {
    console.error("Error in GET /api/conversations/:id:", err);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// -----------------------------------------------------------------------------
// Delete a conversation
// -----------------------------------------------------------------------------
app.delete("/api/conversations/:id", async (req, res) => {
  try {
    const deleted = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: DEMO_USER_ID,
    });

    if (!deleted) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.status(204).send();
  } catch (err) {
    console.error("Error deleting conversation:", err);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

// -----------------------------------------------------------------------------
// Get the current student's schedule (with full course details)
// -----------------------------------------------------------------------------
app.get("/api/schedule", async (req, res) => {
  try {
    // For now we use the dummy user; later this becomes req.user.id
    const classesCatalog = await Course.find({}).lean();

    const currentSchedule = await StudentSchedule.findOne({
      userId: DEMO_USER_ID,
      semester: "Fall 2025", // later: make dynamic from query / UI
    }).lean();

    let enrolledCourses = [];

    if (currentSchedule && currentSchedule.classes?.length) {
      const idSet = new Set(currentSchedule.classes);
      enrolledCourses = classesCatalog.filter((c) => idSet.has(c.id));
    }

    res.json({
      semester: currentSchedule?.semester || "Fall 2025",
      classes: enrolledCourses,
    });
  } catch (err) {
    console.error("Error in GET /api/schedule:", err);
    res.status(500).json({ error: "Failed to load schedule" });
  }
});

// add all api endpoints above this line
const PORT = process.env.PORT || 3001;

// Make sure MONGO_URL exists
if (!process.env.MONGO_URL) {
  console.error("MONGO_URL is missing in .env");
  process.exit(1);
}

// Connect to MongoDB and seed JSON to Mongo
mongoose
  .connect(process.env.MONGO_URL)
  .then(async () => {
    console.log("Connected to MongoDB");

    // Create a dummy account if not existing
    let demoUser = await User.findOne({ email: "demo@chat.com" });

    if (!demoUser) {
      demoUser = await User.create({
        email: "demo@chat.com",
        password: "password",
        name: "Demo User",
      });
      console.log("Created demo user:", demoUser._id.toString());
    }

    // Seed catalog and student schedule from JSON (only if needed)
    const catalogPath = path.join(__dirname, "json", "course_catalog.json");
    const studentPath = path.join(__dirname, "json", "student_schedule.json");

    const existingCourseCount = await Course.countDocuments();
    if (existingCourseCount === 0) {
      const catalogData = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
      await Course.insertMany(catalogData);
      console.log(`Seeded ${catalogData.length} courses into MongoDB`);
    }

    const studentJson = JSON.parse(fs.readFileSync(studentPath, "utf-8"));

    let scheduleDoc = await StudentSchedule.findOne({
      userId: DEMO_USER_ID,
      semester: studentJson.semester,
    });

    if (!scheduleDoc) {
      scheduleDoc = await StudentSchedule.create({
        userId: DEMO_USER_ID,
        semester: studentJson.semester,
        classes: studentJson.classes,
      });
      console.log(`Created schedule for demo user ${DEMO_USER_ID}`);
    }

    // Now start server
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });

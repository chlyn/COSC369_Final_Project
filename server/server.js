import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import Conversation from "./models/conversation.model.js";
import User from "./models/user.model.js";
import Course from "./models/course.model.js";
import StudentSchedule from "./models/studentSchedule.model.js";

const DEMO_USER_ID = "demo-student-001";

function getUserIdFromRequest(req) {
  return req.body.userId || req.query.userId || DEMO_USER_ID;
}

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
// Chat route
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, conversationId, userId } = req.body;
    if (!userId) {
      return res.status(401).json({ error: "userId required" });
    }

    const effectiveUserId = userId; // no more demo fallback

    let convo = null;
    if (conversationId) {
      convo = await Conversation.findOne({
        _id: conversationId,
        userId: effectiveUserId,
      });
    }

    if (!convo) {
      const shortTitle =
        message.length > 40
          ? message.slice(0, 37) + "..."
          : message || "New Chat";

      convo = new Conversation({
        userId: effectiveUserId,
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
      userId: effectiveUserId,
      semester: "Fall 2025", // TODO: make this dynamic
    }).lean();

    // Build student's enrolled classes as full course objects (case/format-insensitive)
    let studentClasses = [];
    if (currentSchedule && currentSchedule.classes?.length) {
      const enrolledIdSet = new Set(
        currentSchedule.classes.map((id) => normalizeCourseId(id))
      );

      studentClasses = classesCatalog.filter((c) =>
        enrolledIdSet.has(normalizeCourseId(c.id))
      );
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
  const userId = req.query.userId;
  if (!userId) return res.status(401).json({ error: "userId required" });

  const convos = await Conversation.find({ userId }, "title updatedAt")
    .sort({ updatedAt: -1 })
    .lean();

  res.json(
    convos.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      updatedAt: c.updatedAt,
    }))
  );
});

// -----------------------------------------------------------------------------
// Get a single conversation's messages
// -----------------------------------------------------------------------------
app.get("/api/conversations/:id", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(401).json({ error: "userId required" });

  const convo = await Conversation.findOne({
    _id: req.params.id,
    userId,
  });
  if (!convo) return res.status(404).json({ error: "Conversation not found" });

  res.json({
    id: convo._id.toString(),
    title: convo.title,
    messages: convo.messages,
  });
});

// -----------------------------------------------------------------------------
// Delete a conversation
// -----------------------------------------------------------------------------

app.delete("/api/conversations/:id", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(401).json({ error: "userId required" });

  const deleted = await Conversation.findOneAndDelete({
    _id: req.params.id,
    userId,
  });

  if (!deleted)
    return res.status(404).json({ error: "Conversation not found" });
  res.status(204).send();
});



// -----------------------------------------------------------------------------
// Helper: build a consistent schedule response with full course objects
// -----------------------------------------------------------------------------
function normalizeCourseId(id) {
  return (id || "")
    .toString()
    .trim()
    .toUpperCase()
}

async function buildScheduleResponse(userId, semester = "Fall 2025") {
  const classesCatalog = await Course.find({}).lean();

  const schedule = await StudentSchedule.findOne({
    userId,
    semester,
  }).lean();

  if (!schedule) {
    return {
      semester,
      classes: [],
    };
  }

  const idSet = new Set(
    (schedule.classes || []).map((id) => normalizeCourseId(id))
  );

  const enrolledCourses = classesCatalog.filter((c) =>
    idSet.has(normalizeCourseId(c.id))
  );

  return {
    semester: schedule.semester || semester,
    classes: enrolledCourses,
  };
}


// -----------------------------------------------------------------------------
// Get the current student's schedule (with full course details)
// -----------------------------------------------------------------------------
app.get("/api/schedule", async (req, res) => {
  try {
    const effectiveUserId = req.query.userId || DEMO_USER_ID;

    const payload = await buildScheduleResponse(effectiveUserId, "Fall 2025");
    res.json(payload);
  } catch (err) {
    console.error("Error in GET /api/schedule:", err);
    res.status(500).json({ error: "Failed to load schedule" });
  }
});

// -----------------------------------------------------------------------------
// Add a course to the student's schedule
// -----------------------------------------------------------------------------
app.post("/api/schedule/add", async (req, res) => {
  try {
    let { courseId, semester = "Fall 2025", userId } = req.body;
    const effectiveUserId = userId || DEMO_USER_ID;

    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    // 1) Normalize user input to uppercase, no spaces changed
    const normalizedId = normalizeCourseId(courseId); // e.g. "math301" -> "MATH301"

    // 2) Look for a course with *exactly* that id in Mongo
    const course = await Course.findOne({ id: normalizedId });

    if (!course) {
      console.log(
        "Known course IDs:",
        (await Course.find({}, "id")).map((c) => c.id)
      );
      console.log("User tried to add:", courseId, "→", normalizedId);

      return res
        .status(404)
        .json({ error: `Course '${normalizedId}' was not found.` });
    }

    // 3) Check if student already has this course in their schedule
    let scheduleDoc = await StudentSchedule.findOne({
      userId: effectiveUserId,
      semester,
    });

    if (
      scheduleDoc &&
      (scheduleDoc.classes || []).some(
        (id) => normalizeCourseId(id) === normalizedId
      )
    ) {
      return res
        .status(409)
        .json({ error: "Course already added to your schedule." });
    }

    // 4) Store that uppercase ID in the schedule
    await StudentSchedule.findOneAndUpdate(
      { userId: effectiveUserId, semester },
      { $addToSet: { classes: normalizedId } },
      { new: true, upsert: true }
    );

    // 5) Return full schedule
    const payload = await buildScheduleResponse(effectiveUserId, semester);
    res.json(payload);
  } catch (err) {
    console.error("Error in POST /api/schedule/add:", err);
    res.status(500).json({ error: "Failed to add course" });
  }
});


// -----------------------------------------------------------------------------
// Drop a course from the student's schedule
// -----------------------------------------------------------------------------
app.post("/api/schedule/drop", async (req, res) => {
  try {
    let { courseId, semester = "Fall 2025", userId } = req.body;
    const effectiveUserId = userId || DEMO_USER_ID;

    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    const normalizedId = normalizeCourseId(courseId);

    await StudentSchedule.findOneAndUpdate(
      { userId: effectiveUserId, semester },
      { $pull: { classes: normalizedId } },
      { new: true }
    );

    const payload = await buildScheduleResponse(effectiveUserId, semester);
    res.json(payload);
  } catch (err) {
    console.error("Error in POST /api/schedule/drop:", err);
    res.status(500).json({ error: "Failed to drop course" });
  }
});


// -----------------------------------------------------------------------------
// AUTH: Sign up
// -----------------------------------------------------------------------------
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: normalizedEmail,
      password: hashed,
      name: `${firstName} ${lastName}`.trim(),
    });

    // Optionally create an empty schedule for this user
    await StudentSchedule.create({
      userId: user._id.toString(),
      semester: "Fall 2025",
      classes: [],
    });

    return res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Error in /api/auth/signup:", err);
    return res.status(500).json({ error: "Failed to create account." });
  }
});

// -----------------------------------------------------------------------------
// AUTH: Log in
// -----------------------------------------------------------------------------
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Support both hashed & (older) plain text passwords
    let passwordMatches = false;
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
      passwordMatches = await bcrypt.compare(password, user.password);
    } else {
      // legacy plain-text (only if you already had some test users)
      passwordMatches = password === user.password;
    }

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    return res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Error in /api/auth/login:", err);
    return res.status(500).json({ error: "Failed to log in." });
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
      const hashed = await bcrypt.hash("password", 10);
      demoUser = await User.create({
        email: "demo@chat.com",
        password: hashed,
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

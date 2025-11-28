const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Simple test route
app.get("/", (req, res) => {
  res.send("Express server is running");
});

// Placeholder chat route
app.post("/api/chat", (req, res) => {
  const { message } = req.body;
  console.log("Received message from client:", message);
  res.json({
    reply: `This is a placeholder response for: "${message}"`,
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

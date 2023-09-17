const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { DB } = require("./DB.js");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const db = new DB();

// Express route
app.get("/", (req, res) => {
  res.send("HTTP Server is running.");
});

app.get("/content", async (req, res) => {
  const validKeys = ["shareId", "creator"];
  if (Object.keys(req.query).length === 0) {
    const content = await db.fetchAll("content");
    res.send(content);
    return;
  }
  if (!Object.keys(req.query).every((key) => validKeys.includes(key))) {
    return res.status(400).send("Invalid query.");
  }
  let condition = "1=1"; // Default condition that's always true
  if (req.query.id) {
    condition += ` AND id = ${req.query.id}`;
  } else {
    if (req.query.shareId) {
      condition += ` AND shareId = "${req.query.shareId}"`;
    }
    if (req.query.creator) {
      condition += ` AND creator = "${req.query.creator}"`;
    }
  }

  try {
    const content = await db.fetchOne("content", condition);
    if (content) {
      res.send(content);
    } else {
      res.status(404).send("Content not found.");
    }
  } catch (err) {
    res.status(500).send("Internal server error.");
  }
});

app.get("/users", async (req, res) => {
  const validKeys = ["username", "address"];
  if (Object.keys(req.query).length === 0) {
    const users = await db.fetchAll("users");
    res.send(users);
    return;
  }
  if (!Object.keys(req.query).every((key) => validKeys.includes(key))) {
    return res.status(400).send("Invalid query.");
  }

  let condition = "1=1"; // Default condition that's always true
  if (req.query.id) {
    condition += ` AND id = ${req.query.id}`;
  } else {
    if (req.query.username) {
      condition += ` AND username = "${req.query.username}"`;
    }
    if (req.query.address) {
      condition += ` AND address = "${req.query.address}"`;
    }
  }

  try {
    const users = await db.fetchOne("users", condition);
    if (users) {
      res.send(users);
    } else {
      res.status(404).send("User not found.");
    }
  } catch (err) {
    res.status(500).send("Internal server error.");
  }
});

// WebSocket connection
wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (message) => {
    console.log(`Received message: ${message}`);
  });

  ws.send("WebSocket connection established.");
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Curved API is running on http://localhost:${PORT}`);
});

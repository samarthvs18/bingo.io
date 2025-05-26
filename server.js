require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Change if hosting
    methods: ["GET", "POST"]
  }
});

let players = {};
let currentTurnIndex = 0;
let calledNumbers = new Set();
let availableNumbers = Array.from({ length: 50 }, (_, i) => i + 1);
let currentNumber = null;

const getPlayerNames = () => Object.values(players).map((p) => p.name);

io.on("connection", (socket) => {
  console.log(`🟢 Connected: ${socket.id}`);

  socket.on("setPlayerName", (name) => {
    players[socket.id] = { id: socket.id, name };
    console.log(`Player joined: ${name}`);
    io.emit("updateCalledNumber", {
      currentNumber,
      turn: getPlayerNames()[currentTurnIndex],
      availableNumbers
    });
  });

  socket.on("callNumber", () => {
    const ids = Object.keys(players);
    if (socket.id !== ids[currentTurnIndex]) return;

    if (availableNumbers.length === 0) return;

    const index = Math.floor(Math.random() * availableNumbers.length);
    currentNumber = availableNumbers[index];
    availableNumbers.splice(index, 1);
    calledNumbers.add(currentNumber);
    currentTurnIndex = (currentTurnIndex + 1) % ids.length;

    io.emit("updateCalledNumber", {
      currentNumber,
      turn: players[ids[currentTurnIndex]].name,
      availableNumbers
    });
  });

  socket.on("chatMessage", (msg) => {
    io.emit("chatMessage", msg);
  });

  socket.on("sledge", (msg) => {
    io.emit("sledge", msg);
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Disconnected: ${socket.id}`);
    delete players[socket.id];
    const ids = Object.keys(players);
    if (currentTurnIndex >= ids.length) currentTurnIndex = 0;
  });
});

const PORT = process.env.PORT || 5050;
server.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));

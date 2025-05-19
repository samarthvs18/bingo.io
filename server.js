require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {  
    cors: {
        origin: "http://localhost:3000",  
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true
    }
});

app.use(cors({
    origin: "http://localhost:3000",  
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
}));

app.get('/', (req, res) => {
    res.send("Bingo.io server is running...");
});

// Global game state
let boardState = Array(25).fill(false);
let gameOver = false;
let scratchedLetters = ["", "", "", "", ""];
let players = {};
let leaderboard = [];
let calledNumbers = new Set();
let availableNumbers = Array.from({ length: 50 }, (_, i) => i + 1); // Numbers 1-50
let currentTurnIndex = 0;
let currentNumber = null;

const updateLeaderboard = () => {
    leaderboard = Object.values(players)
        .sort((a, b) => b.wins - a.wins || b.xp - a.xp)
        .slice(0, 10);
    io.emit("leaderboardUpdate", leaderboard);
};

io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on("setPlayerName", (name) => {
        players[socket.id] = { name, xp: 0, wins: 0 };
        updateLeaderboard();
        io.emit("updatePlayers", Object.values(players).map(p => p.name));
    });

    socket.emit("updateBoard", { boardState: [...boardState], gameOver, scratchedLetters });
    socket.emit("updateCalledNumber", { currentNumber, turn: Object.values(players)[currentTurnIndex]?.name, availableNumbers });

    socket.on("callNumber", () => {
        let playerNames = Object.keys(players);
        if (socket.id !== playerNames[currentTurnIndex]) return;

        if (availableNumbers.length === 0) {
            io.emit("gameOver", "All numbers have been called!");
            return;
        }

        let newNumber = availableNumbers.splice(Math.floor(Math.random() * availableNumbers.length), 1)[0]; // Pick and remove number
        calledNumbers.add(newNumber);
        currentNumber = newNumber;

        currentTurnIndex = (currentTurnIndex + 1) % playerNames.length;

        io.emit("updateCalledNumber", { currentNumber, turn: players[playerNames[currentTurnIndex]]?.name, availableNumbers });
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
        updateLeaderboard();
    });

    socket.on("resetGame", () => {
        boardState = Array(25).fill(false);
        gameOver = false;
        scratchedLetters = ["", "", "", "", ""];
        calledNumbers.clear();
        availableNumbers = Array.from({ length: 50 }, (_, i) => i + 1);
        currentNumber = null;
        currentTurnIndex = 0;
        io.emit("updateCalledNumber", { currentNumber, turn: Object.values(players)[0]?.name, availableNumbers });
        io.emit("updateBoard", { boardState: [...boardState], gameOver, scratchedLetters });
    });
});

const PORT = process.env.PORT || 5050;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

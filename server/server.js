const { v4: uuidv4 } = require('uuid'); // For generating unique player IDs
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors({ origin: 'https://react-yatzy.onrender.com', methods: ['GET', 'POST'] }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://react-yatzy.onrender.com',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

let gameState = {
  players: [],
  currentTurn: 0,
  dice: [0, 0, 0, 0, 0],
  scores: [],
};

let chatMessages = [];

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  socket.on('joinGame', (username) => {
    if (gameState.players.length >= 4) {
      socket.emit('gameFull', 'The game is full. Please wait for a spot to open.');
      console.log(`Player ${username} attempted to join, but the game is full.`);
      return;
    }

    const playerId = uuidv4(); // Generate a unique ID for the player
    const newPlayer = { id: playerId, socketId: socket.id, name: username };
    gameState.players.push(newPlayer);
    gameState.scores.push({}); // Add an empty score object for the new player

    console.log(`Player ${username} joined the game.`);
    io.emit('gameState', gameState); // Broadcast updated game state
  });

  socket.on('rollDice', ({ playerId, selectedDice }) => {
    const playerIndex = gameState.players.findIndex(player => player.id === playerId);
    if (playerIndex !== gameState.currentTurn) {
      console.log(`Player ${playerId} attempted to roll out of turn`);
      return;
    }

    gameState.dice = gameState.dice.map((die, index) =>
      selectedDice.includes(index) ? die : Math.ceil(Math.random() * 6)
    );

    io.emit('gameState', gameState);
  });

  socket.on('endTurn', ({ playerId }) => {
    const playerIndex = gameState.players.findIndex(player => player.id === playerId);
    if (playerIndex === gameState.currentTurn) {
      gameState.currentTurn = (gameState.currentTurn + 1) % gameState.players.length;
      gameState.dice = [0, 0, 0, 0, 0];
      io.emit('gameState', gameState);
    }
  });

  socket.on('scoreSelect', ({ playerId, category, points }) => {
    const playerIndex = gameState.players.findIndex(player => player.id === playerId);
    if (playerIndex !== -1 && !gameState.scores[playerIndex][category]) {
      gameState.scores[playerIndex][category] = points;
      io.emit('gameState', gameState);
    }
  });

  socket.on('chatMessage', (message) => {
    const player = gameState.players.find(p => p.socketId === socket.id);

    if (!player) {
      console.log(`Chat message received from unknown player with socket ID: ${socket.id}`);
      return;
    }

    const chatMessage = { username: player.name, text: message };
    chatMessages.push(chatMessage);
    io.emit('chatMessage', chatMessage);
  });

  socket.on('disconnect', () => {
    console.log(`Client with ID ${socket.id} disconnected.`);
    const playersToRemove = gameState.players.filter(player => player.socketId === socket.id);
    playersToRemove.forEach(player => {
      const index = gameState.players.findIndex(p => p.id === player.id);
      if (index !== -1) {
        gameState.players.splice(index, 1);
        gameState.scores.splice(index, 1);
      }
    });

    io.emit('gameState', gameState);
  });
});

app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

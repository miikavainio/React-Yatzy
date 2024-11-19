// server/server.js
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
  scores: [{}, {}], // Initialize scores for two players
};

let chatMessages = []; // Store chat messages

io.on('connection', (socket) => {
  console.log('A player connected:', socket.id);

  socket.on('joinGame', (username) => {
    if (gameState.players.length >= 4) {
      // Notify the client that the game is full
      socket.emit('gameFull', 'The game is full. Please wait for a spot to open.');
      console.log(`Player ${username} attempted to join, but the game is full.`);
      return;
    }

    gameState.players.push({ id: socket.id, name: username });
    console.log(`Player ${username} joined the game.`);
    io.emit('gameState', gameState); // Broadcast updated game state
  });

  socket.on('rollDice', (selectedDice) => {
    const playerIndex = gameState.players.findIndex(player => player.id === socket.id);
    if (playerIndex !== gameState.currentTurn) {
      console.log(`Player ${socket.id} attempted to roll out of turn`);
      return;
    }
  
    gameState.dice = gameState.dice.map((die, index) =>
      selectedDice.includes(index) ? die : Math.ceil(Math.random() * 6)
    );
  
    io.emit('gameState', gameState);
  });

  socket.on('endTurn', () => {
    gameState.currentTurn = (gameState.currentTurn + 1) % gameState.players.length;
    gameState.dice = [0, 0, 0, 0, 0];
    io.emit('gameState', gameState);
  });

  socket.on('scoreSelect', ({ category, points, playerIndex }) => {
    if (!gameState.scores[playerIndex][category]) {
      gameState.scores[playerIndex][category] = points;
      io.emit('gameState', gameState);
    }
  });

  // Handle chat messages
  socket.on('chatMessage', (message) => {
    const player = gameState.players.find(p => p.id === socket.id);
    const chatMessage = { username: player.name, text: message };
    chatMessages.push(chatMessage); // Store the message
    io.emit('chatMessage', chatMessage); // Broadcast the message to all players
  });

  socket.on('disconnect', () => {
    console.log('A player disconnected:', socket.id);
    gameState.players = gameState.players.filter((p) => p.id !== socket.id);
    console.log(`Updated player list: ${gameState.players.map(p => p.name).join(', ')}`);
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

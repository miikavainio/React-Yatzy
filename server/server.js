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
  scores: [], // Dynamically manage scores for all players
};

let chatMessages = []; // Store chat messages
let clientPlayersMap = new Map(); // Map socket ID to list of players for each client

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  // Handle player joining the game
  socket.on('joinGame', (username) => {
    if (gameState.players.length >= 4) {
      socket.emit('gameFull', 'The game is full. Please wait for a spot to open.');
      console.log(`Player ${username} attempted to join, but the game is full.`);
      return;
    }

    const newPlayer = { id: socket.id, name: username };
    gameState.players.push(newPlayer);
    gameState.scores.push({}); // Add an empty score object for the new player

    // Map the client (socket) to the player(s) they create
    if (!clientPlayersMap.has(socket.id)) {
      clientPlayersMap.set(socket.id, []);
    }
    clientPlayersMap.get(socket.id).push(newPlayer);

    console.log(`Player ${username} joined the game.`);
    io.emit('gameState', gameState); // Broadcast the updated game state
  });

  // Handle rolling dice
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

  // Handle ending a turn
  socket.on('endTurn', () => {
    gameState.currentTurn = (gameState.currentTurn + 1) % gameState.players.length;
    gameState.dice = [0, 0, 0, 0, 0];
    io.emit('gameState', gameState);
  });

  // Handle score selection
  socket.on('scoreSelect', ({ category, points, playerIndex }) => {
    if (!gameState.scores[playerIndex][category]) {
      gameState.scores[playerIndex][category] = points;
      io.emit('gameState', gameState);
    }
  });

  // Handle chat messages
  socket.on('chatMessage', (message) => {
    const player = gameState.players.find(p => p.id === socket.id);

    if (!player) {
      console.log(`Chat message received from unknown player with socket ID: ${socket.id}`);
      return;
    }

    const chatMessage = { username: player.name, text: message };
    chatMessages.push(chatMessage);
    io.emit('chatMessage', chatMessage);
  });

  // Handle client disconnecting
  socket.on('disconnect', () => {
    console.log(`Client with ID ${socket.id} disconnected.`);

    // Remove all players associated with this client
    const playersToRemove = clientPlayersMap.get(socket.id) || [];
    playersToRemove.forEach(player => {
      const playerIndex = gameState.players.findIndex(p => p.id === player.id);
      if (playerIndex !== -1) {
        gameState.players.splice(playerIndex, 1);
        gameState.scores.splice(playerIndex, 1);
      }
    });

    // Remove the client from the map
    clientPlayersMap.delete(socket.id);

    console.log(`Updated player list: ${gameState.players.map(p => p.name).join(', ')}`);
    io.emit('gameState', gameState); // Broadcast the updated game state
  });
});

app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

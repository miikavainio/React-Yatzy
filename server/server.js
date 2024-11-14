// server/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // Enable CORS for all origins

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Allow only the React app origin
    methods: ['GET', 'POST']
  }
});

let gameState = {
  players: [],
  currentTurn: 0,
  dice: [0, 0, 0, 0, 0],
  scores: {},
};

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);
  
    socket.on('joinGame', (username) => {
      gameState.players.push({ id: socket.id, name: username });
      io.emit('gameState', gameState);
    });
  
    socket.on('rollDice', (selectedDice) => {
      gameState.dice = gameState.dice.map((die, index) =>
        selectedDice.includes(index) ? die : Math.ceil(Math.random() * 6)
      );
      io.emit('gameState', gameState); // Update all clients with the new game state
    });
  
    socket.on('disconnect', () => {
      console.log('A player disconnected:', socket.id);
      gameState.players = gameState.players.filter((p) => p.id !== socket.id);
      io.emit('gameState', gameState);
    });
  });

server.listen(3001, () => {
  console.log('Server is running on http://localhost:3001');
});

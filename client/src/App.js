// client/src/App.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import Scoreboard from './Scoreboard';

const socket = io('wss://react-yatzy.onrender.com');

function App() {
  const [gameState, setGameState] = useState(null);
  const [username, setUsername] = useState('');
  const [dice, setDice] = useState([0, 0, 0, 0, 0]);
  const [selectedDice, setSelectedDice] = useState([]);
  const [rollCount, setRollCount] = useState(0);
  const [hasRolled, setHasRolled] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [scoreSelected, setScoreSelected] = useState(false);
  const [playerScores, setPlayerScores] = useState([{}, {}]);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    socket.on('gameState', (state) => {
      console.log('Received game state:', state);
      setGameState(state);
      setDice(state.dice); // Update dice with server's dice values
      setCurrentPlayer(state.currentTurn); // Sync current turn from server
    });
  
    return () => {
      socket.off('gameState');
    };
  }, []);

  const joinGame = () => {
    socket.emit('joinGame', username);
  };

  const rollDice = () => {
    if (rollCount < 3 && !scoreSelected && !isRolling) {
      setIsRolling(true);
      setHasRolled(true);
      
      // Emit selectedDice array to the server
      socket.emit('rollDice', selectedDice);
      
      setRollCount(rollCount + 1);
      setIsRolling(false);
    }
  };

  const toggleDiceSelection = (index) => {
    setSelectedDice((prevSelected) =>
      prevSelected.includes(index) ? prevSelected.filter((i) => i !== index) : [...prevSelected, index]
    );
  };

  useEffect(() => {
    socket.on('pong', (message) => {
      console.log(message);
    });

    return () => {
      socket.off('pong');
    };
  }, []);

  const sendPing = () => {
    socket.emit('ping');
  };

  const endTurn = () => {
    setRollCount(0);
    setHasRolled(false);
    setScoreSelected(false);
    setSelectedDice([]);
    setDice([0, 0, 0, 0, 0]);

    // Emit endTurn event to server
    socket.emit('endTurn');
  };

  const handleScoreSelect = (category, points, playerIndex) => {
    if (hasRolled) {
      setScoreSelected(true);
      const newScores = [...playerScores];
      newScores[playerIndex] = { ...newScores[playerIndex], [category]: points };
      setPlayerScores(newScores);
    }
  };

  return (
    <div className="game-container">
      <div className="game-content">
        <h1>Yatzy Game</h1>
        <input
          placeholder="Enter your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button className="button" onClick={joinGame}>Join Game</button>
        <button onClick={sendPing}>Ping Server</button>

        {gameState && (
          <>
            <div>Players: {gameState.players.map((p) => p.name).join(', ')}</div>
            <h2>Current Turn: {gameState.players[currentPlayer].name}</h2>
            <div className="dice-container">
              {dice.map((die, index) => (
                <div
                  key={index}
                  className={`die ${selectedDice.includes(index) ? 'selected' : ''}`}
                  onClick={() => toggleDiceSelection(index)}
                >
                  {die > 0 ? die : '-'}
                </div>
              ))}
            </div>
            <button className="button" onClick={rollDice} disabled={rollCount >= 3 || scoreSelected || isRolling}>
              {isRolling ? "Rolling..." : `Roll Dice (${3 - rollCount} rolls left)`}
            </button>
            <button className="button" onClick={endTurn} disabled={!scoreSelected}>
              End Turn
            </button>
          </>
        )}
      </div>

      <div className="scoreboard-container">
        <Scoreboard
          dice={dice}
          onScoreSelect={handleScoreSelect}
          isDisabled={!hasRolled || scoreSelected}
          currentPlayer={currentPlayer}
          players={gameState?.players || []}
          playerScores={playerScores}
        />
      </div>
    </div>
  );
}

export default App;

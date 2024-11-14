// client/src/App.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import Scoreboard from './Scoreboard';

const socket = io('wss://react-yatzy.onrender.com');

function App() {
  const [gameState, setGameState] = useState(null);
  const [username, setUsername] = useState('');
  const [dice, setDice] = useState([0, 0, 0, 0, 0]); // Initialize dice with 0 values
  const [selectedDice, setSelectedDice] = useState([]);
  const [rollCount, setRollCount] = useState(0);
  const [hasRolled, setHasRolled] = useState(false); // Track if player has rolled at least once
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [scoreSelected, setScoreSelected] = useState(false);
  const [playerScores, setPlayerScores] = useState([{}, {}]);
  const [isRolling, setIsRolling] = useState(false); // Track if dice are rolling

  useEffect(() => {
    socket.on('gameState', (state) => {
      setGameState(state);
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
      setHasRolled(true); // Mark that the player has rolled at least once
      const rollInterval = setInterval(() => {
        setDice(dice.map((die, index) =>
          selectedDice.includes(index) ? die : Math.ceil(Math.random() * 6)
        ));
      }, 100); // Change dice every 100ms for a shuffle effect

      // After 1 second, settle on the final roll values
      setTimeout(() => {
        clearInterval(rollInterval);
        const finalDice = dice.map((die, index) =>
          selectedDice.includes(index) ? die : Math.ceil(Math.random() * 6)
        );
        setDice(finalDice);
        setIsRolling(false); // Set rolling state to false
        setRollCount(rollCount + 1); // Increment roll count
      }, 1000); // Roll animation duration: 1 second
    }
  };

  const toggleDiceSelection = (index) => {
    setSelectedDice((prevSelected) =>
      prevSelected.includes(index) ? prevSelected.filter((i) => i !== index) : [...prevSelected, index]
    );
  };

  const endTurn = () => {
    setRollCount(0);
    setHasRolled(false); // Reset the roll status for the next turn
    setScoreSelected(false);
    setSelectedDice([]);
    setDice([0, 0, 0, 0, 0]); // Reset dice to 0 values
    setCurrentPlayer((currentPlayer + 1) % gameState.players.length);
  };

  const handleScoreSelect = (category, points, playerIndex) => {
    if (hasRolled) { // Only allow scoring if the player has rolled at least once
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

      {/* Scoreboard on the right side */}
      <div className="scoreboard-container">
        <Scoreboard
          dice={dice}
          onScoreSelect={handleScoreSelect}
          isDisabled={!hasRolled || scoreSelected} // Disable scoring if no roll or if score already selected
          currentPlayer={currentPlayer}
          players={gameState?.players || []}
          playerScores={playerScores}
        />
      </div>
    </div>
  );
}

export default App;

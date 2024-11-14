import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import Scoreboard from './Scoreboard';

const socket = io('https://react-yatzy.onrender.com');

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

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    socket.on('gameState', (state) => {
      setGameState(state);
      setDice(state.dice);
      setCurrentPlayer(state.currentTurn);
      setPlayerScores(state.scores);
    });

    socket.on('chatMessage', (message) => {
      setChatMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => {
      socket.off('gameState');
      socket.off('chatMessage');
    };
  }, []);

  const joinGame = () => {
    socket.emit('joinGame', username);
  };

  const rollDice = () => {
    if (rollCount < 3 && !scoreSelected && !isRolling && currentPlayer === gameState.players.findIndex(p => p.name === username)) {
      setIsRolling(true);
      setHasRolled(true);

      const rollInterval = setInterval(() => {
        setDice(dice.map((die, index) =>
          selectedDice.includes(index) ? die : Math.ceil(Math.random() * 6)
        ));
      }, 100);

      setTimeout(() => {
        clearInterval(rollInterval);
        socket.emit('rollDice', selectedDice);
        setRollCount(rollCount + 1);
        setIsRolling(false);
      }, 1000);
    }
  };

  const toggleDiceSelection = (index) => {
    setSelectedDice((prevSelected) =>
      prevSelected.includes(index) ? prevSelected.filter((i) => i !== index) : [...prevSelected, index]
    );
  };

  const endTurn = () => {
    setRollCount(0);
    setHasRolled(false);
    setScoreSelected(false);
    setSelectedDice([]);
    setDice([0, 0, 0, 0, 0]);

    socket.emit('endTurn');
  };

  const handleScoreSelect = (category, points, playerIndex) => {
    if (hasRolled) {
      setScoreSelected(true);
      socket.emit('scoreSelect', { category, points, playerIndex });
    }
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      socket.emit('chatMessage', chatInput);
      setChatInput('');
    }
  };

  const isCurrentPlayerTurn = currentPlayer === gameState?.players.findIndex(p => p.name === username);

  return (
    <div className="container">
      {/* Chat Room on the Left */}
      <div className="chat-container">
        <h3>Chat Room</h3>
        <div className="chat-box">
          {chatMessages.map((msg, index) => (
            <div key={index} className="chat-message">
              <strong>{msg.username}:</strong> {msg.text}
            </div>
          ))}
        </div>
        <form onSubmit={sendChatMessage} className="chat-form">
          <input
            type="text"
            placeholder="Type a message"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button type="submit">Send</button>
        </form>
      </div>

      {/* Main Game Content on the Right */}
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
            <h2
              style={{
                backgroundColor: isCurrentPlayerTurn ? 'green' : 'red',
                color: 'white',
                padding: '10px',
                borderRadius: '5px',
              }}
            >
              {isCurrentPlayerTurn ? 'Your turn' : `${gameState.players[currentPlayer].name}'s turn`}
            </h2>

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
            <button
              className="button"
              onClick={rollDice}
              disabled={rollCount >= 3 || scoreSelected || isRolling || !isCurrentPlayerTurn}
            >
              {isRolling ? "Rolling..." : `Roll Dice (${3 - rollCount} rolls left)`}
            </button>
            <button
              className="button"
              onClick={endTurn}
              disabled={!scoreSelected}
            >
              End Turn
            </button>
          </>
        )}

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
    </div>
  );
}

export default App;

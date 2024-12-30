import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import "./App.css";
import Scoreboard from "./Scoreboard";

const socket = io("https://react-yatzy.onrender.com");

function App() {
  const [gameState, setGameState] = useState(null);
  const [username, setUsername] = useState("");
  const [dice, setDice] = useState([0, 0, 0, 0, 0]);
  const [selectedDice, setSelectedDice] = useState([]);
  const [rollCount, setRollCount] = useState(0);
  const [hasRolled, setHasRolled] = useState(false);
  const [scoreSelected, setScoreSelected] = useState(false);
  const [playerScores, setPlayerScores] = useState([]);
  const [isRolling, setIsRolling] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [winner, setWinner] = useState(null); // New state for winner

  useEffect(() => {
    socket.on("gameState", (state) => {
      setGameState(state);
      setDice(state.dice);
      setPlayerScores(state.scores);
    });

    socket.on("chatMessage", (message) => {
      setChatMessages((prevMessages) => [...prevMessages, message]);
    });

    socket.on("gameFull", (message) => {
      setErrorMessage(message);
    });

    return () => {
      socket.off("gameState");
      socket.off("chatMessage");
      socket.off("gameFull");
    };
  }, []);

  const joinGame = () => {
    if (!username) return;
    socket.emit("joinGame", username);
    setUsername(""); // Clear the input field after joining
  };

  const rollDice = () => {
    if (rollCount < 3 && !scoreSelected && !isRolling) {
      setIsRolling(true);
      setHasRolled(true);

      const rollInterval = setInterval(() => {
        setDice(
          dice.map((die, index) =>
            selectedDice.includes(index) ? die : Math.ceil(Math.random() * 6)
          )
        );
      }, 100);

      setTimeout(() => {
        clearInterval(rollInterval);
        socket.emit("rollDice", selectedDice);
        setRollCount(rollCount + 1);
        setIsRolling(false);
      }, 1000);
    }
  };

  const toggleDiceSelection = (index) => {
    setSelectedDice((prevSelected) =>
      prevSelected.includes(index)
        ? prevSelected.filter((i) => i !== index)
        : [...prevSelected, index]
    );
  };

  const endTurn = () => {
    setRollCount(0);
    setHasRolled(false);
    setScoreSelected(false);
    setSelectedDice([]);
    setDice([0, 0, 0, 0, 0]);

    socket.emit("endTurn");
    checkGameEnd(); // Check if the game has ended
  };

  const handleScoreSelect = (category, points, playerIndex) => {
    if (hasRolled) {
      setScoreSelected(true);
      socket.emit("scoreSelect", { category, points, playerIndex });
    }
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      socket.emit("chatMessage", chatInput);
      setChatInput("");
    }
  };

  const checkGameEnd = () => {
    // Check if all players have filled their scoreboard
    const allScoresFilled = gameState.players.every((player, index) =>
      Object.values(playerScores[index] || {}).every((score) => score !== null)
    );

    if (allScoresFilled) {
      // Determine the winner
      const scores = gameState.players.map((player, index) =>
        Object.values(playerScores[index] || {}).reduce(
          (total, score) => total + (score || 0),
          0
        )
      );

      const highestScore = Math.max(...scores);
      const winnerIndex = scores.indexOf(highestScore);
      setWinner(gameState.players[winnerIndex]?.name);
    }
  };

  const currentPlayerName =
    gameState?.players[gameState?.currentTurn]?.name || "";
  const isCurrentPlayerTurn =
    gameState?.players[gameState?.currentTurn]?.id === socket.id;

  return (
    <div className="game-container">
      <h1>Yatzy Game</h1>

      {winner && (
        <div className="winner-announcement">
          <h2>🎉 Winner: {winner} 🎉</h2>
        </div>
      )}

      {/* Chat Box */}
      <div className="chat-container">
        <h3>Chat Room</h3>
        <div className="chat-box">
          {chatMessages.map((msg, index) => (
            <div key={index} className="chat-message">
              <strong>{msg.username}:</strong> {msg.text}
            </div>
          ))}
        </div>
        <form onSubmit={sendChatMessage}>
          <input
            type="text"
            placeholder="Type a message"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button type="submit">Send</button>
        </form>
      </div>

      <div className="game-content">
        <input
          placeholder="Enter your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button className="button" onClick={joinGame}>
          Join Game
        </button>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        {gameState && (
          <>
            <div style={{ color: "white", marginTop: "3px" }}>
              Players: {gameState.players.map((p) => p.name).join(", ")}
            </div>
            <h2
              style={{
                backgroundColor: isCurrentPlayerTurn ? "green" : "red",
                color: "white",
                padding: "10px",
                borderRadius: "5px",
              }}
            >
              {isCurrentPlayerTurn
                ? "Your turn"
                : `${currentPlayerName}'s turn`}
            </h2>

            <div className="dice-container">
              {dice.map((die, index) => (
                <div
                  key={index}
                  className={`die ${
                    selectedDice.includes(index) ? "selected" : ""
                  }`}
                  onClick={() => toggleDiceSelection(index)}
                >
                  {die > 0 ? die : "-"}
                </div>
              ))}
            </div>
            <button
              className="button"
              onClick={rollDice}
              disabled={
                !isCurrentPlayerTurn || rollCount >= 3 || scoreSelected || isRolling
              }
            >
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
        currentPlayer={gameState?.currentTurn}
        players={gameState?.players || []}
        playerScores={playerScores}
      />
    </div>    
    </div>  
    );
}

export default App;

// client/src/Scoreboard.js
import React from 'react';
import './Scoreboard.css';

function Scoreboard({ dice, onScoreSelect, isDisabled, currentPlayer, players, playerScores }) {
  const calculateScore = (category) => {
    const counts = {};
    dice.forEach(die => counts[die] = (counts[die] || 0) + 1);

    switch (category) {
      case 'ones': return dice.filter(die => die === 1).reduce((acc, val) => acc + val, 0);
      case 'twos': return dice.filter(die => die === 2).reduce((acc, val) => acc + val, 0);
      case 'threes': return dice.filter(die => die === 3).reduce((acc, val) => acc + val, 0);
      case 'fours': return dice.filter(die => die === 4).reduce((acc, val) => acc + val, 0);
      case 'fives': return dice.filter(die => die === 5).reduce((acc, val) => acc + val, 0);
      case 'sixes': return dice.filter(die => die === 6).reduce((acc, val) => acc + val, 0);
      case 'onePair': {
        const pairs = Object.keys(counts).filter(num => counts[num] >= 2);
        return pairs.length >= 1 ? Math.max(...pairs) * 2 : 0;
      }
      case 'twoPairs': {
        const pairs = Object.keys(counts).filter(num => counts[num] >= 2);
        return pairs.length >= 2 ? pairs.slice(0, 2).reduce((acc, val) => acc + val * 2, 0) : 0;
      }
      case 'threeOfKind': {
        const threes = Object.keys(counts).find(num => counts[num] >= 3);
        return threes ? threes * 3 : 0;
      }
      case 'fourOfKind': {
        const fours = Object.keys(counts).find(num => counts[num] >= 4);
        return fours ? fours * 4 : 0;
      }
      case 'smallStraight': return [1, 2, 3, 4, 5].every(num => dice.includes(num)) ? 15 : 0;
      case 'largeStraight': return [2, 3, 4, 5, 6].every(num => dice.includes(num)) ? 20 : 0;
      case 'fullHouse': {
        const threeOfKind = Object.keys(counts).find(num => counts[num] === 3);
        const pair = Object.keys(counts).find(num => counts[num] === 2);
        return threeOfKind && pair ? dice.reduce((acc, val) => acc + val, 0) : 0;
      }
      case 'chance': return dice.reduce((acc, val) => acc + val, 0);
      case 'yatzy': return dice.every(die => die === dice[0]) ? 50 : 0;
      default: return 0;
    }
  };

  const handleScoreSelect = (category, playerIndex) => {
    // Prevent re-selection of a category if it has already been scored, even with a score of 0
    if (playerIndex === currentPlayer && !isDisabled && playerScores[playerIndex][category] === undefined) {
      const points = calculateScore(category);
      onScoreSelect(category, points, playerIndex);
    }
  };

  const calculateUpperSectionTotal = (scores) => {
    const upperSection = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
    return upperSection.reduce((total, category) => total + (scores[category] || 0), 0);
  };

  const calculateBonus = (upperTotal) => (upperTotal >= 63 ? 50 : 0);

  const calculateTotalScore = (scores) => {
    const upperTotal = calculateUpperSectionTotal(scores);
    const bonus = calculateBonus(upperTotal);
    return Object.values(scores).reduce((total, score) => total + (score || 0), 0) + bonus;
  };

  return (
    <div className="scoreboard">
      <h3>Scoreboard</h3>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            {players.map((player, index) => (
              <th key={index} style={{ backgroundColor: index === currentPlayer ? 'lightblue' : 'transparent' }}>
                {player.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].map((category) => (
            <tr key={category}>
              <td>{category.charAt(0).toUpperCase() + category.slice(1)}</td>
              {players.map((player, playerIndex) => (
                <td
                  key={playerIndex}
                  onClick={() => handleScoreSelect(category, playerIndex)}
                  style={{
                    cursor: playerIndex === currentPlayer && !isDisabled && playerScores[playerIndex][category] === undefined ? 'pointer' : 'not-allowed',
                    color: playerIndex === currentPlayer && !isDisabled && playerScores[playerIndex][category] === undefined ? 'black' : 'grey',
                    backgroundColor: playerIndex === currentPlayer ? 'lightblue' : 'transparent',
                  }}
                >
                  {playerScores[playerIndex][category] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
          {/* Upper Section Total and Bonus Rows */}
          <tr>
            <td>Total</td>
            {players.map((_, playerIndex) => (
              <td key={playerIndex} style={{ backgroundColor: playerIndex === currentPlayer ? 'lightblue' : 'transparent' }}>
                {calculateUpperSectionTotal(playerScores[playerIndex])}
              </td>
            ))}
          </tr>
          <tr>
            <td>Bonus</td>
            {players.map((_, playerIndex) => (
              <td key={playerIndex} style={{ backgroundColor: playerIndex === currentPlayer ? 'lightblue' : 'transparent' }}>
                {calculateBonus(calculateUpperSectionTotal(playerScores[playerIndex]))}
              </td>
            ))}
          </tr>
          {/* Lower Section */}
          {['onePair', 'twoPairs', 'threeOfKind', 'fourOfKind', 'smallStraight', 'largeStraight', 'fullHouse', 'chance', 'yatzy'].map((category) => (
            <tr key={category}>
              <td>{category.replace(/([A-Z])/g, ' $1')}</td>
              {players.map((player, playerIndex) => (
                <td
                  key={playerIndex}
                  onClick={() => handleScoreSelect(category, playerIndex)}
                  style={{
                    cursor: playerIndex === currentPlayer && !isDisabled && playerScores[playerIndex][category] === undefined ? 'pointer' : 'not-allowed',
                    color: playerIndex === currentPlayer && !isDisabled && playerScores[playerIndex][category] === undefined ? 'black' : 'grey',
                    backgroundColor: playerIndex === currentPlayer ? 'lightblue' : 'transparent',
                  }}
                >
                  {playerScores[playerIndex][category] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td><strong>Total Score</strong></td>
            {players.map((_, playerIndex) => (
              <td key={playerIndex} style={{ backgroundColor: playerIndex === currentPlayer ? 'lightblue' : 'transparent' }}>
                {calculateTotalScore(playerScores[playerIndex])}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default Scoreboard;

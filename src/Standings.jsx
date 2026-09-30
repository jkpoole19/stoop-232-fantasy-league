import { useState } from "react";
import "./Standings.css";

export default function Standings({ matchups, managers }) {
  const [sortBy, setSortBy] = useState("wins");
  const [sortDir, setSortDir] = useState("desc");

  // Calculate win-loss records for each manager
  const standings = {};

  matchups.forEach((matchup) => {
    const m1 = matchup["Manager 1"];
    const m2 = matchup["Manager 2"];
    const s1 = parseFloat(matchup["Score 1"]);
    const s2 = parseFloat(matchup["Score 2"]);

    if (!standings[m1]) {
      standings[m1] = { name: m1, wins: 0, losses: 0, ties: 0 };
    }
    if (!standings[m2]) {
      standings[m2] = { name: m2, wins: 0, losses: 0, ties: 0 };
    }

    if (s1 > s2) {
      standings[m1].wins++;
      standings[m2].losses++;
    } else if (s2 > s1) {
      standings[m2].wins++;
      standings[m1].losses++;
    } else {
      standings[m1].ties++;
      standings[m2].ties++;
    }
  });

  const data = Object.values(standings);

  // Sort the standings
  const sorted = [...data].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (sortDir === "desc") {
      return bVal - aVal;
    } else {
      return aVal - bVal;
    }
  });

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
  };

  return (
    <div className="page">
      <div className="hero-header">
        <div className="hero-backdrop"></div>
        <div className="hero-content">
          <h1 className="hero-title">🏆 All-Time Standings</h1>
          <p className="hero-stat">
            <span className="stat-badge">{data.length} Managers</span>
            <span className="stat-badge">All-Time Record</span>
          </p>
        </div>
      </div>

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th
                className="sortable"
                onClick={() => handleSort("name")}
              >
                Manager
              </th>
              <th
                className="sortable"
                onClick={() => handleSort("wins")}
              >
                Wins
              </th>
              <th
                className="sortable"
                onClick={() => handleSort("losses")}
              >
                Losses
              </th>
              <th
                className="sortable"
                onClick={() => handleSort("ties")}
              >
                Ties
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((manager, idx) => (
              <tr key={manager.name} className={idx === 0 ? "champion" : ""}>
                <td className="manager-cell">
                  {idx === 0 && <span className="champion-badge">👑</span>}
                  {manager.name}
                </td>
                <td className="wins-cell">{manager.wins}</td>
                <td className="losses-cell">{manager.losses}</td>
                <td className="ties-cell">{manager.ties}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

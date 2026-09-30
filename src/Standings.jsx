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
      <h1>All-Time Standings</h1>
      <p className="sub">{data.length} managers</p>

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
            {sorted.map((manager) => (
              <tr key={manager.name}>
                <td>{manager.name}</td>
                <td>{manager.wins}</td>
                <td>{manager.losses}</td>
                <td>{manager.ties}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import Papa from "papaparse";
import { SHEET_URLS } from "./config";
import Standings from "./Standings";
import "./App.css";

function loadCsv(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (result) =>
        resolve({ fields: result.meta.fields || [], rows: result.data }),
      error: reject,
    });
  });
}

export default function App() {
  const [matchups, setMatchups] = useState([]);
  const [managers, setManagers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [status, setStatus] = useState("loading");
  const [seasonFilter, setSeasonFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState("matchups");

  useEffect(() => {
    Promise.all(SHEET_URLS.map(loadCsv))
      .then((sheets) => {
        const m = sheets.find((s) => s.fields.includes("Manager 1"));
        if (!m) throw new Error("Could not find the Matchups sheet");
        const others = sheets.filter((s) => s !== m);
        setMatchups(m.rows);
        setManagers(others[0] ? others[0].rows : []);
        setSeasons(others[1] ? others[1].rows : []);
        setStatus("ready");
      })
      .catch((err) => {
        console.error(err);
        setStatus("error");
      });
  }, []);

  if (status === "loading") return <p className="msg">Loading...</p>;
  if (status === "error")
    return (
      <p className="msg">
        Something went wrong loading your sheets. Check your links in
        src/config.js.
      </p>
    );

  const seasonList = [...new Set(matchups.map((r) => r["Season"]))];
  const shown =
    seasonFilter === "All"
      ? matchups
      : matchups.filter((r) => r["Season"] === seasonFilter);

  return (
    <div>
      <nav className="navbar">
        <button
          className={`nav-button ${currentPage === "matchups" ? "active" : ""}`}
          onClick={() => setCurrentPage("matchups")}
        >
          League Matchups
        </button>
        <button
          className={`nav-button ${currentPage === "standings" ? "active" : ""}`}
          onClick={() => setCurrentPage("standings")}
        >
          All-Time Standings
        </button>
      </nav>

      {currentPage === "matchups" ? (
        <div className="page">
          <h1>League Matchups</h1>
          <p className="sub">
            {matchups.length} games · {managers.length} manager rows ·{" "}
            {seasons.length} season rows
          </p>

          <label>
            Season:{" "}
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
            >
              <option>All</option>
              {seasonList.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>

          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Season</th>
                  <th>Week</th>
                  <th>Manager 1</th>
                  <th>Manager 2</th>
                  <th>Score 1</th>
                  <th>Score 2</th>
                  <th>Game Type</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => {
                  const s1 = parseFloat(r["Score 1"]);
                  const s2 = parseFloat(r["Score 2"]);
                  return (
                    <tr key={i}>
                      <td>{r["Season"]}</td>
                      <td>{r["Week"]}</td>
                      <td className={s1 > s2 ? "win" : ""}>{r["Manager 1"]}</td>
                      <td className={s2 > s1 ? "win" : ""}>{r["Manager 2"]}</td>
                      <td>{r["Score 1"]}</td>
                      <td>{r["Score 2"]}</td>
                      <td>{r["Game Type"]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <Standings matchups={matchups} managers={managers} />
      )}
    </div>
  );
}

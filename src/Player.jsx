import React from "react";
import "./Player.css";

// Player component
// Props:
// - playerName (string) - required
// - matchups (array of rows) - each row should at least have: Season, Week, Manager 1, Manager 2, Score 1, Score 2, Game Type
// - currentSeason (string) - optional, used to gray out current incomplete season

export default function Player({ playerName = "Player Name", matchups = [], currentSeason = null, active = true }) {
  // filter matchups involving this player
  const games = matchups.filter(
    (r) => r["Manager 1"] === playerName || r["Manager 2"] === playerName
  );

  const parsedGames = games.map((r) => {
    const isHome = r["Manager 1"] === playerName;
    const playerScore = parseFloat(isHome ? r["Score 1"] : r["Score 2"]) || 0;
    const oppScore = parseFloat(isHome ? r["Score 2"] : r["Score 1"]) || 0;
    const opponent = isHome ? r["Manager 2"] : r["Manager 1"];
    const won = playerScore > oppScore ? 1 : playerScore < oppScore ? 0 : 0.5; // treat tie as 0.5
    const season = r["Season"];
    const week = r["Week"];
    const gameType = (r["Game Type"] || "").toLowerCase();
    return { ...r, playerScore, oppScore, opponent, won, season, week, gameType };
  });

  const totalGames = parsedGames.length;
  const wins = parsedGames.reduce((s, g) => s + (g.won === 1 ? 1 : 0), 0);
  const ties = parsedGames.reduce((s, g) => s + (g.won === 0.5 ? 1 : 0), 0);
  const losses = totalGames - wins - ties;
  const winPct = totalGames ? ((wins + ties * 0.5) / totalGames) * 100 : 0;

  const seasonsPlayed = [...new Set(parsedGames.map((g) => g.season))];
  const firstSeason = seasonsPlayed.length ? seasonsPlayed.sort()[0] : "—";

  const championships = parsedGames.filter(
    (g) => g.gameType.includes("champ") && g.won === 1
  ).length;

  // scoring distribution (player scores)
  const scores = parsedGames.map((g) => g.playerScore);

  // histogram bins
  const bins = 8;
  const minScore = Math.min(...(scores.length ? scores : [0]));
  const maxScore = Math.max(...(scores.length ? scores : [100]));
  const binSize = (maxScore - minScore) / bins || 1;
  const histogram = new Array(bins).fill(0);
  scores.forEach((s) => {
    const idx = Math.min(
      bins - 1,
      Math.max(0, Math.floor((s - minScore) / binSize))
    );
    histogram[idx]++;
  });

  // opponent table
  const byOpponent = {};
  parsedGames.forEach((g) => {
    const name = g.opponent || "Unknown";
    if (!byOpponent[name]) byOpponent[name] = { w: 0, l: 0, t: 0, games: 0 };
    if (g.won === 1) byOpponent[name].w++;
    else if (g.won === 0.5) byOpponent[name].t++;
    else byOpponent[name].l++;
    byOpponent[name].games++;
  });

  const opponentRows = Object.entries(byOpponent).map(([name, s]) => ({
    name,
    games: s.games,
    record: `${s.w}-${s.l}${s.t ? `-${s.t}` : ""}`,
    winPct: s.games ? Math.round(((s.w + s.t * 0.5) / s.games) * 1000) / 10 : 0,
  }));

  // win % by year and whether made playoffs
  const bySeason = {};
  parsedGames.forEach((g) => {
    const s = g.season || "Unknown";
    if (!bySeason[s]) bySeason[s] = { w: 0, l: 0, t: 0, games: 0, madePlayoffs: false };
    if (g.won === 1) bySeason[s].w++;
    else if (g.won === 0.5) bySeason[s].t++;
    else bySeason[s].l++;
    bySeason[s].games++;
    if (g.gameType.includes("playoff") || g.gameType.includes("wildcard") || g.gameType.includes("semifinal") || g.gameType.includes("final")) {
      bySeason[s].madePlayoffs = true;
    }
  });

  const seasonRows = Object.entries(bySeason)
    .map(([season, s]) => ({
      season,
      games: s.games,
      winPct: s.games ? ((s.w + s.t * 0.5) / s.games) * 100 : 0,
      madePlayoffs: !!s.madePlayoffs,
    }))
    .sort((a, b) => a.season.localeCompare(b.season));

  // highlights
  const playoffAppearances = seasonRows.reduce(
    (c, s) => c + (s.madePlayoffs ? 1 : 0),
    0
  );

  const bestSeason = seasonRows.slice().sort((a, b) => b.winPct - a.winPct)[0];
  const averageFinish = "—"; // not enough data in matchups to compute finish reliably

  const highest = parsedGames.slice().sort((a, b) => b.playerScore - a.playerScore)[0];
  const lowest = parsedGames.slice().sort((a, b) => a.playerScore - b.playerScore)[0];

  const highestMargin = parsedGames.slice().sort((a, b) => (b.playerScore - b.oppScore) - (a.playerScore - a.oppScore))[0];
  const largestLoss = parsedGames.slice().sort((a, b) => (a.oppScore - a.playerScore) - (b.oppScore - b.playerScore))[0];

  return (
    <div className="player-page page">
      <div className="player-hero">
        <div className="player-hero-left">
          <div className={`active-dot ${active ? "active" : "inactive"}`} title={active ? "Active" : "Inactive"}></div>
          <div className="player-avatar" aria-hidden>
            {/* Placeholder circle for player image */}
            <div className="avatar-circle"></div>
          </div>
        </div>
        <div className="player-hero-main">
          <h1 className="player-name">{playerName}</h1>
          <p className="player-meta">
            <strong>{wins}-{losses}{ties ? `-${ties}` : ""}</strong>
            <span className="meta-sep">•</span>
            <span>{winPct.toFixed(1)}% Win</span>
            <span className="meta-sep">•</span>
            <span>First season: {firstSeason}</span>
            <span className="meta-sep">•</span>
            <span>Championships: {championships}</span>
          </p>
        </div>
      </div>

      <div className="player-content">
        <section className="card">
          <h2>Scoring Distribution</h2>
          <div className="histogram" role="img" aria-label="Scoring distribution histogram">
            <svg viewBox={`0 0 ${bins * 20} 100`} preserveAspectRatio="none">
              {histogram.map((count, i) => {
                const x = i * 20 + 2;
                const h = count ? (count / Math.max(...histogram)) * 80 : 2;
                return (
                  <rect
                    key={i}
                    x={x}
                    y={100 - h - 10}
                    width={14}
                    height={h + 4}
                    className="hist-bar"
                  />
                );
              })}
            </svg>
            <div className="hist-legend">
              <span>{Math.round(minScore)}</span>
              <span>{Math.round((minScore + maxScore) / 2)}</span>
              <span>{Math.round(maxScore)}</span>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>Record vs Opponents</h2>
          <div className="scroll">
            <table className="opp-table">
              <thead>
                <tr>
                  <th>Opponent</th>
                  <th>Games</th>
                  <th>Record</th>
                  <th>Win %</th>
                </tr>
              </thead>
              <tbody>
                {opponentRows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{r.games}</td>
                    <td>{r.record}</td>
                    <td>{r.winPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>Win % by Year</h2>
          <div className="year-bars">
            {seasonRows.map((s) => {
              const color = s.season === currentSeason ? "gray" : s.madePlayoffs ? "var(--accent)" : "var(--muted)";
              const height = s.winPct;
              return (
                <div key={s.season} className="year-bar">
                  <div className="bar-wrap">
                    <div className="bar" style={{ height: `${height}%`, background: color }} title={`${s.season}: ${s.winPct.toFixed(1)}%`} />
                  </div>
                  <div className="bar-label">{s.season}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card highlights">
          <h2>Highlights</h2>
          <div className="highlights-grid">
            <div>
              <strong>Playoff Appearances</strong>
              <div>{playoffAppearances}</div>
            </div>
            <div>
              <strong>Best Overall Record</strong>
              <div>{bestSeason ? `${Math.round(bestSeason.winPct*10)/10}% (${bestSeason.season})` : "—"}</div>
            </div>
            <div>
              <strong>Average Finish</strong>
              <div>{averageFinish}</div>
            </div>
            <div>
              <strong>Highest Points Scored</strong>
              <div>{highest ? `${highest.playerScore} — ${highest.season} W${highest.week} vs ${highest.opponent}` : "—"}</div>
            </div>
            <div>
              <strong>Lowest Points Scored</strong>
              <div>{lowest ? `${lowest.playerScore} — ${lowest.season} W${lowest.week} vs ${lowest.opponent}` : "—"}</div>
            </div>
            <div>
              <strong>Largest Margin Win</strong>
              <div>{highestMargin ? `${highestMargin.playerScore - highestMargin.oppScore} — ${highestMargin.season} W${highestMargin.week} vs ${highestMargin.opponent}` : "—"}</div>
            </div>
            <div>
              <strong>Largest Margin Loss</strong>
              <div>{largestLoss ? `${largestLoss.oppScore - largestLoss.playerScore} — ${largestLoss.season} W${largestLoss.week} vs ${largestLoss.opponent}` : "—"}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

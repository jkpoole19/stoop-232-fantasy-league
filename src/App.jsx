import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  Award,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  Search,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";
import { SHEET_URLS } from "./config";
import "./App.css";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "player", label: "Player", icon: UserRound },
  { id: "seasons", label: "Seasons", icon: CalendarDays },
  { id: "records", label: "Records", icon: Award },
  { id: "matchups", label: "Matchup Search", icon: Search },
];

function loadCsv(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (result) =>
        resolve({ fields: result.meta.fields || [], rows: result.data }),
      error: reject,
    });
  });
}

function numberValue(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return String(value ?? "").trim() && Number.isFinite(parsed) ? parsed : null;
}

function formatScore(value) {
  return value == null
    ? "—"
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function seasonOrder(a, b) {
  const left = numberValue(a);
  const right = numberValue(b);
  if (left != null && right != null) return right - left;
  return String(b).localeCompare(String(a), undefined, { numeric: true });
}

function sortedMatchups(matchups) {
  return [...matchups].sort((a, b) => {
    const seasonDifference = seasonOrder(a.Season, b.Season);
    if (seasonDifference !== 0) return seasonDifference;
    return (numberValue(b.Week) ?? 0) - (numberValue(a.Week) ?? 0);
  });
}

function getManagerStats(matchups, managers) {
  const byName = new Map();
  managers.forEach((manager) => {
    if (manager.Manager) {
      byName.set(manager.Manager, {
        name: manager.Manager,
        displayName: manager["Display Name"] || manager.Manager,
        active: String(manager["Active (TRUE/FALSE)"]).toLowerCase() === "true",
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        games: 0,
      });
    }
  });

  matchups.forEach((matchup) => {
    const manager1 = matchup["Manager 1"]?.trim();
    const manager2 = matchup["Manager 2"]?.trim();
    if (!manager1 || !manager2) return;
    [manager1, manager2].forEach((name) => {
      if (!byName.has(name)) {
        byName.set(name, {
          name,
          displayName: name,
          active: true,
          wins: 0,
          losses: 0,
          ties: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          games: 0,
        });
      }
    });

    const score1 = numberValue(matchup["Score 1"]);
    const score2 = numberValue(matchup["Score 2"]);
    const first = byName.get(manager1);
    const second = byName.get(manager2);
    first.games += 1;
    second.games += 1;
    if (score1 != null) first.pointsFor += score1;
    if (score2 != null) second.pointsFor += score2;
    if (score2 != null) first.pointsAgainst += score2;
    if (score1 != null) second.pointsAgainst += score1;
    if (score1 == null || score2 == null) return;
    if (score1 > score2) {
      first.wins += 1;
      second.losses += 1;
    } else if (score2 > score1) {
      second.wins += 1;
      first.losses += 1;
    } else {
      first.ties += 1;
      second.ties += 1;
    }
  });

  return [...byName.values()].sort(
    (a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor || a.name.localeCompare(b.name),
  );
}

function getSeasonRows(matchups, seasons) {
  const seasonNames = new Set([
    ...matchups.map((matchup) => matchup.Season).filter(Boolean),
    ...seasons.map((season) => season.Season).filter(Boolean),
  ]);

  return [...seasonNames].sort(seasonOrder).map((name) => {
    const season = seasons.find((item) => item.Season === name) || {};
    const games = matchups.filter((matchup) => matchup.Season === name);
    return {
      name,
      champion: season.Champion || "—",
      runnerUp: season["Runner-Up"] || "—",
      games: games.length,
      points: games.reduce(
        (total, game) => total + (numberValue(game["Score 1"]) ?? 0) + (numberValue(game["Score 2"]) ?? 0),
        0,
      ),
    };
  });
}

function getRecords(matchups, managerStats, seasonRows) {
  const scoredGames = matchups.flatMap((matchup) => {
    const score1 = numberValue(matchup["Score 1"]);
    const score2 = numberValue(matchup["Score 2"]);
    return [
      score1 == null ? null : { score: score1, manager: matchup["Manager 1"], season: matchup.Season, week: matchup.Week },
      score2 == null ? null : { score: score2, manager: matchup["Manager 2"], season: matchup.Season, week: matchup.Week },
    ].filter(Boolean);
  });
  const highestScore = [...scoredGames].sort((a, b) => b.score - a.score)[0] || null;
  const widestMargin = [...matchups]
    .map((matchup) => {
      const score1 = numberValue(matchup["Score 1"]);
      const score2 = numberValue(matchup["Score 2"]);
      if (score1 == null || score2 == null) return null;
      return {
        margin: Math.abs(score1 - score2),
        winner: score1 >= score2 ? matchup["Manager 1"] : matchup["Manager 2"],
        season: matchup.Season,
        week: matchup.Week,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.margin - a.margin)[0] || null;
  const titles = new Map();
  seasonRows.forEach((season) => {
    if (season.champion && season.champion !== "—" && season.champion !== "TBD") {
      titles.set(season.champion, (titles.get(season.champion) || 0) + 1);
    }
  });
  const mostTitles = [...titles.entries()].sort((a, b) => b[1] - a[1])[0] || null;

  const topScorer = [...managerStats].sort(
    (a, b) => b.pointsFor - a.pointsFor || b.wins - a.wins,
  )[0] || null;

  return { highestScore, widestMargin, mostTitles, topManager: managerStats[0] || null, topScorer };
}

function PageHeading({ eyebrow, title, description, action }) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action}
    </header>
  );
}

function StatCard({ label, value, detail, icon: Icon, tone = "orange" }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-card-top">
        <span>{label}</span>
        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function Dashboard({ matchups, managerStats, seasonRows, onNavigate }) {
  const latestSeason = seasonRows[0];
  const latestGames = sortedMatchups(matchups).slice(0, 5);
  const totalPoints = matchups.reduce(
    (total, game) => total + (numberValue(game["Score 1"]) ?? 0) + (numberValue(game["Score 2"]) ?? 0),
    0,
  );

  return (
    <div className="page-content dashboard-page">
      <PageHeading
        eyebrow="League archive"
        title="The league, at a glance."
        description="Every season, rivalry, and result in one place."
        action={<button className="primary-action" onClick={() => onNavigate("matchups")}><Search size={16} aria-hidden="true" /> Search matchups</button>}
      />
      <section className="stats-grid" aria-label="League summary">
        <StatCard label="Matchups played" value={matchups.length.toLocaleString()} detail="All recorded games" icon={Trophy} tone="orange" />
        <StatCard label="League managers" value={managerStats.length.toLocaleString()} detail="Across the archive" icon={UserRound} tone="green" />
        <StatCard label="Seasons tracked" value={seasonRows.length.toLocaleString()} detail="From first year to latest" icon={CalendarDays} tone="blue" />
        <StatCard label="Points scored" value={Math.round(totalPoints).toLocaleString()} detail="Combined team totals" icon={Award} tone="gold" />
      </section>

      <div className="dashboard-grid">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">From the archive</p><h2>Latest matchups</h2></div>
            <button className="text-action" onClick={() => onNavigate("matchups")}>View all <ChevronRight size={16} aria-hidden="true" /></button>
          </div>
          {latestGames.length ? (
            <div className="recent-list">
              {latestGames.map((game, index) => {
                const score1 = numberValue(game["Score 1"]);
                const score2 = numberValue(game["Score 2"]);
                return (
                  <div className="recent-game" key={`${game.Season}-${game.Week}-${game["Manager 1"]}-${index}`}>
                    <div className="recent-game-meta">{game.Season}<span>Week {game.Week || "—"}</span></div>
                    <div className="recent-game-score">
                      <span className={score1 > score2 ? "winner" : ""}>{game["Manager 1"] || "—"}</span>
                      <strong>{formatScore(score1)} <i>–</i> {formatScore(score2)}</strong>
                      <span className={score2 > score1 ? "winner" : ""}>{game["Manager 2"] || "—"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="empty-state">No matchups have been recorded yet.</p>}
        </section>

        <section className="panel champion-panel">
          <div className="champion-mark"><Trophy size={22} aria-hidden="true" /></div>
          <p className="eyebrow">Latest season {latestSeason?.name || ""}</p>
          <h2>{latestSeason?.champion && latestSeason.champion !== "TBD" ? latestSeason.champion : "Title pending"}</h2>
          <p className="champion-copy">
            {latestSeason?.champion && latestSeason.champion !== "TBD" ? "Latest champion in the league archive." : "The latest season champion has not been recorded yet."}
          </p>
          <button className="text-action" onClick={() => onNavigate("seasons")}>Explore seasons <ChevronRight size={16} aria-hidden="true" /></button>
        </section>
      </div>

      <section className="panel leaders-panel">
        <div className="panel-heading">
          <div><p className="eyebrow">All-time standings</p><h2>Win leaders</h2></div>
          <button className="text-action" onClick={() => onNavigate("player")}>Full player table <ChevronRight size={16} aria-hidden="true" /></button>
        </div>
        <div className="leader-list">
          {managerStats.slice(0, 5).map((manager, index) => (
            <div className="leader-row" key={manager.name}>
              <span className={`leader-rank ${index === 0 ? "first" : ""}`}>{String(index + 1).padStart(2, "0")}</span>
              <div className="leader-name"><strong>{manager.displayName}</strong><span>{manager.games} games</span></div>
              <div className="leader-record">{manager.wins}<span>W</span> {manager.losses}<span>L</span>{manager.ties > 0 && <> {manager.ties}<span>T</span></>}</div>
              <div className="leader-bar"><span style={{ width: `${managerStats[0]?.wins ? (manager.wins / managerStats[0].wins) * 100 : 0}%` }} /></div>
            </div>
          ))}
          {!managerStats.length && <p className="empty-state">Manager standings will appear when data is available.</p>}
        </div>
      </section>
    </div>
  );
}

function PlayerPage({ managerStats }) {
  const [query, setQuery] = useState("");
  const filtered = managerStats.filter((manager) => `${manager.displayName} ${manager.name}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="page-content">
      <PageHeading eyebrow="League directory" title="Player standings" description="Manager profiles ranked by all-time wins." />
      <section className="panel data-panel">
        <div className="table-toolbar">
          <span>{filtered.length} managers</span>
          <label className="search-field"><Search size={16} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a manager" aria-label="Find a manager" /></label>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Rank</th><th>Manager</th><th>Record</th><th>Win %</th><th>Points for</th><th>Points against</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((manager) => {
                const decidedGames = manager.wins + manager.losses + manager.ties;
                const winRate = decidedGames ? (manager.wins / decidedGames) * 100 : 0;
                return (
                  <tr key={manager.name}>
                    <td className="rank-cell">{String(managerStats.indexOf(manager) + 1).padStart(2, "0")}</td>
                    <td><strong>{manager.displayName}</strong><span className="cell-secondary">{manager.name}</span></td>
                    <td>{manager.wins}-{manager.losses}{manager.ties ? `-${manager.ties}` : ""}</td>
                    <td>{winRate.toFixed(1)}%</td><td>{formatScore(manager.pointsFor)}</td><td>{formatScore(manager.pointsAgainst)}</td>
                    <td><span className={`status-pill ${manager.active ? "active" : "inactive"}`}>{manager.active ? "Active" : "Inactive"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && <p className="empty-state">No managers match that search.</p>}
        </div>
      </section>
    </div>
  );
}

function SeasonsPage({ seasonRows }) {
  const championshipCount = seasonRows.filter((season) => season.champion !== "—" && season.champion !== "TBD").length;

  return (
    <div className="page-content">
      <PageHeading eyebrow="Season archive" title="Every year has a story." description="Champions, finalists, and the games that shaped each season." />
      <section className="season-summary-strip">
        <div><span>Seasons tracked</span><strong>{seasonRows.length}</strong></div>
        <div><span>Champions recorded</span><strong>{championshipCount}</strong></div>
        <div><span>Games archived</span><strong>{seasonRows.reduce((total, season) => total + season.games, 0).toLocaleString()}</strong></div>
      </section>
      <section className="panel data-panel">
        <div className="panel-heading table-title"><div><p className="eyebrow">By year</p><h2>Season results</h2></div></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Season</th><th>Champion</th><th>Runner-up</th><th>Matchups</th><th>Points scored</th></tr></thead>
            <tbody>
              {seasonRows.map((season) => (
                <tr key={season.name}><td className="season-year">{season.name}</td><td><strong>{season.champion === "TBD" ? "Pending" : season.champion}</strong></td><td>{season.runnerUp === "TBD" ? "Pending" : season.runnerUp}</td><td>{season.games}</td><td>{Math.round(season.points).toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
          {!seasonRows.length && <p className="empty-state">Season results will appear when data is available.</p>}
        </div>
      </section>
    </div>
  );
}

function RecordCard({ label, value, detail, icon: Icon }) {
  return <article className="record-card"><div className="record-icon"><Icon size={18} aria-hidden="true" /></div><p className="eyebrow">{label}</p><strong className="record-value">{value}</strong><span className="record-detail">{detail}</span></article>;
}

function RecordsPage({ records }) {
  return (
    <div className="page-content">
      <PageHeading eyebrow="League history" title="Records worth keeping." description="The top marks from every matchup in the archive." />
      <section className="records-grid">
        <RecordCard label="Most career wins" value={records.topManager?.wins ?? "—"} detail={records.topManager?.displayName || "No results yet"} icon={Trophy} />
        <RecordCard label="Most points scored" value={records.topScorer ? formatScore(records.topScorer.pointsFor) : "—"} detail={records.topScorer?.displayName || "No results yet"} icon={Award} />
        <RecordCard label="Highest single score" value={records.highestScore ? formatScore(records.highestScore.score) : "—"} detail={records.highestScore ? `${records.highestScore.manager} · ${records.highestScore.season}` : "No results yet"} icon={Zap} />
        <RecordCard label="Widest victory" value={records.widestMargin ? formatScore(records.widestMargin.margin) : "—"} detail={records.widestMargin ? `${records.widestMargin.winner} · ${records.widestMargin.season}` : "No results yet"} icon={ArrowUpRight} />
        <RecordCard label="Most championships" value={records.mostTitles?.[1] ?? "—"} detail={records.mostTitles?.[0] || "No titles recorded"} icon={Trophy} />
      </section>
      <p className="records-note">Records are calculated from the matchup and season sheets currently in the league archive.</p>
    </div>
  );
}

function MatchupsPage({ matchups, seasonRows }) {
  const [query, setQuery] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("All seasons");
  const [typeFilter, setTypeFilter] = useState("All types");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const gameTypes = [...new Set(matchups.map((matchup) => matchup["Game Type"]).filter(Boolean))].sort();
  const shown = sortedMatchups(matchups).filter((matchup) => {
    const searchText = `${matchup["Manager 1"]} ${matchup["Manager 2"]} ${matchup.Season} ${matchup.Week}`.toLowerCase();
    return searchText.includes(query.toLowerCase()) && (seasonFilter === "All seasons" || matchup.Season === seasonFilter) && (typeFilter === "All types" || matchup["Game Type"] === typeFilter);
  });
  const pageCount = Math.max(1, Math.ceil(shown.length / pageSize));
  const pageMatchups = shown.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstResult = shown.length ? (currentPage - 1) * pageSize + 1 : 0;
  const lastResult = Math.min(currentPage * pageSize, shown.length);

  return (
    <div className="page-content">
      <PageHeading eyebrow="Matchup archive" title="Find a matchup." description="Search managers, seasons, weeks, and game types." />
      <section className="panel data-panel matchup-panel">
        <div className="matchup-filters">
          <label className="search-field matchup-search"><Search size={16} aria-hidden="true" /><input value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1); }} placeholder="Search manager or week" aria-label="Search manager or week" /></label>
          <label className="select-field"><span>Season</span><select value={seasonFilter} onChange={(event) => { setSeasonFilter(event.target.value); setCurrentPage(1); }}><option>All seasons</option>{seasonRows.map((season) => <option key={season.name}>{season.name}</option>)}</select></label>
          <label className="select-field"><span>Type</span><select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setCurrentPage(1); }}><option>All types</option>{gameTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        </div>
        <div className="matchup-result-count">{shown.length.toLocaleString()} matchups found</div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Season</th><th>Week</th><th>Manager 1</th><th>Score</th><th>Manager 2</th><th>Score</th><th>Type</th></tr></thead>
            <tbody>
              {pageMatchups.map((game, index) => {
                const score1 = numberValue(game["Score 1"]);
                const score2 = numberValue(game["Score 2"]);
                return (
                  <tr key={`${game.Season}-${game.Week}-${game["Manager 1"]}-${game["Manager 2"]}-${index}`}>
                    <td>{game.Season}</td><td>{game.Week}</td>
                    <td className={score1 > score2 ? "winner-cell" : ""}>{game["Manager 1"]}</td><td className={score1 > score2 ? "score-cell winner-cell" : "score-cell"}>{formatScore(score1)}</td>
                    <td className={score2 > score1 ? "winner-cell" : ""}>{game["Manager 2"]}</td><td className={score2 > score1 ? "score-cell winner-cell" : "score-cell"}>{formatScore(score2)}</td>
                    <td><span className="game-type">{game["Game Type"] || "—"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!shown.length && <p className="empty-state">No matchups match those filters.</p>}
        </div>
        <div className="table-footer">
          <span>Showing {firstResult.toLocaleString()}–{lastResult.toLocaleString()} of {shown.length.toLocaleString()}</span>
          <div className="page-controls">
            <button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}><ChevronLeft size={16} aria-hidden="true" /></button>
            <span>Page {currentPage} of {pageCount}</span>
            <button aria-label="Next page" disabled={currentPage >= pageCount} onClick={() => setCurrentPage((page) => page + 1)}><ChevronRight size={16} aria-hidden="true" /></button>
          </div>
        </div>
      </section>
    </div>
  );
}

function LoadingState() {
  return <div className="status-screen"><div className="loading-mark"><Trophy size={24} /></div><p>Loading the league archive</p><span>Gathering matchups, players, and seasons</span></div>;
}

function ErrorState() {
  return <div className="status-screen error-screen"><div className="loading-mark"><CircleHelp size={24} /></div><p>League data is unavailable</p><span>Check the published sheet links in src/config.js, then reload.</span></div>;
}

export default function App() {
  const [matchups, setMatchups] = useState([]);
  const [managers, setManagers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [status, setStatus] = useState("loading");
  const [currentPage, setCurrentPage] = useState("dashboard");

  useEffect(() => {
    Promise.all(SHEET_URLS.map(loadCsv))
      .then((sheets) => {
        const matchupSheet = sheets.find((sheet) => sheet.fields.includes("Manager 1"));
        if (!matchupSheet) throw new Error("Could not find the Matchups sheet");
        const otherSheets = sheets.filter((sheet) => sheet !== matchupSheet);
        const managerSheet = otherSheets.find((sheet) => sheet.fields.includes("Manager"));
        const seasonSheet = otherSheets.find((sheet) => sheet.fields.includes("Champion"));
        setMatchups(matchupSheet.rows);
        setManagers(managerSheet?.rows || []);
        setSeasons(seasonSheet?.rows || []);
        setStatus("ready");
      })
      .catch((error) => {
        console.error(error);
        setStatus("error");
      });
  }, []);

  const managerStats = useMemo(() => getManagerStats(matchups, managers), [matchups, managers]);
  const seasonRows = useMemo(() => getSeasonRows(matchups, seasons), [matchups, seasons]);
  const records = useMemo(() => getRecords(matchups, managerStats, seasonRows), [matchups, managerStats, seasonRows]);

  if (status === "loading") return <LoadingState />;
  if (status === "error") return <ErrorState />;

  const activeItem = NAV_ITEMS.find((item) => item.id === currentPage) || NAV_ITEMS[0];
  const PageIcon = activeItem.icon;
  const navigate = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#dashboard" onClick={(event) => { event.preventDefault(); navigate("dashboard"); }} aria-label="Fantasy League home">
          <span className="brand-mark"><Trophy size={19} strokeWidth={2.1} aria-hidden="true" /></span>
          <span className="brand-copy"><strong>League</strong><small>ARCHIVE / 232</small></span>
        </a>
        <div className="nav-section-label">Workspace</div>
        <nav className="side-nav" aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button className={`side-nav-item ${currentPage === id ? "selected" : ""}`} key={id} onClick={() => navigate(id)} aria-current={currentPage === id ? "page" : undefined} aria-label={label} title={label}>
              <Icon size={18} strokeWidth={1.9} aria-hidden="true" /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom"><span className="status-dot" /> <span>League data connected</span></div>
      </aside>

      <main className="main-area">
        <div className="topbar">
          <div className="breadcrumb"><span>LEAGUE ARCHIVE</span><ChevronRight size={13} aria-hidden="true" /><strong>{activeItem.label}</strong></div>
          <div className="topbar-mark"><PageIcon size={16} aria-hidden="true" /><span>STOOP 232</span></div>
        </div>
        {currentPage === "dashboard" && <Dashboard matchups={matchups} managerStats={managerStats} seasonRows={seasonRows} onNavigate={navigate} />}
        {currentPage === "player" && <PlayerPage managerStats={managerStats} />}
        {currentPage === "seasons" && <SeasonsPage seasonRows={seasonRows} />}
        {currentPage === "records" && <RecordsPage records={records} />}
        {currentPage === "matchups" && <MatchupsPage matchups={matchups} seasonRows={seasonRows} />}
      </main>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };
type LeaderboardResponse = { leaderboard: LeaderboardEntry[] };

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<LeaderboardResponse>('/api/leaderboard')
      .then((response) => {
        if (active) setLeaderboard(response.leaderboard);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load leaderboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <section>
      <h2>Leaderboard</h2>
      {loading && <p role="status">Loading leaderboard...</p>}
      {error && <p role="alert">Unable to load leaderboard: {error}</p>}
      {!loading && !error && leaderboard.length === 0 && <p>No leaderboard scores yet.</p>}
      {!loading && !error && leaderboard.length > 0 && (
        <table className="table">
          <thead><tr><th scope="col">Rank</th><th scope="col">Team</th><th scope="col">Points</th></tr></thead>
          <tbody>
            {leaderboard.map((entry) => (
              <tr key={entry.rank}>
                <th scope="row">{entry.rank}</th>
                <td>{entry.teamName}</td>
                <td>{entry.totalPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

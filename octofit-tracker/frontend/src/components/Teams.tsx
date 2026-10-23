import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type TeamRecord = { _id?: string; name: string; mascot: string; members: string[] };
type TeamResponse = { teams: TeamRecord[] };

export default function Teams() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<TeamResponse>('/api/teams')
      .then((response) => {
        if (active) setTeams(response.teams);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load teams.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <section>
      <h2>Teams</h2>
      {loading && <p role="status">Loading teams...</p>}
      {error && <p role="alert">Unable to load teams: {error}</p>}
      {!loading && !error && teams.length === 0 && <p>No teams found.</p>}
      {!loading && !error && teams.length > 0 && (
        <ul>
          {teams.map((team) => (
            <li key={team._id ?? team.name}>
              <strong>{team.name}</strong> ({team.mascot}) - {team.members.length} members
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

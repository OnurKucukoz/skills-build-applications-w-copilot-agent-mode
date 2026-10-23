import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type ActivityRecord = {
  _id?: string;
  type: string;
  minutes: number;
  points: number;
  occurredAt?: string;
};
type ActivityResponse = { activities: ActivityRecord[] };

export default function Activities() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<ActivityResponse>('/api/activities')
      .then((response) => {
        if (active) setActivities(response.activities);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load activities.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <section>
      <h2>Activities</h2>
      {loading && <p role="status">Loading activities...</p>}
      {error && <p role="alert">Unable to load activities: {error}</p>}
      {!loading && !error && activities.length === 0 && <p>No activities recorded.</p>}
      {!loading && !error && activities.length > 0 && (
        <ul>
          {activities.map((activity, index) => (
            <li key={activity._id ?? `${activity.type}-${activity.occurredAt ?? index}`}>
              {activity.type}: {activity.minutes} minutes, {activity.points} points
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

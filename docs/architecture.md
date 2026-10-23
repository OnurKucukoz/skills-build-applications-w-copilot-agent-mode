# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep React components responsible for rendering only; use the shared `getJson` client with relative `/api` paths, and expose loading (`role="status"`), empty, success, and failure (`role="alert"`) states. The current screens are read-only and use the seeded Mona account for workout suggestions.
- Logic tier decision: Keep Express route handlers as thin wrappers around explicit TypeScript service functions. Validate request shapes and ObjectId syntax before querying Mongoose, return deliberate 4xx errors for invalid or missing records, and keep the API unauthenticated for this exercise.
- Data tier decision: Use Mongoose references for users, teams, and activities; require user name/email/fitness goal, team name/mascot, and all activity/workout contract fields. Default team members to an empty array, require positive activity/workout minutes, and preserve unrelated records when idempotently seeding demo data.
- Activity tracking approach: `GET /api/activities` returns persisted records. `POST /api/activities` accepts `userId`, `teamId`, `type`, and positive `minutes`; verify both referenced records exist, store them as `user` and `team`, calculate `points` as the submitted minutes, and set `occurredAt` when creating the record. Reject malformed IDs or missing references with 4xx responses rather than Mongoose cast errors.
- Team management approach: `GET /api/teams` lists teams; `POST /api/teams` requires non-empty `name` and `mascot`, accepts an optional array of existing user IDs as `members`, defaults omitted members to `[]`, and returns `400` for invalid input.
- Leaderboard approach: Aggregate activity `points` by team in MongoDB, merge the totals with all teams so teams without activity score zero, sort by descending total (team name breaks ties deterministically), and assign 1-based ranks.
- Workout suggestions approach: Look up the user by normalized email from `GET /api/workouts/suggestions/:userEmail`; prefer workouts whose `focus` matches the user's fitness goal, otherwise match the most recent activity type. Include a human-readable `reason` for each suggestion and return `404` when the email has no matching user.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
- API command: `npm run test:api --prefix octofit-tracker/backend`
- Frontend command: `npm test --prefix octofit-tracker/frontend`
- Backend build command: `npm run build --prefix octofit-tracker/backend`
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`

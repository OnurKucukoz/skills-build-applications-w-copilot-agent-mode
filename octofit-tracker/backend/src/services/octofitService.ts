import { Activity, Team, User, Workout } from '../models/index.js';
import { Types } from 'mongoose';

function clientError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

function requestObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw clientError('Request body must be an object');
  return input as Record<string, unknown>;
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const body = requestObject(input);
  if (typeof body.userId !== 'string' || !Types.ObjectId.isValid(body.userId)) throw clientError('A valid userId is required');
  if (typeof body.teamId !== 'string' || !Types.ObjectId.isValid(body.teamId)) throw clientError('A valid teamId is required');
  if (typeof body.type !== 'string' || !body.type.trim()) throw clientError('Activity type is required');
  if (typeof body.minutes !== 'number' || !Number.isFinite(body.minutes) || body.minutes <= 0) {
    throw clientError('Activity minutes must be a positive number');
  }

  const [user, team] = await Promise.all([
    User.exists({ _id: body.userId }),
    Team.exists({ _id: body.teamId }),
  ]);
  if (!user || !team) throw clientError('The referenced user or team does not exist');

  return Activity.create({
    user: body.userId,
    team: body.teamId,
    type: body.type.trim(),
    minutes: body.minutes,
    points: body.minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const body = requestObject(input);
  if (typeof body.name !== 'string' || !body.name.trim()) throw clientError('Team name is required');
  if (typeof body.mascot !== 'string' || !body.mascot.trim()) throw clientError('Team mascot is required');

  const members = body.members ?? [];
  if (!Array.isArray(members) || members.some((member) => typeof member !== 'string' || !Types.ObjectId.isValid(member))) {
    throw clientError('Team members must be valid user IDs');
  }
  const existingMembers = await User.find({ _id: { $in: members } }).select('_id').lean();
  if (existingMembers.length !== members.length) throw clientError('One or more team members do not exist');

  return Team.create({ name: body.name.trim(), mascot: body.mascot.trim(), members });
}

export async function getLeaderboard() {
  const [teams, pointTotals] = await Promise.all([
    Team.find().lean(),
    Activity.aggregate([{ $group: { _id: '$team', totalPoints: { $sum: '$points' } } }]),
  ]);
  const totalsByTeam = new Map(pointTotals.map((entry) => [entry._id.toString(), entry.totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: totalsByTeam.get(team._id.toString()) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) throw clientError('User not found', 404);

  const [workouts, recentActivities] = await Promise.all([
    Workout.find().lean(),
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(1).lean(),
  ]);
  const normalize = (value: string) => value.trim().toLowerCase();
  const goalMatches = workouts.filter((workout) => normalize(workout.focus) === normalize(user.fitnessGoal));
  const recentActivity = recentActivities[0];
  const activityMatches = recentActivity
    ? workouts.filter((workout) => normalize(workout.focus) === normalize(recentActivity.type))
    : [];
  const matchedWorkouts = goalMatches.length > 0 ? goalMatches : activityMatches;
  const reason = goalMatches.length > 0
    ? `Recommended for your ${user.fitnessGoal} fitness goal.`
    : `Recommended based on your recent ${recentActivity?.type} activity.`;

  return matchedWorkouts.map((workout) => ({ ...workout, reason }));
}

export { User };

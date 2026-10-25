import { asc, eq, sql } from 'drizzle-orm';
import type { SessionUser, TeacherOverviewDto } from '@hub/shared';
import type { Executor } from '../db/client';
import { lessonPlans, users } from '../db/schema';

const sessionUserColumns = { id: users.id, name: users.name, email: users.email, role: users.role };

export async function findSessionUser(db: Executor, userId: string): Promise<SessionUser | null> {
  const [user] = await db.select(sessionUserColumns).from(users).where(eq(users.id, userId));
  return user ?? null;
}

export async function listTeacherOverviews(db: Executor): Promise<TeacherOverviewDto[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      totalPlans: sql<number>`count(${lessonPlans.id})::int`,
      draftPlans: sql<number>`count(${lessonPlans.id}) filter (where ${lessonPlans.status} in ('draft', 'returned'))::int`,
      submittedPlans: sql<number>`count(${lessonPlans.id}) filter (where ${lessonPlans.status} = 'submitted')::int`,
      publishedPlans: sql<number>`count(${lessonPlans.id}) filter (where ${lessonPlans.status} = 'published')::int`,
      lastActivityAt: sql<Date | null>`max(${lessonPlans.updatedAt})`,
    })
    .from(users)
    .leftJoin(lessonPlans, eq(lessonPlans.ownerId, users.id))
    .where(eq(users.role, 'teacher'))
    .groupBy(users.id)
    .orderBy(asc(users.name));

  return rows.map((row) => ({
    ...row,
    lastActivityAt: row.lastActivityAt
      ? new Date(String(row.lastActivityAt)).toISOString()
      : null,
  }));
}

export async function findUserWithPasswordHash(
  db: Executor,
  email: string,
): Promise<(SessionUser & { passwordHash: string }) | null> {
  const [user] = await db
    .select({ ...sessionUserColumns, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email));
  return user ?? null;
}

export async function upsertUser(
  db: Executor,
  user: Omit<SessionUser, 'id'> & { passwordHash: string },
): Promise<string> {
  const [row] = await db
    .insert(users)
    .values(user)
    .onConflictDoUpdate({
      target: users.email,
      set: { name: user.name, role: user.role, passwordHash: user.passwordHash },
    })
    .returning({ id: users.id });
  if (!row) throw new Error(`User upsert returned no row for ${user.email}`);
  return row.id;
}

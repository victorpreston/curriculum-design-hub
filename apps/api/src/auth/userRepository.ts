import { eq } from 'drizzle-orm';
import type { SessionUser } from '@hub/shared';
import type { Executor } from '../db/client';
import { users } from '../db/schema';

const sessionUserColumns = { id: users.id, name: users.name, email: users.email, role: users.role };

export async function findSessionUser(db: Executor, userId: string): Promise<SessionUser | null> {
  const [user] = await db.select(sessionUserColumns).from(users).where(eq(users.id, userId));
  return user ?? null;
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

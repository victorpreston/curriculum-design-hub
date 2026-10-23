import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { SessionUser } from '@hub/shared';
import type { Executor } from '../db/client';
import { findUserWithPasswordHash } from './userRepository';

export const SESSION_COOKIE = 'hub_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
const PASSWORD_HASH_ROUNDS = 10;
const TIMING_SAFE_DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', PASSWORD_HASH_ROUNDS);

const SessionClaimsSchema = z.object({ sub: z.string().uuid() });

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
}

export function signSession(userId: string, secret: string): string {
  return jwt.sign({}, secret, {
    subject: userId,
    expiresIn: SESSION_TTL_SECONDS,
    algorithm: 'HS256',
  });
}

export function verifySession(token: string, secret: string): string | null {
  try {
    const claims = SessionClaimsSchema.safeParse(
      jwt.verify(token, secret, { algorithms: ['HS256'] }),
    );
    return claims.success ? claims.data.sub : null;
  } catch {
    return null;
  }
}

export async function authenticate(
  db: Executor,
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await findUserWithPasswordHash(db, email);
  const passwordMatches = await bcrypt.compare(
    password,
    user?.passwordHash ?? TIMING_SAFE_DUMMY_HASH,
  );
  if (!user || !passwordMatches) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

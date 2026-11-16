import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { getMigrations } from 'better-auth/db/migration';
import { admin } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { building, dev } from '$app/env';
import { getRequestEvent } from '$app/server';
import { db } from './db';

export type Role = 'admin' | 'user';

export interface User {
	id: number;
	email: string;
	name: string;
	role: Role;
	gamesPerWeek: number;
}

export const DEFAULT_GAMES_PER_WEEK = 2;

// `node build` doesn't set NODE_ENV, so Better Auth would quietly fall back to its public default
// secret. Refuse to start instead. `vite build` loads this module too, but never signs anything.
const secret = process.env.BETTER_AUTH_SECRET || (building ? 'build-only-placeholder' : undefined);
if (!secret && !dev) throw new Error('Set BETTER_AUTH_SECRET (e.g. `openssl rand -base64 32`).');

export const auth = betterAuth({
	database: db,
	secret,
	emailAndPassword: { enabled: true, minPasswordLength: 8 },
	session: { expiresIn: 60 * 60 * 24 * 30 },
	user: {
		additionalFields: {
			// how many games a week the person wants; set on /account, never from the sign-up body
			gamesPerWeek: { type: 'number', required: false, defaultValue: DEFAULT_GAMES_PER_WEEK, input: false }
		}
	},
	// Integer user ids, so availability and invites keep plain INTEGER foreign keys.
	advanced: { database: { generateId: 'serial' } },
	databaseHooks: {
		user: {
			create: {
				// Invite-only: every signup path (our form and /api/auth/sign-up) needs a pending invite,
				// which also decides the new user's role.
				before: async (user) => {
					const invite = db.prepare('SELECT role FROM invites WHERE email = ?').get(user.email) as
						| { role: Role }
						| undefined;
					if (!invite) {
						throw new APIError('FORBIDDEN', { message: "This email hasn't been invited yet. Ask an admin to add it." });
					}
					return { data: { ...user, role: invite.role } };
				},
				after: async (user) => {
					db.prepare('DELETE FROM invites WHERE email = ?').run(user.email);
				}
			}
		}
	},
	plugins: [admin(), sveltekitCookies(getRequestEvent)] // sveltekitCookies must stay last
});

/** Creates or updates Better Auth's tables (user, session, account, verification). */
export async function migrateAuth() {
	const { runMigrations } = await getMigrations(auth.options);
	await runMigrations();
}

export function toUser(u: {
	id: string | number;
	email: string;
	name: string;
	role?: string | null;
	gamesPerWeek?: number | null;
}): User {
	return {
		id: Number(u.id),
		email: u.email,
		name: u.name,
		role: u.role === 'admin' ? 'admin' : 'user',
		gamesPerWeek: u.gamesPerWeek ?? DEFAULT_GAMES_PER_WEEK
	};
}

export const MIN_PASSWORD = 8;

export const normalizeEmail = (s: unknown) => String(s ?? '').trim().toLowerCase();
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/**
 * Bootstraps the first admin: when no admin exists, ADMIN_EMAIL is invited as admin, and
 * whoever signs up with that email becomes the admin.
 */
export function seedAdminInvite() {
	const email = normalizeEmail(process.env.ADMIN_EMAIL);
	if (!email) return;
	if (db.prepare(`SELECT 1 FROM "user" WHERE role = 'admin'`).get()) return;
	db.prepare(
		`INSERT INTO invites (email, role) VALUES (?, 'admin') ON CONFLICT (email) DO UPDATE SET role = 'admin'`
	).run(email);
}

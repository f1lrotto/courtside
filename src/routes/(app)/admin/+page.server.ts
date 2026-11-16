import { randomBytes } from 'node:crypto';
import { error, fail } from '@sveltejs/kit';
import { db } from '#lib/server/db.js';
import { auth, isEmail, normalizeEmail } from '#lib/server/auth.js';
import { pageStatus } from '#lib/server/data.js';
import { isRefreshing, refreshAll } from '#lib/server/scraper.js';
import { dict } from '#lib/i18n.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const users = db
		.prepare(`SELECT id, email, name, role FROM "user" ORDER BY name COLLATE NOCASE`)
		.all() as unknown as { id: number; email: string; name: string; role: string }[];
	const invites = db
		.prepare(
			'SELECT i.email, i.role, i.created_at, u.name AS invited_by FROM invites i LEFT JOIN "user" u ON u.id = i.invited_by ORDER BY i.created_at DESC'
		)
		.all() as unknown as { email: string; role: string; created_at: string; invited_by: string | null }[];
	return { users, invites, status: pageStatus(), refreshing: isRefreshing() };
};

const role = (v: FormDataEntryValue | null) => (v === 'admin' ? 'admin' : 'user');

export const actions: Actions = {
	invite: async ({ request, locals }) => {
		const form = await request.formData();
		const email = normalizeEmail(form.get('email'));
		if (!isEmail(email)) return fail(400, { invite: { email, error: dict(locals.lang).signup.badEmail } });
		if (db.prepare('SELECT 1 FROM "user" WHERE email = ?').get(email)) {
			return fail(400, { invite: { email, error: dict(locals.lang).admin.hasAccount(email) } });
		}
		db.prepare(
			'INSERT INTO invites (email, role, invited_by) VALUES (?, ?, ?) ON CONFLICT (email) DO UPDATE SET role = excluded.role'
		).run(email, role(form.get('role')), locals.user!.id);
		return { invite: { ok: email } };
	},

	revoke: async ({ request }) => {
		const email = normalizeEmail((await request.formData()).get('email'));
		db.prepare('DELETE FROM invites WHERE email = ?').run(email);
	},

	setRole: async ({ request, locals }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (id === locals.user!.id) error(400, dict(locals.lang).admin.ownRole);
		await auth.api.setRole({ body: { userId: String(id), role: role(form.get('role')) }, headers: request.headers });
	},

	remove: async ({ request, locals }) => {
		const id = Number((await request.formData()).get('id'));
		if (id === locals.user!.id) error(400, dict(locals.lang).admin.removeYourself);
		// also deletes their sessions, accounts and (by foreign key) availability
		await auth.api.removeUser({ body: { userId: String(id) }, headers: request.headers });
	},

	resetPassword: async ({ request, locals }) => {
		const id = Number((await request.formData()).get('id'));
		if (id === locals.user!.id) error(400, dict(locals.lang).admin.ownPassword);
		// no email sending: the admin hands this temporary password over themselves
		const temporary = randomBytes(9).toString('base64url');
		await auth.api.setUserPassword({ body: { userId: String(id), newPassword: temporary }, headers: request.headers });
		await auth.api.revokeUserSessions({ body: { userId: String(id) }, headers: request.headers });
		return { reset: { id, password: temporary } };
	},

	refresh: async () => {
		void refreshAll();
	}
};

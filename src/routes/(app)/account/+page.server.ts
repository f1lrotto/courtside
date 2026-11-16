import { fail } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth, MIN_PASSWORD } from '#lib/server/auth.js';
import { MAX_GAMES } from '#lib/format.js';
import { db } from '#lib/server/db.js';
import { dict } from '#lib/i18n.js';
import type { Actions } from './$types';

export const actions: Actions = {
	profile: async ({ request, locals }) => {
		const m = dict(locals.lang);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const games = Number(form.get('gamesPerWeek'));
		if (!name || name.length > 40) return fail(400, { profile: { error: m.signup.badName } });
		if (!Number.isInteger(games) || games < 1 || games > MAX_GAMES) {
			return fail(400, { profile: { error: m.account.gamesRange(MAX_GAMES) } });
		}
		db.prepare(`UPDATE "user" SET name = ?, "gamesPerWeek" = ?, "updatedAt" = ? WHERE id = ?`).run(
			name,
			games,
			new Date().toISOString(),
			locals.user!.id
		);
		return { profile: { ok: true } };
	},

	password: async ({ request, locals }) => {
		const m = dict(locals.lang);
		const form = await request.formData();
		const currentPassword = String(form.get('currentPassword') ?? '');
		const newPassword = String(form.get('newPassword') ?? '');
		if (newPassword.length < MIN_PASSWORD) {
			return fail(400, { password: { error: m.account.newShort(MIN_PASSWORD) } });
		}
		try {
			// signs out your other devices; this one gets a fresh session cookie
			await auth.api.changePassword({
				body: { currentPassword, newPassword, revokeOtherSessions: true },
				headers: request.headers
			});
		} catch (e) {
			if (!(e instanceof APIError)) throw e;
			const error = e.body?.code === 'INVALID_PASSWORD' ? m.account.wrongCurrent : e.message;
			return fail(400, { password: { error } });
		}
		return { password: { ok: true } };
	}
};

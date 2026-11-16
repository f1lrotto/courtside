import { fail, redirect } from '@sveltejs/kit';
import { MAX_GAMES } from '#lib/format.js';
import { dict } from '#lib/i18n.js';
import { toMatchSize } from '#lib/match.js';
import { setAway } from '#lib/server/data.js';
import { db, tx } from '#lib/server/db.js';
import { SLOT_MINUTES, minutesNowLocal, todayLocal } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => ({ user: locals.user! });

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const m = dict(locals.lang);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const games = Number(form.get('gamesPerWeek'));
		const matchSize = toMatchSize(form.get('matchSize'));
		const away = form.get('away') === 'on';
		if (!name || name.length > 40) return fail(400, { error: m.signup.badName });
		if (!Number.isInteger(games) || games < 1 || games > MAX_GAMES) return fail(400, { error: m.account.gamesRange(MAX_GAMES) });

		const me = locals.user!.id;
		tx(() => {
			db.prepare(`UPDATE "user" SET name = ?, "gamesPerWeek" = ?, "matchSize" = ?, "updatedAt" = ? WHERE id = ?`).run(
				name,
				games,
				matchSize,
				new Date().toISOString(),
				me
			);
			setAway(me, away, todayLocal(), Math.ceil(minutesNowLocal() / SLOT_MINUTES));
		});
		redirect(303, '/?welcome=done');
	}
};

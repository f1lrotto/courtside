import { fail, redirect } from '@sveltejs/kit';
import { MAX_GAMES } from '#lib/format.js';
import { dict } from '#lib/i18n.js';
import { availability, courts, freeBlocks, people, prices, setAvailability } from '#lib/server/data.js';
import { db, tx } from '#lib/server/db.js';
import { HORIZON_DAYS } from '#lib/server/scraper.js';
import { DAY_PARTS, SLOT_MINUTES, addDays, minutesNowLocal, partSlots, todayLocal, weekday, type DayPart } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

const PARTS = Object.keys(DAY_PARTS) as DayPart[];
const isPart = (s: string): s is DayPart => (PARTS as string[]).includes(s);
const horizon = (today: string) => Array.from({ length: HORIZON_DAYS }, (_, i) => addDays(today, i));

export const load: PageServerLoad = ({ locals }) => {
	const me = locals.user!.id;
	const today = todayLocal();
	const dates = horizon(today);

	// "weekday:part" -> friends who marked any time in it, over the last four weeks and the next two
	const seen = availability([addDays(today, -28), ...dates]);
	const friends: Record<string, Set<number>> = {};
	const mine = new Set<string>();
	for (const [date, byUser] of Object.entries(seen)) {
		for (const [uid, slots] of Object.entries(byUser)) {
			for (const part of PARTS) {
				const [a, b] = DAY_PARTS[part];
				if (!slots.some((s) => s >= a && s < b)) continue;
				const key = `${weekday(date)}:${part}`;
				if (Number(uid) !== me) (friends[key] ??= new Set()).add(Number(uid));
				else if (date >= today) mine.add(key); // re-running setup starts from your upcoming times
			}
		}
	}

	return {
		user: locals.user!,
		today,
		nowSlot: Math.ceil(minutesNowLocal() / SLOT_MINUTES),
		friendCounts: Object.fromEntries(Object.entries(friends).map(([k, v]) => [k, v.size])),
		initial: [...mine],
		// everything the matcher needs, so the counts update in the browser as you pick times
		match: {
			dates,
			people: people(),
			availability: availability(dates),
			courts: courts(),
			freeBlocks: freeBlocks(dates),
			prices: prices(dates)
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const m = dict(locals.lang);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const games = Number(form.get('gamesPerWeek'));
		const picked = form.getAll('block').map(String);
		if (!name || name.length > 40) return fail(400, { error: m.signup.badName });
		if (!Number.isInteger(games) || games < 1 || games > MAX_GAMES) return fail(400, { error: m.account.gamesRange(MAX_GAMES) });

		// "3:evening" -> Thursday evening; anything malformed is dropped
		const blocks = new Map<number, DayPart[]>();
		for (const b of picked) {
			const [wd, part] = b.split(':');
			const d = Number(wd);
			if (Number.isInteger(d) && d >= 0 && d < 7 && isPart(part)) blocks.set(d, [...(blocks.get(d) ?? []), part]);
		}

		const me = locals.user!.id;
		const today = todayLocal();
		const nowSlot = Math.ceil(minutesNowLocal() / SLOT_MINUTES);
		const dates = horizon(today);
		const existing = availability(dates);
		// adds to what's already marked; never removes anything
		const days: Record<string, number[]> = {};
		for (const date of dates) {
			const parts = blocks.get(weekday(date));
			if (!parts) continue;
			const add = parts.flatMap(partSlots).filter((s) => date > today || s >= nowSlot);
			if (add.length === 0) continue;
			days[date] = [...new Set([...(existing[date]?.[me] ?? []), ...add])].sort((a, b) => a - b);
		}
		tx(() => {
			db.prepare(`UPDATE "user" SET name = ?, "gamesPerWeek" = ?, "updatedAt" = ? WHERE id = ?`).run(
				name,
				games,
				new Date().toISOString(),
				me
			);
			setAvailability(me, days);
		});
		redirect(303, '/?welcome=done');
	}
};

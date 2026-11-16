import { error } from '@sveltejs/kit';
import { setAvailability, setNotPlaying } from '#lib/server/data.js';
import { tx } from '#lib/server/db.js';
import { FIRST_SLOT, LAST_SLOT, addDays, isDate, todayLocal, weekStart } from '#lib/time.js';
import type { RequestHandler } from './$types';

/**
 * PUT { days: { "2026-11-18": [36, 37, 38] }, notPlaying?: { week: "2026-11-16", value: true } }
 * replaces the caller's slots for each listed day, then sets whether they're not playing that week
 */
export const PUT: RequestHandler = async ({ request, locals }) => {
	const body = await request.json().catch(() => null);
	const days = body?.days;
	if (!days || typeof days !== 'object') error(400, 'Expected { days }');
	const today = todayLocal();
	const clean: Record<string, number[]> = {};
	for (const [date, slots] of Object.entries(days)) {
		if (!isDate(date) || date < today) error(400, `Bad or past date ${date}`);
		if (!Array.isArray(slots) || !slots.every((s) => Number.isInteger(s) && s >= FIRST_SLOT && s < LAST_SLOT)) {
			error(400, `Bad slots for ${date}`);
		}
		clean[date] = [...new Set(slots as number[])];
	}
	const off = body.notPlaying;
	if (off !== undefined) {
		const week = off?.week;
		if (!isDate(week) || weekStart(week) !== week || addDays(week, 6) < today || typeof off.value !== 'boolean') {
			error(400, 'Bad notPlaying');
		}
	}
	tx(() => {
		setAvailability(locals.user!.id, clean);
		if (off !== undefined) setNotPlaying(locals.user!.id, off.week, off.value);
	});
	return new Response(null, { status: 204 });
};

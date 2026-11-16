import { blocks, courts, pageStatus } from '#lib/server/data.js';
import { HORIZON_DAYS } from '#lib/server/scraper.js';
import { courtKey } from '#lib/match.js';
import { SLOT_MINUTES, addDays, isDate, minutesNowLocal, todayLocal } from '#lib/time.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const today = todayLocal();
	const dates = Array.from({ length: HORIZON_DAYS }, (_, i) => addDays(today, i));
	const asked = url.searchParams.get('day');
	const day = isDate(asked) && dates.includes(asked) ? asked : today;

	const all = blocks(dates);
	const list = courts();
	const doubles = list.filter((c) => c.kind === 'doubles');

	// overview: date -> slot -> number of doubles courts free
	const overview: Record<string, Record<number, number>> = {};
	for (const date of dates) {
		if (!all[date]) continue;
		const row: Record<number, number> = (overview[date] = {});
		for (const c of doubles) {
			for (const [slot, b] of Object.entries(all[date][courtKey(c)] ?? {})) {
				row[Number(slot)] = (row[Number(slot)] ?? 0) + (b.free ? 1 : 0);
			}
		}
	}

	const status = pageStatus();
	return {
		today,
		nowSlot: Math.ceil(minutesNowLocal() / SLOT_MINUTES),
		dates,
		day,
		overview,
		doublesCount: doubles.length,
		courts: list,
		dayBlocks: all[day] ?? {},
		dayStatus: status.filter((s) => s.date === day)
	};
};

import { courtKey, findOpportunities, planWeeks } from '#lib/match.js';
import { GAME_LENGTHS } from '#lib/format.js';
import { availability, blocks, courts, freeBlocks, notPlaying, people, prices } from '#lib/server/data.js';
import { HORIZON_DAYS } from '#lib/server/scraper.js';
import { SLOT_MINUTES, addDays, isDate, minutesNowLocal, todayLocal, weekDates, weekStart } from '#lib/time.js';
import type { VenueId } from '#lib/venues.js';
import type { PageServerLoad } from './$types';


export const load: PageServerLoad = ({ url, locals }) => {
	const len = GAME_LENGTHS.find((l) => String(l) === url.searchParams.get('len')) ?? 90;
	const today = todayLocal();
	const dates = Array.from({ length: HORIZON_DAYS }, (_, i) => addDays(today, i));
	const input = {
		dates,
		people: people(),
		availability: availability(dates),
		courts: courts(),
		freeBlocks: freeBlocks(dates),
		prices: prices(dates),
		duration: len / SLOT_MINUTES,
		notBefore: { date: today, slot: Math.ceil(minutesNowLocal() / SLOT_MINUTES) }
	};
	const doubles = findOpportunities(input, 'doubles');
	const singles = findOpportunities(input, 'singles');
	// Exactly three free: one more friend and it's a doubles game.
	const oneShort = findOpportunities(input, 'doubles', 3, true);

	// how many more windows a 60-minute game would find, to point at when the list is short
	const at60 = (kind: 'doubles' | 'singles', n?: number, exact = false) =>
		len === 60 ? 0 : findOpportunities({ ...input, duration: 60 / SLOT_MINUTES }, kind, n, exact).length;
	const shorter = {
		plan: 0,
		doubles: at60('doubles'),
		singles: at60('singles'),
		oneShort: at60('doubles', 3, true)
	};

	const meMarked = Object.values(input.availability).some((byUser) => (byUser[locals.user!.id] ?? []).length > 0);
	const markedCount = new Set(Object.values(input.availability).flatMap((byUser) => Object.keys(byUser))).size;

	const plan = planWeeks([...doubles, ...singles], input.duration);

	// who-is-free table for the asked week: who marked each slot, and how many doubles courts each club has free
	const asked = url.searchParams.get('week');
	const monday = weekStart(isDate(asked) ? asked : today);
	const weekDays = weekDates(monday);
	const weekBlocks = blocks(weekDays);
	const courtsFree: Record<string, Record<number, Record<VenueId, number>>> = {};
	for (const date of weekDays) {
		if (!weekBlocks[date]) continue;
		const byDate: Record<number, Record<VenueId, number>> = (courtsFree[date] = {});
		for (const c of input.courts.filter((c) => c.kind === 'doubles')) {
			for (const [slot, b] of Object.entries(weekBlocks[date][courtKey(c)] ?? {})) {
				const n = (byDate[Number(slot)] ??= { aurial: 0, oura: 0 });
				if (b.free) n[c.venue as VenueId]++;
			}
		}
	}
	const overlap = { monday, dates: weekDays, today, free: availability(weekDays), courtsFree, notPlaying: notPlaying(monday) };

	return {
		len,
		plan,
		doubles,
		singles,
		oneShort,
		shorter,
		meMarked,
		markedCount,
		people: input.people,
		peopleCount: input.people.length,
		hasCourtData: input.courts.length > 0,
		overlap
	};
};

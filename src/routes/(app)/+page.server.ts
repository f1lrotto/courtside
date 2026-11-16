import { findOpportunities, planWeeks } from '#lib/match.js';
import { GAME_LENGTHS } from '#lib/format.js';
import { availability, courts, freeBlocks, people, prices } from '#lib/server/data.js';
import { HORIZON_DAYS } from '#lib/server/scraper.js';
import { SLOT_MINUTES, addDays, minutesNowLocal, todayLocal } from '#lib/time.js';
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
		hasCourtData: input.courts.length > 0
	};
};

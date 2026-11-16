import { availability, blocks, courts, notPlaying, people } from '#lib/server/data.js';
import { courtKey } from '#lib/match.js';
import { addDays, isDate, todayLocal, weekDates, weekStart } from '#lib/time.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url, locals }) => {
	const today = todayLocal();
	const asked = url.searchParams.get('week');
	const monday = weekStart(isDate(asked) ? asked : today);
	const dates = weekDates(monday);
	const prevDates = weekDates(addDays(monday, -7));
	const me = locals.user!.id;

	const avail = availability(dates);
	const prev = availability(prevDates);
	const everyone = people();
	const names = new Map(everyone.map((p) => [p.id, p.name]));

	const mine: Record<string, number[]> = {};
	// date -> slot -> names of other people free then
	const others: Record<string, Record<number, string[]>> = {};
	for (const date of dates) {
		mine[date] = avail[date]?.[me] ?? [];
		for (const [uid, slots] of Object.entries(avail[date] ?? {})) {
			if (Number(uid) === me) continue;
			for (const s of slots) ((others[date] ??= {})[s] ??= []).push(names.get(Number(uid)) ?? '?');
		}
	}
	const off = notPlaying(monday);
	const filledIn = everyone.filter((p) => dates.some((d) => (avail[d]?.[p.id] ?? []).length > 0));

	// date -> slot -> number of doubles courts free (only days the scraper has covered)
	const doubles = courts().filter((c) => c.kind === 'doubles');
	const all = blocks(dates);
	const courtsFree: Record<string, Record<number, number>> = {};
	for (const date of dates) {
		if (!all[date]) continue;
		const byDate: Record<number, number> = (courtsFree[date] = {});
		for (const c of doubles) {
			for (const [slot, b] of Object.entries(all[date][courtKey(c)] ?? {})) {
				byDate[Number(slot)] = (byDate[Number(slot)] ?? 0) + (b.free ? 1 : 0);
			}
		}
	}

	return {
		monday,
		dates,
		today,
		mine,
		prevWeek: Object.fromEntries(prevDates.map((d, i) => [dates[i], prev[d]?.[me] ?? []])),
		others,
		filledIn,
		notPlaying: off,
		people: everyone,
		courtsFree
	};
};

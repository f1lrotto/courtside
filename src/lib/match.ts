import type { CourtKind } from './venues';
import { weekStart } from './time';

export interface Person {
	id: number;
	name: string;
	/** games a week this person wants at most (the weekly plan respects it) */
	gamesPerWeek?: number;
	/** on a break: not playing any week they haven't marked times in */
	away?: boolean;
}

export interface Court {
	venue: string;
	courtId: string;
	name: string;
	kind: CourtKind;
}

export interface MatchInput {
	dates: string[];
	people: Person[];
	/** date -> userId -> slots the user marked free */
	availability: Record<string, Record<number, number[]>>;
	courts: Court[];
	/** date -> "venue:courtId" -> slot -> price of that free 30-min block (null if unknown) */
	freeBlocks: Record<string, Record<string, Record<number, number | null>>>;
	/** date -> "venue:courtId" -> slot -> price of every published block, free or booked */
	prices?: Record<string, Record<string, Record<number, number | null>>>;
	/** game length in 30-min slots */
	duration: number;
	/** no game may start before this point (now) */
	notBefore?: { date: string; slot: number };
}

export interface CourtOption {
	venue: string;
	courtId: string;
	name: string;
	/** price of the whole court for the game, or null when the club didn't publish all prices */
	price: number | null;
}

export interface StartOption {
	slot: number;
	/** everybody free for the whole game started here, sorted by name */
	players: Person[];
	/** free courts for the whole game, cheapest first */
	courts: CourtOption[];
	/** what the cheapest court of this kind costs for this game, booked or not (null if unknown) */
	floor: number | null;
}

export interface Opportunity {
	date: string;
	kind: CourtKind;
	/** everybody free for at least one start in this window, sorted by name */
	players: Person[];
	firstStart: number;
	lastStart: number;
	/** end of the game started at lastStart */
	end: number;
	starts: StartOption[];
}

export const PLAYERS_NEEDED: Record<CourtKind, number> = { doubles: 4, singles: 2 };

export const courtKey = (c: { venue: string; courtId: string }) => `${c.venue}:${c.courtId}`;

const byName = (a: Person, b: Person) => a.name.localeCompare(b.name) || a.id - b.id;

/**
 * Finds every game start where enough friends are free for the whole game and at least one
 * court of the right kind is free for the whole game. Consecutive starts are merged into one
 * window even when the group changes along the way (each start keeps its own players), so one
 * free evening reads as one option. With `exact`, a start qualifies only with exactly `needed`
 * players free (used for "one short").
 */
export function findOpportunities(
	input: MatchInput,
	kind: CourtKind,
	needed = PLAYERS_NEEDED[kind],
	exact = false
): Opportunity[] {
	const { duration } = input;
	const courts = input.courts.filter((c) => c.kind === kind);
	const out: Opportunity[] = [];

	for (const date of input.dates) {
		const free = input.availability[date] ?? {};
		const sets = input.people.map((p) => ({ p, slots: new Set(free[p.id] ?? []) }));
		const blocks = input.freeBlocks[date] ?? {};
		const allSlots = sets.flatMap((s) => [...s.slots]);
		if (allSlots.length === 0) continue;
		const lo = Math.min(...allSlots);
		const hi = Math.max(...allSlots);
		let open: Opportunity | null = null;

		for (let start = lo; start + duration - 1 <= hi; start++) {
			const span = Array.from({ length: duration }, (_, i) => start + i);
			const tooEarly =
				input.notBefore &&
				(date < input.notBefore.date || (date === input.notBefore.date && start < input.notBefore.slot));
			const players = tooEarly ? [] : sets.filter((s) => span.every((x) => s.slots.has(x))).map((s) => s.p);
			const enough = exact ? players.length === needed : players.length >= needed;
			const options: CourtOption[] = [];
			if (enough) {
				for (const c of courts) {
					const b = blocks[courtKey(c)];
					if (!b || !span.every((x) => x in b)) continue;
					options.push({ venue: c.venue, courtId: c.courtId, name: c.name, price: gamePrice(b, span) });
				}
			}
			if (options.length === 0) {
				open = null;
				continue;
			}
			options.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
			const floor = cheapest(courts.map((c) => gamePrice(input.prices?.[date]?.[courtKey(c)], span)));
			const option = { slot: start, players: [...players].sort(byName), courts: options, floor };
			if (open && open.lastStart === start - 1) {
				open.lastStart = start;
				open.end = start + duration;
				open.starts.push(option);
				for (const p of players) if (!open.players.some((q) => q.id === p.id)) open.players.push(p);
				open.players.sort(byName);
			} else {
				open = {
					date,
					kind,
					players: [...option.players],
					firstStart: start,
					lastStart: start,
					end: start + duration,
					starts: [option]
				};
				out.push(open);
			}
		}
	}
	return out;
}

/** Price of one court for the whole span, or null when any block's price is missing. */
function gamePrice(blocks: Record<number, number | null> | undefined, span: number[]): number | null {
	let sum = 0;
	for (const x of span) {
		const p = blocks?.[x];
		if (typeof p !== 'number') return null;
		sum += p;
	}
	return sum;
}

function cheapest(prices: (number | null)[]): number | null {
	const known = prices.filter((p): p is number => p !== null);
	return known.length ? Math.min(...known) : null;
}

/** How much more the cheapest free court costs than the cheapest court of its kind at that time. */
export function premium(s: StartOption): number {
	const price = s.courts[0]?.price;
	return price != null && s.floor != null ? Math.max(price - s.floor, 0) : 0;
}

/** The start to suggest: the cheapest free court, then the most players, then the earliest. */
export function bestStart(o: Opportunity): number {
	const cost = (s: StartOption) => s.courts[0]?.price ?? Infinity;
	let best = 0;
	o.starts.forEach((s, i) => {
		const b = o.starts[best];
		if (cost(s) < cost(b) || (cost(s) === cost(b) && s.players.length > b.players.length)) best = i;
	});
	return best;
}

export interface PlannedGame {
	date: string;
	kind: CourtKind;
	slot: number;
	end: number;
	players: Person[];
	court: CourtOption;
	/** how much more the court costs than the cheapest court of its kind at that time */
	premium: number;
}

/**
 * Picks a set of games per week from the opportunities: cheapest per player first, each game
 * filled with the free players who have played least that week, nobody above their gamesPerWeek,
 * nobody twice on one day, and no court used by two games at once.
 */
export function planWeeks(opps: Opportunity[], duration: number, defaultCap = 2): PlannedGame[] {
	const candidates = opps.flatMap((o) =>
		o.starts.map((s) => ({ o, s, each: (s.courts[0]?.price ?? Infinity) / PLAYERS_NEEDED[o.kind] }))
	);
	candidates.sort((a, b) => a.each - b.each || a.o.date.localeCompare(b.o.date) || a.s.slot - b.s.slot);

	const played = new Map<string, number>(); // week:personId -> games
	const busyDay = new Set<string>(); // date:personId
	const plan: PlannedGame[] = [];
	const cap = (p: Person) => p.gamesPerWeek ?? defaultCap;

	for (const { o, s } of candidates) {
		const week = weekStart(o.date);
		const count = (p: Person) => played.get(`${week}:${p.id}`) ?? 0;
		const eligible = s.players.filter((p) => count(p) < cap(p) && !busyDay.has(`${o.date}:${p.id}`));
		const needed = PLAYERS_NEEDED[o.kind];
		if (eligible.length < needed) continue;
		const taken = new Set(
			plan
				.filter((g) => g.date === o.date && g.slot < s.slot + duration && s.slot < g.end)
				.map((g) => courtKey(g.court))
		);
		const court = s.courts.find((c) => !taken.has(courtKey(c)));
		if (!court) continue;
		const players = [...eligible]
			.sort((a, b) => count(a) - count(b) || byName(a, b))
			.slice(0, needed)
			.sort(byName);
		for (const p of players) {
			played.set(`${week}:${p.id}`, count(p) + 1);
			busyDay.add(`${o.date}:${p.id}`);
		}
		const extra = court.price != null && s.floor != null ? Math.max(court.price - s.floor, 0) : 0;
		plan.push({ date: o.date, kind: o.kind, slot: s.slot, end: s.slot + duration, players, court, premium: extra });
	}
	return plan.sort((a, b) => a.date.localeCompare(b.date) || a.slot - b.slot);
}

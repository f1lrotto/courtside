import { describe, expect, it } from 'vitest';
import { bestStart, findOpportunities, planWeeks, premium, type MatchInput } from './match';
import { timeToSlot as t } from './time';

const range = (from: string, to: string) =>
	Array.from({ length: t(to) - t(from) }, (_, i) => t(from) + i);
const freeOver = (from: string, to: string, price = 10) =>
	Object.fromEntries(range(from, to).map((s) => [s, price]));

const D = '2026-11-18';
const people = ['Ana', 'Ben', 'Cyril', 'Dana', 'Eva'].map((name, i) => ({ id: i + 1, name }));
const courts = [
	{ venue: 'aurial', courtId: '1', name: '1 - kurt ACROSS', kind: 'doubles' as const },
	{ venue: 'oura', courtId: '1', name: 'kurt 1', kind: 'doubles' as const },
	{ venue: 'oura', courtId: '3', name: 'Single', kind: 'singles' as const }
];

function input(over: Partial<MatchInput>): MatchInput {
	return { dates: [D], people, availability: {}, courts, freeBlocks: {}, duration: 3, ...over };
}

describe('findOpportunities', () => {
	it('needs four players free for the whole game and a doubles court free for the whole game', () => {
		const res = findOpportunities(
			input({
				availability: {
					[D]: {
						1: range('18:00', '21:00'),
						2: range('18:00', '21:00'),
						3: range('18:30', '21:00'),
						4: range('18:00', '20:00'), // leaves at 20:00
						5: range('08:00', '09:00')
					}
				},
				// Aurial court 1 free 18:00-20:30 (so 19:00-20:30 is the last 90-min game it can host)
				freeBlocks: { [D]: { 'aurial:1': freeOver('18:00', '20:30', 11) } }
			}),
			'doubles'
		);
		// Ana, Ben, Cyril, Dana together: 18:30-20:00 is the only 90-min window
		expect(res).toHaveLength(1);
		expect(res[0].players.map((p) => p.name)).toEqual(['Ana', 'Ben', 'Cyril', 'Dana']);
		expect([res[0].firstStart, res[0].lastStart, res[0].end]).toEqual([t('18:30'), t('18:30'), t('20:00')]);
		expect(res[0].starts[0].courts).toEqual([{ venue: 'aurial', courtId: '1', name: '1 - kurt ACROSS', price: 33 }]);
	});

	it('does not count a court that is booked in the middle of the game', () => {
		const blocks = freeOver('18:00', '21:00');
		delete blocks[t('19:00')];
		const all = range('18:00', '21:00');
		const res = findOpportunities(
			input({
				availability: { [D]: { 1: all, 2: all, 3: all, 4: all } },
				freeBlocks: { [D]: { 'oura:1': blocks } }
			}),
			'doubles'
		);
		// only 19:30-21:00 avoids the 19:00 booking
		expect(res.map((o) => [o.firstStart, o.lastStart])).toEqual([[t('19:30'), t('19:30')]]);
	});

	it('merges one continuous evening into one window even when someone joins later', () => {
		const all = range('17:00', '21:00');
		const res = findOpportunities(
			input({
				availability: { [D]: { 1: all, 2: all, 3: all, 4: all, 5: range('19:00', '21:00') } },
				freeBlocks: { [D]: { 'aurial:1': freeOver('17:00', '21:00') } }
			}),
			'doubles'
		);
		expect(res.map((o) => [o.players.length, o.firstStart, o.lastStart])).toEqual([[5, t('17:00'), t('19:30')]]);
		expect(res[0].starts.map((s) => s.players.length)).toEqual([4, 4, 4, 4, 5, 5]);
		expect(res[0].starts[bestStart(res[0])].slot).toBe(t('19:00'));
	});

	it('splits windows at a gap and, with exact, keeps only starts with exactly three free', () => {
		const all = range('17:00', '21:00');
		const res = findOpportunities(
			input({
				duration: 2,
				availability: { [D]: { 1: all, 2: all, 3: all, 4: range('18:00', '19:00') } },
				freeBlocks: { [D]: { 'aurial:1': freeOver('17:00', '21:00') } }
			}),
			'doubles',
			3,
			true
		);
		// the 4th is free 18:00-19:00, so only the 18:00 start (18:00-19:00) has four and is not "one short"
		expect(res.map((o) => [o.firstStart, o.lastStart])).toEqual([
			[t('17:00'), t('17:30')],
			[t('18:30'), t('20:00')]
		]);
		expect(res.every((o) => o.starts.every((s) => s.players.length === 3))).toBe(true);
	});

	it('lists the cheapest court first', () => {
		const all = range('17:00', '19:00');
		const res = findOpportunities(
			input({
				duration: 2,
				availability: { [D]: { 1: all, 2: all, 3: all, 4: all } },
				freeBlocks: { [D]: { 'aurial:1': freeOver('17:00', '18:00', 11), 'oura:1': freeOver('17:00', '18:00', 9) } }
			}),
			'doubles'
		);
		expect(res[0].starts[0].courts.map((c) => [c.venue, c.price])).toEqual([
			['oura', 18],
			['aurial', 22]
		]);
	});

	it('suggests the cheapest start and flags a premium court when the cheaper one is booked', () => {
		const four = range('18:00', '20:00');
		const res = findOpportunities(
			input({
				duration: 2,
				// a fifth player joins at 19:00, when only the premium court is still free
				availability: { [D]: { 1: four, 2: four, 3: four, 4: four, 5: range('19:00', '20:00') } },
				freeBlocks: { [D]: { 'aurial:1': freeOver('18:00', '20:00', 22), 'oura:1': freeOver('18:00', '19:00', 18) } },
				// Oura is booked 19:00-20:00, but the club still publishes its price
				prices: { [D]: { 'aurial:1': freeOver('18:00', '20:00', 22), 'oura:1': freeOver('18:00', '20:00', 18) } }
			}),
			'doubles'
		);
		const [o] = res;
		expect(o.starts.map((s) => [s.slot, s.players.length, s.courts[0].price, premium(s)])).toEqual([
			[t('18:00'), 4, 36, 0],
			[t('18:30'), 4, 44, 8],
			[t('19:00'), 5, 44, 8]
		]);
		expect(o.starts[bestStart(o)].slot).toBe(t('18:00'));
	});

	it('pairs two players only with the singles court, never with doubles courts', () => {
		const two = range('10:00', '12:00');
		const base = input({
			duration: 2,
			availability: { [D]: { 1: two, 2: two } },
			freeBlocks: { [D]: { 'aurial:1': freeOver('08:00', '22:00'), 'oura:1': freeOver('08:00', '22:00') } }
		});
		expect(findOpportunities(base, 'singles')).toEqual([]);
		expect(findOpportunities(base, 'doubles')).toEqual([]);
		base.freeBlocks[D]['oura:3'] = freeOver('10:30', '12:00', 7.5);
		const res = findOpportunities(base, 'singles');
		expect(res.map((o) => [o.firstStart, o.lastStart, o.starts[0].courts[0].price])).toEqual([[t('10:30'), t('11:00'), 15]]);
	});

	it('leaves people out of the kinds of game they do not play', () => {
		const all = range('10:00', '12:00');
		const sized = people.map((p) => ({
			...p,
			matchSize: p.name === 'Ana' ? ('singles' as const) : p.name === 'Ben' ? ('doubles' as const) : undefined
		}));
		const res = (kind: 'doubles' | 'singles') =>
			findOpportunities(
				input({
					duration: 2,
					people: sized,
					availability: { [D]: { 1: all, 2: all, 3: all, 4: all, 5: all } },
					freeBlocks: { [D]: { 'aurial:1': freeOver('10:00', '12:00'), 'oura:3': freeOver('10:00', '12:00') } }
				}),
				kind
			).flatMap((o) => o.starts.map((s) => s.players.map((p) => p.name).join()));
		// singles-only Ana is never in a doubles game, doubles-only Ben never in a singles game
		expect(res('doubles')).toEqual(Array(3).fill('Ben,Cyril,Dana,Eva'));
		expect(res('singles')).toEqual(Array(3).fill('Ana,Cyril,Dana,Eva'));
	});

	it('skips starts that are already in the past', () => {
		const all = range('08:00', '12:00');
		const res = findOpportunities(
			input({
				duration: 2,
				availability: { [D]: { 1: all, 2: all, 3: all, 4: all } },
				freeBlocks: { [D]: { 'aurial:1': freeOver('08:00', '12:00') } },
				notBefore: { date: D, slot: t('10:30') }
			}),
			'doubles'
		);
		expect(res.map((o) => [o.firstStart, o.lastStart])).toEqual([[t('10:30'), t('11:00')]]);
	});

	it('plans the week within everyone\'s games-per-week, giving games to whoever has played least', () => {
		const days = ['2026-11-18', '2026-11-19', '2026-11-20']; // Wed, Thu, Fri of one week
		const evening = range('18:00', '20:00');
		const capped = people.map((p) => ({ ...p, gamesPerWeek: p.name === 'Ana' ? 3 : 2 }));
		const opps = findOpportunities(
			{
				dates: days,
				people: capped,
				availability: Object.fromEntries(days.map((d) => [d, Object.fromEntries(capped.map((p) => [p.id, evening]))])),
				courts,
				freeBlocks: Object.fromEntries(days.map((d) => [d, { 'aurial:1': freeOver('18:00', '20:00') }])),
				duration: 2
			},
			'doubles'
		);
		const plan = planWeeks(opps, 2);
		// Eva sits out Wednesday, so she gets Thursday ahead of Dana; by Friday only three can still play
		expect(plan.map((g) => [g.date, g.players.map((p) => p.name).join()])).toEqual([
			['2026-11-18', 'Ana,Ben,Cyril,Dana'],
			['2026-11-19', 'Ana,Ben,Cyril,Eva']
		]);
	});
});

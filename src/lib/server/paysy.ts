import { timeToSlot } from '../time';

export interface ParsedCourt {
	courtId: string;
	name: string;
	/** one entry per 30-minute block the club publishes for that day */
	blocks: { slot: number; available: boolean; price: number | null }[];
}

export interface ParsedDay {
	date: string;
	courts: ParsedCourt[];
}

interface PaysyBlock {
	from: string;
	to: string;
	is_available: boolean;
	price?: number | null;
}

interface PaysyObject {
	id: number;
	name: string;
	blocks?: PaysyBlock[];
}

const decode = (s: string) =>
	s.replace(/&(quot|amp|lt|gt|#0?39);/g, (_, e) =>
		e === 'quot' ? '"' : e === 'amp' ? '&' : e === 'lt' ? '<' : e === 'gt' ? '>' : "'"
	);

/**
 * Paysy renders its Livewire reservation component server-side and embeds the full state in
 * `wire:initial-data`. Each court ("object") lists its 30-minute blocks with `is_available`,
 * which already accounts for bookings and closures. A page can hold several reservation
 * components (Oura shows doubles and singles as separate services).
 */
export function parsePaysyPage(html: string, expectedDate: string): ParsedDay {
	const courts: ParsedCourt[] = [];
	for (const m of html.matchAll(/wire:initial-data="([^"]*)"/g)) {
		const comp = JSON.parse(decode(m[1]));
		if (!String(comp?.fingerprint?.name).endsWith('websites.reservations')) continue;
		const data = comp.serverMemo?.data ?? {};
		const [d, mo, y] = String(data.date ?? '').split('.');
		const date = `${y}-${mo}-${d}`;
		if (date !== expectedDate) {
			throw new Error(`page shows ${data.date}, expected ${expectedDate}`);
		}
		for (const o of (data.objects ?? []) as PaysyObject[]) {
			courts.push({
				courtId: String(o.id),
				name: o.name.trim(),
				blocks: (o.blocks ?? [])
					.filter((b) => b.from.startsWith(date))
					.map((b) => ({
						slot: timeToSlot(b.from.slice(11, 16)),
						available: b.is_available === true,
						price: typeof b.price === 'number' ? b.price : null
					}))
			});
		}
	}
	if (courts.length === 0) throw new Error('no reservation calendar on page (blocked or layout changed)');
	return { date: expectedDate, courts };
}

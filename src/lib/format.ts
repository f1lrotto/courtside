export function timeAgo(iso: string, now = Date.now()): string {
	const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
	if (s < 60) return 'just now';
	const m = Math.round(s / 60);
	if (m < 60) return `${m} min ago`;
	const h = Math.round(m / 60);
	if (h < 24) return `${h} h ago`;
	return `${Math.round(h / 24)} d ago`;
}

export const euro = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2)} €`;

export const initials = (name: string) =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0]!.toUpperCase())
		.join('');

/** stable, distinct-ish hue per person id */
export const personHue = (id: number) => (id * 137.508) % 360;

export const GAME_LENGTHS = [60, 90, 120] as const;

/** upper bound for a person's games per week (one a day) */
export const MAX_GAMES = 7;

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

// Dates are local Bratislava calendar days as "YYYY-MM-DD"; a slot is a 30-minute block,
// numbered by minutes since midnight / 30 (slot 16 = 08:00, slot 44 = 22:00).
export const TZ = 'Europe/Bratislava';
export const SLOT_MINUTES = 30;
export const FIRST_SLOT = 16; // 08:00, both clubs open
export const LAST_SLOT = 44; // 22:00, both clubs close (exclusive)
export const DAY_SLOTS = Array.from({ length: LAST_SLOT - FIRST_SLOT }, (_, i) => FIRST_SLOT + i);

export function slotLabel(slot: number): string {
	const m = slot * SLOT_MINUTES;
	return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function timeToSlot(hhmm: string): number {
	const [h, m] = hhmm.split(':').map(Number);
	return (h * 60 + m) / SLOT_MINUTES;
}

function parts(now: Date) {
	const p = Object.fromEntries(
		new Intl.DateTimeFormat('en-GB', {
			timeZone: TZ,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		})
			.formatToParts(now)
			.map((x) => [x.type, x.value])
	);
	return p as Record<string, string>;
}

export function todayLocal(now = new Date()): string {
	const p = parts(now);
	return `${p.year}-${p.month}-${p.day}`;
}

export function minutesNowLocal(now = new Date()): number {
	const p = parts(now);
	return Number(p.hour) * 60 + Number(p.minute);
}

export function addDays(date: string, n: number): string {
	const [y, m, d] = date.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday */
export function weekday(date: string): number {
	const [y, m, d] = date.split('-').map(Number);
	return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function weekStart(date: string): string {
	return addDays(date, -weekday(date));
}

export function weekDates(monday: string): string[] {
	return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function isDate(s: unknown): s is string {
	return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && addDays(s, 0) === s;
}

/** "17.11.2026", the format Paysy's ?date= parameter takes */
export const paysyDate = (date: string) => date.split('-').reverse().join('.');


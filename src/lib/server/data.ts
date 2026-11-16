import { db } from './db';
import type { Court, Person } from '../match';
import { courtKey } from '../match';
import { VENUES } from '../venues';
import { weekStart } from '../time';

export function people(): Person[] {
	return db
		.prepare(`SELECT id, name, coalesce("gamesPerWeek", 2) AS gamesPerWeek FROM "user" ORDER BY name COLLATE NOCASE`)
		.all() as unknown as Person[];
}

/** date -> userId -> slots */
export function availability(dates: string[]): Record<string, Record<number, number[]>> {
	const out: Record<string, Record<number, number[]>> = {};
	if (dates.length === 0) return out;
	const rows = db
		.prepare('SELECT user_id, date, slot FROM availability WHERE date BETWEEN ? AND ? ORDER BY slot')
		.all(dates[0], dates[dates.length - 1]) as { user_id: number; date: string; slot: number }[];
	for (const r of rows) ((out[r.date] ??= {})[r.user_id] ??= []).push(r.slot);
	return out;
}

/** marking any time in a week means playing that week, so it drops that week's "not playing" */
export function setAvailability(userId: number, days: Record<string, number[]>) {
	const del = db.prepare('DELETE FROM availability WHERE user_id = ? AND date = ?');
	const ins = db.prepare('INSERT OR IGNORE INTO availability (user_id, date, slot) VALUES (?, ?, ?)');
	for (const [date, slots] of Object.entries(days)) {
		del.run(userId, date);
		for (const s of slots) ins.run(userId, date, s);
		if (slots.length > 0) setNotPlaying(userId, weekStart(date), false);
	}
}

/** ids of people not playing the week starting on this Monday */
export function notPlaying(monday: string): number[] {
	return (db.prepare('SELECT user_id FROM weeks_off WHERE week = ?').all(monday) as { user_id: number }[]).map((r) => r.user_id);
}

export function setNotPlaying(userId: number, monday: string, off: boolean) {
	if (off) db.prepare('INSERT OR IGNORE INTO weeks_off (user_id, week) VALUES (?, ?)').run(userId, monday);
	else db.prepare('DELETE FROM weeks_off WHERE user_id = ? AND week = ?').run(userId, monday);
}

const venueOrder = (v: string) => VENUES.findIndex((x) => x.id === v);

export function courts(): Court[] {
	const rows = db.prepare('SELECT venue, court_id AS courtId, name, kind, sort FROM courts').all() as unknown as (Court & {
		sort: number;
	})[];
	return rows
		.sort((a, b) => venueOrder(a.venue) - venueOrder(b.venue) || a.sort - b.sort)
		.map(({ venue, courtId, name, kind }) => ({ venue, courtId, name, kind }));
}

/** date -> "venue:court" -> slot -> { available, price } for every published block */
export function blocks(dates: string[]) {
	const out: Record<string, Record<string, Record<number, { free: boolean; price: number | null }>>> = {};
	if (dates.length === 0) return out;
	const rows = db
		.prepare('SELECT venue, court_id, date, slot, available, price FROM court_blocks WHERE date BETWEEN ? AND ?')
		.all(dates[0], dates[dates.length - 1]) as {
		venue: string;
		court_id: string;
		date: string;
		slot: number;
		available: number;
		price: number | null;
	}[];
	for (const r of rows) {
		((out[r.date] ??= {})[courtKey({ venue: r.venue, courtId: r.court_id })] ??= {})[r.slot] = {
			free: r.available === 1,
			price: r.price
		};
	}
	return out;
}

/** only the free blocks, in the shape the matcher wants */
export function freeBlocks(dates: string[]) {
	const all = blocks(dates);
	const out: Record<string, Record<string, Record<number, number | null>>> = {};
	for (const [date, byCourt] of Object.entries(all)) {
		for (const [key, slots] of Object.entries(byCourt)) {
			for (const [slot, b] of Object.entries(slots)) {
				if (b.free) ((out[date] ??= {})[key] ??= {})[Number(slot)] = b.price;
			}
		}
	}
	return out;
}

/** every published block's price, booked or free, to tell how cheap a court could have been */
export function prices(dates: string[]) {
	const out: Record<string, Record<string, Record<number, number | null>>> = {};
	for (const [date, byCourt] of Object.entries(blocks(dates))) {
		for (const [key, slots] of Object.entries(byCourt)) {
			for (const [slot, b] of Object.entries(slots)) ((out[date] ??= {})[key] ??= {})[Number(slot)] = b.price;
		}
	}
	return out;
}

export interface PageStatus {
	venue: string;
	date: string;
	fetched_at: string | null;
	attempted_at: string;
	error: string | null;
}

export function pageStatus(): PageStatus[] {
	return db.prepare('SELECT venue, date, fetched_at, attempted_at, error FROM court_pages ORDER BY date').all() as unknown as PageStatus[];
}

/** most recent successful fetch across all venues */
export function lastUpdated(): string | null {
	const r = db.prepare('SELECT MAX(fetched_at) AS t FROM court_pages').get() as { t: string | null };
	return r.t;
}

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { db, tx } from './db';
import { parsePaysyPage, type ParsedDay } from './paysy';
import { VENUES, bookingUrl, courtKind, type VenueId } from '../venues';
import { addDays, todayLocal } from '../time';

const run = promisify(execFile);

export const HORIZON_DAYS = 14;
const REFRESH_EVERY_MS = 15 * 60_000;
const UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// Cloudflare in front of Paysy answers Node's own fetch with a 403 challenge (it fingerprints
// the TLS client), while curl gets the page, so pages are fetched with curl.
async function fetchPage(url: string): Promise<string> {
	const { stdout } = await run(
		'curl',
		['-sS', '--compressed', '--max-time', '25', '-A', UA, '-H', 'Accept-Language: sk,en;q=0.8', '-w', '\n%{http_code}', url],
		{ maxBuffer: 20 * 1024 * 1024 }
	);
	const cut = stdout.lastIndexOf('\n');
	const status = stdout.slice(cut + 1).trim();
	if (status !== '200') throw new Error(`HTTP ${status}`);
	return stdout.slice(0, cut);
}

function store(venue: VenueId, day: ParsedDay) {
	tx(() => {
		const upsertCourt = db.prepare(
			`INSERT INTO courts (venue, court_id, name, kind, sort) VALUES (?, ?, ?, ?, ?)
			 ON CONFLICT (venue, court_id) DO UPDATE SET name = excluded.name, kind = excluded.kind, sort = excluded.sort`
		);
		const insertBlock = db.prepare(
			'INSERT OR REPLACE INTO court_blocks (venue, court_id, date, slot, available, price) VALUES (?, ?, ?, ?, ?, ?)'
		);
		db.prepare('DELETE FROM court_blocks WHERE venue = ? AND date = ?').run(venue, day.date);
		day.courts.forEach((c, i) => {
			upsertCourt.run(venue, c.courtId, c.name, courtKind(c.name), i);
			for (const b of c.blocks) {
				insertBlock.run(venue, c.courtId, day.date, b.slot, b.available ? 1 : 0, b.price);
			}
		});
		db.prepare(
			`INSERT INTO court_pages (venue, date, fetched_at, attempted_at, error) VALUES (?, ?, ?, ?, NULL)
			 ON CONFLICT (venue, date) DO UPDATE SET fetched_at = excluded.fetched_at, attempted_at = excluded.attempted_at, error = NULL`
		).run(venue, day.date, new Date().toISOString(), new Date().toISOString());
	});
}

function recordError(venue: VenueId, date: string, error: string) {
	db.prepare(
		`INSERT INTO court_pages (venue, date, attempted_at, error) VALUES (?, ?, ?, ?)
		 ON CONFLICT (venue, date) DO UPDATE SET attempted_at = excluded.attempted_at, error = excluded.error`
	).run(venue, date, new Date().toISOString(), error);
}

export async function refreshDay(venue: VenueId, date: string): Promise<void> {
	try {
		store(venue, parsePaysyPage(await fetchPage(bookingUrl(venue, date)), date));
	} catch (e) {
		recordError(venue, date, e instanceof Error ? e.message : String(e));
	}
}

let running: Promise<void> | null = null;

/** Refreshes every venue for the next HORIZON_DAYS days; concurrent callers share one run. */
export function refreshAll(): Promise<void> {
	running ??= (async () => {
		const today = todayLocal();
		const dates = Array.from({ length: HORIZON_DAYS }, (_, i) => addDays(today, i));
		// One request at a time per venue, venues in parallel: gentle on the clubs' servers.
		await Promise.all(
			VENUES.map(async (v) => {
				for (const date of dates) await refreshDay(v.id, date);
			})
		);
		db.prepare('DELETE FROM court_blocks WHERE date < ?').run(today);
		db.prepare('DELETE FROM court_pages WHERE date < ?').run(today);
	})().finally(() => {
		running = null;
	});
	return running;
}

export const isRefreshing = () => running !== null;

let timer: ReturnType<typeof setInterval> | undefined;

export function startScheduler() {
	if (timer || process.env.SCRAPER === 'off') return;
	void refreshAll();
	timer = setInterval(() => void refreshAll(), REFRESH_EVERY_MS);
	timer.unref();
}

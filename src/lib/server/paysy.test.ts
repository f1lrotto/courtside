import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePaysyPage } from './paysy';
import { timeToSlot as t } from '../time';

// Reservation components captured from https://booking.ourapadel.com/?date=17.11.2026
const html = readFileSync(new URL('./fixtures/oura-2026-11-17.html', import.meta.url), 'utf8');

describe('parsePaysyPage', () => {
	it('reads both Oura services (doubles and the single court) with their 30-min blocks', () => {
		const day = parsePaysyPage(html, '2026-11-17');
		expect(day.courts.map((c) => c.name)).toEqual(['kurt 1', 'kurt 2', 'Single']);
		const k1 = day.courts[0];
		expect(k1.blocks).toHaveLength(28);
		const free = (slot: number) => k1.blocks.find((b) => b.slot === slot)?.available;
		// kurt 1 that day: booked 08:00-09:00 and 15:00-19:00
		expect([free(t('08:30')), free(t('09:00')), free(t('14:30')), free(t('15:00')), free(t('18:30')), free(t('19:00'))]).toEqual([
			false, true, true, false, false, true
		]);
		expect(k1.blocks[0].price).toBe(18);
	});

	it('rejects a page for a different day than requested', () => {
		expect(() => parsePaysyPage(html, '2026-11-18')).toThrow(/expected 2026-11-18/);
	});

	it('rejects the Cloudflare challenge page', () => {
		expect(() => parsePaysyPage('<title>Checking your connection</title>', '2026-11-17')).toThrow(/no reservation calendar/);
	});
});

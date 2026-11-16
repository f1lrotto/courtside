import { paysyDate } from './time';

export type VenueId = 'aurial' | 'oura';
export type CourtKind = 'doubles' | 'singles';

export interface Venue {
	id: VenueId;
	name: string;
	short: string;
	/** Paysy reservation page; ?date=DD.MM.YYYY selects the day */
	url: string;
}

// Aurial's second hall (Rača) is a separate Paysy page and is deliberately not scraped.
export const VENUES: Venue[] = [
	{
		id: 'aurial',
		name: 'Aurial Padel Bratislava',
		short: 'Aurial',
		url: 'https://aurialpadel.sk/reservations/types/aurial-padel-bratislava'
	},
	{ id: 'oura', name: 'Oura Padel', short: 'Oura', url: 'https://booking.ourapadel.com/' }
];

export const venueById = (id: string) => VENUES.find((v) => v.id === id)!;

export const bookingUrl = (venue: string, date: string) =>
	`${venueById(venue).url}?date=${paysyDate(date)}`;

/** Oura's narrow court for two players is named "Single"; every other court is a full doubles court. */
export const courtKind = (name: string): CourtKind =>
	/^single$/i.test(name.trim()) ? 'singles' : 'doubles';

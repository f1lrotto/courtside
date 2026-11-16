import { lastUpdated } from '#lib/server/data.js';
import { isRefreshing } from '#lib/server/scraper.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	user: locals.user!,
	lastUpdated: lastUpdated(),
	refreshing: isRefreshing()
});

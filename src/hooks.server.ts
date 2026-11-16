import { redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/env';
import { auth, migrateAuth, seedAdminInvite, toUser } from '#lib/server/auth.js';
import { pickLang } from '#lib/i18n.js';
import { startScheduler } from '#lib/server/scraper.js';

export const init: ServerInit = async () => {
	if (building) return;
	await migrateAuth();
	seedAdminInvite();
	startScheduler();
};

const PUBLIC = ['/login', '/signup'];

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	event.locals.lang = pickLang(event.cookies.get('lang'), event.request.headers.get('accept-language'));
	// Better Auth's own endpoints (/api/auth/*) answer before the login gate
	if (path.startsWith('/api/auth/')) return svelteKitHandler({ event, resolve, auth, building });

	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = session ? toUser(session.user) : null;
	if (!event.locals.user && !PUBLIC.includes(path)) {
		if (path.startsWith('/api/')) return new Response('Unauthorized', { status: 401 });
		redirect(303, '/login');
	}
	if (path.startsWith('/admin') && event.locals.user?.role !== 'admin') {
		redirect(303, '/');
	}
	const lang = event.locals.lang;
	return resolve(event, { transformPageChunk: ({ html }) => html.replace('<html lang="en">', `<html lang="${lang}">`) });
};

import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth, normalizeEmail } from '#lib/server/auth.js';
import { dict } from '#lib/i18n.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const email = normalizeEmail(form.get('email'));
		const password = String(form.get('password') ?? '');
		try {
			await auth.api.signInEmail({ body: { email, password }, headers: request.headers });
		} catch (e) {
			if (!(e instanceof APIError)) throw e;
			const error = e.status === 'UNAUTHORIZED' ? dict(locals.lang).login.wrong : e.message;
			return fail(400, { email, error });
		}
		redirect(303, '/');
	}
};

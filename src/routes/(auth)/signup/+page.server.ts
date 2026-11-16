import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth, isEmail, normalizeEmail } from '#lib/server/auth.js';
import { dict } from '#lib/i18n.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, '/');
	return { email: normalizeEmail(url.searchParams.get('email')) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const m = dict(locals.lang).signup;
		const form = await request.formData();
		const email = normalizeEmail(form.get('email'));
		const name = String(form.get('name') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const values = { email, name };

		if (!isEmail(email)) return fail(400, { ...values, error: m.badEmail });
		if (!name || name.length > 40) return fail(400, { ...values, error: m.badName });
		if (password.length < 8) return fail(400, { ...values, error: m.shortPassword });

		try {
			// the invite check and role assignment run in the user-create hook in auth.ts
			await auth.api.signUpEmail({ body: { email, name, password }, headers: request.headers });
		} catch (e) {
			if (!(e instanceof APIError)) throw e;
			const error =
				e.body?.code === 'USER_ALREADY_EXISTS' || e.body?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
					? m.taken
					: e.message;
			return fail(e.status === 'FORBIDDEN' ? 403 : 400, { ...values, error });
		}
		redirect(303, '/welcome');
	}
};

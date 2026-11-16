<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from '#lib/i18n.js';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let busy = $state(false);
</script>

<svelte:head><title>{t().login.title} · Courtside</title></svelte:head>

<h1 class="text-2xl tracking-[-0.03em]">{t().login.title}</h1>
<p class="mt-1 text-sm text-muted">{t().login.sub}</p>

<form
	method="POST"
	class="mt-6 space-y-4"
	use:enhance={() => {
		busy = true;
		return async ({ update }) => {
			await update();
			busy = false;
		};
	}}
>
	<div>
		<label class="label" for="email">{t().common.email}</label>
		<input class="input" id="email" name="email" type="email" autocomplete="email" required {@attach (el) => { if (!form?.email) el.focus(); }} value={form?.email ?? ''} />
	</div>
	<div>
		<label class="label" for="password">{t().common.password}</label>
		<input class="input" id="password" name="password" type="password" autocomplete="current-password" required {@attach (el) => { if (form?.email) el.focus(); }} />
	</div>
	{#if form?.error}
		<p class="text-sm text-danger" role="alert">{form.error}</p>
	{/if}
	<button class="btn-primary h-10 w-full" disabled={busy}>{busy ? t().login.busy : t().login.submit}</button>
</form>

<p class="mt-6 border-t border-dashed border-line-strong pt-4 text-sm text-muted">
	{t().login.invited} <a href="/signup" class="text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">{t().login.createLink}</a>
</p>

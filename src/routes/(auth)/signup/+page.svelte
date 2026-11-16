<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from '#lib/i18n.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let busy = $state(false);
</script>

<svelte:head><title>{t().signup.title} · Courtside</title></svelte:head>

<h1 class="text-2xl tracking-[-0.03em]">{t().signup.title}</h1>
<p class="mt-1 text-sm text-muted">{t().signup.sub}</p>

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
		<input class="input" id="email" name="email" type="email" autocomplete="email" required value={form?.email ?? data.email} />
	</div>
	<div>
		<label class="label" for="name">{t().common.name}</label>
		<input class="input" id="name" name="name" autocomplete="given-name" maxlength="40" required value={form?.name ?? ''} placeholder={t().common.namePlaceholder} />
	</div>
	<div>
		<label class="label" for="password">{t().common.password}</label>
		<input class="input" id="password" name="password" type="password" autocomplete="new-password" minlength="8" required />
		<p class="mt-1.5 text-xs text-faint">{t().common.passwordHint}</p>
	</div>
	{#if form?.error}
		<p class="text-sm text-danger" role="alert">{form.error}</p>
	{/if}
	<button class="btn-primary h-10 w-full" disabled={busy}>{busy ? t().signup.busy : t().signup.submit}</button>
</form>

<p class="mt-6 border-t border-dashed border-line-strong pt-4 text-sm text-muted">
	{t().signup.haveAccount} <a href="/login" class="text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">{t().signup.signInLink}</a>
</p>

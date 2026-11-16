<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Sign in · Courtside</title></svelte:head>

<h1 class="text-2xl tracking-[-0.03em]">Sign in</h1>
<p class="mt-1 text-sm text-muted">Use the email and password you signed up with.</p>

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
		<label class="label" for="email">Email</label>
		<input class="input" id="email" name="email" type="email" autocomplete="email" required {@attach (el) => { if (!form?.email) el.focus(); }} value={form?.email ?? ''} />
	</div>
	<div>
		<label class="label" for="password">Password</label>
		<input class="input" id="password" name="password" type="password" autocomplete="current-password" required {@attach (el) => { if (form?.email) el.focus(); }} />
	</div>
	{#if form?.error}
		<p class="text-sm text-danger" role="alert">{form.error}</p>
	{/if}
	<button class="btn-primary h-10 w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
</form>

<p class="mt-6 border-t border-dashed border-line-strong pt-4 text-sm text-muted">
	Got an invite? <a href="/signup" class="text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">Create your account</a>
</p>

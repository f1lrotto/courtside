<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Create account · Courtside</title></svelte:head>

<h1 class="text-2xl tracking-[-0.03em]">Create your account</h1>
<p class="mt-1 text-sm text-muted">Courtside is invite-only. Use the email you were invited with.</p>

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
		<input class="input" id="email" name="email" type="email" autocomplete="email" required value={form?.email ?? data.email} />
	</div>
	<div>
		<label class="label" for="name">Name</label>
		<input class="input" id="name" name="name" autocomplete="given-name" maxlength="40" required value={form?.name ?? ''} placeholder="What friends call you" />
	</div>
	<div>
		<label class="label" for="password">Password</label>
		<input class="input" id="password" name="password" type="password" autocomplete="new-password" minlength="8" required />
		<p class="mt-1.5 text-xs text-faint">At least 8 characters.</p>
	</div>
	{#if form?.error}
		<p class="text-sm text-danger" role="alert">{form.error}</p>
	{/if}
	<button class="btn-primary h-10 w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
</form>

<p class="mt-6 border-t border-dashed border-line-strong pt-4 text-sm text-muted">
	Already have an account? <a href="/login" class="text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">Sign in</a>
</p>

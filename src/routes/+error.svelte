<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';

	const notFound = $derived(page.status === 404);
</script>

<svelte:head><title>{page.status} · Courtside</title></svelte:head>

<div class="flex min-h-dvh flex-col items-center justify-center px-6">
	<div class="frame w-full max-w-[420px] bg-bg px-6 py-8">
		<Logo wordmark />
		<p class="eyebrow mt-8 text-faint">Error {page.status}</p>
		<h1 class="mt-2 text-3xl tracking-[-0.03em]">{notFound ? 'Nothing here.' : 'Something broke.'}</h1>
		<p class="mt-2 text-sm text-muted">
			{notFound ? "This page doesn't exist, or the link is out of date." : (page.error?.message ?? 'Try again in a moment.')}
		</p>
		<div class="mt-6 flex gap-2 border-t border-dashed border-line-strong pt-5">
			<a href="/" class="btn-primary h-9">Go to matches</a>
			<button type="button" class="btn-ghost h-9" onclick={() => history.back()}>Back</button>
		</div>
	</div>
</div>

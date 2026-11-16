<script lang="ts">
	import { enhance } from '$app/forms';
	import { Palmtree } from '@lucide/svelte';
	import { MAX_GAMES } from '#lib/format.js';
	import { MATCH_SIZES } from '#lib/match.js';
	import LangSwitch from '#lib/components/LangSwitch.svelte';
	import { t } from '#lib/i18n.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let games = $derived(data.user.gamesPerWeek);
	let matchSize = $derived(data.user.matchSize);
</script>

<svelte:head><title>{t().account.title} · Courtside</title></svelte:head>

<h1 class="title">{t().account.title}</h1>
<p class="mt-1 text-sm text-muted">{data.user.email}</p>

<div class="mt-8 grid max-w-2xl gap-6">
	<section class="card">
		<header class="border-b border-line px-5 py-4">
			<h2 class="eyebrow">{t().account.profile}</h2>
			<p class="mt-0.5 text-xs text-muted">{t().account.profileHint}</p>
		</header>
		<form method="POST" action="?/profile" use:enhance={() => async ({ update }) => update({ reset: false })} class="space-y-4 px-5 py-4">
			<div>
				<label class="label" for="name">{t().common.name}</label>
				<input class="input" id="name" name="name" maxlength="40" required value={data.user.name} autocomplete="given-name" />
			</div>
			<fieldset>
				<legend class="label">{t().common.gamesPerWeek}</legend>
				<div class="flex w-fit border border-line-strong" role="radiogroup">
					{#each Array.from({ length: MAX_GAMES }, (_, i) => i + 1) as n (n)}
						<label
							class="flex h-9 w-10 cursor-pointer items-center justify-center border-r border-line-strong font-mono text-sm tabular-nums transition-colors last:border-r-0 has-focus-visible:outline has-focus-visible:outline-fg
								{games === n ? 'bg-fg text-black' : 'text-muted hover:bg-hover hover:text-fg'}"
						>
							<input class="sr-only" type="radio" name="gamesPerWeek" value={n} checked={games === n} onchange={() => (games = n)} />
							{n}
						</label>
					{/each}
				</div>
				<p class="mt-2 text-xs text-faint">{t().common.gamesHint}</p>
			</fieldset>
			<fieldset id="match-size">
				<legend class="label">{t().common.matchSize}</legend>
				<div class="flex w-fit flex-wrap border border-line-strong" role="radiogroup">
					{#each MATCH_SIZES as size (size)}
						<label
							class="flex h-9 cursor-pointer items-center justify-center border-r border-line-strong px-3 text-sm transition-colors last:border-r-0 has-focus-visible:outline has-focus-visible:outline-fg
								{matchSize === size ? 'bg-fg text-black' : 'text-muted hover:bg-hover hover:text-fg'}"
						>
							<input class="sr-only" type="radio" name="matchSize" value={size} checked={matchSize === size} onchange={() => (matchSize = size)} />
							{t().common.matchSizes[size]}
						</label>
					{/each}
				</div>
				<p class="mt-2 text-xs text-faint">{t().common.matchSizeHint}</p>
			</fieldset>
			{#if form?.profile && 'error' in form.profile}
				<p class="text-sm text-danger" role="alert">{form.profile.error}</p>
			{:else if form?.profile}
				<p class="text-sm text-free" role="status">{t().common.saved}</p>
			{/if}
			<button class="btn-primary h-9">{t().account.saveProfile}</button>
		</form>
	</section>

	<section class="card {data.user.away ? 'border-ball/40!' : ''}" id="break">
		<header class="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
			<div class="max-w-md">
				<h2 class="eyebrow flex items-center gap-2">
					<Palmtree class="size-3.5 {data.user.away ? 'text-ball' : 'text-muted'}" />
					{data.user.away ? t().account.breakOnLabel : t().account.breakTitle}
				</h2>
				<p class="mt-0.5 text-xs text-muted">{t().account.breakHint}</p>
				{#if form?.away?.back}
					<p class="mt-2 text-xs text-free" role="status">{t().account.breakBack} <a href="/availability" class="underline underline-offset-2">{t().nav.availability} →</a></p>
				{/if}
			</div>
			<form method="POST" action="?/away" use:enhance>
				<input type="hidden" name="away" value={data.user.away ? 'off' : 'on'} />
				<button class="{data.user.away ? 'btn-primary' : 'btn-ghost'} h-9" data-break-toggle>
					{data.user.away ? t().account.breakEnd : t().account.breakStart}
				</button>
			</form>
		</header>
	</section>

	<section class="card">
		<header class="border-b border-line px-5 py-4">
			<h2 class="eyebrow">{t().account.password}</h2>
			<p class="mt-0.5 text-xs text-muted">{t().account.passwordHint}</p>
		</header>
		<form method="POST" action="?/password" use:enhance class="space-y-4 px-5 py-4">
			<div>
				<label class="label" for="currentPassword">{t().account.current}</label>
				<input class="input" id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" required />
			</div>
			<div>
				<label class="label" for="newPassword">{t().account.new}</label>
				<input class="input" id="newPassword" name="newPassword" type="password" autocomplete="new-password" minlength="8" required />
				<p class="mt-1.5 text-xs text-faint">{t().common.passwordHint}</p>
			</div>
			{#if form?.password && 'error' in form.password}
				<p class="text-sm text-danger" role="alert">{form.password.error}</p>
			{:else if form?.password}
				<p class="text-sm text-free" role="status">{t().account.changed}</p>
			{/if}
			<button class="btn-primary h-9">{t().account.change}</button>
		</form>
	</section>

	<section class="card">
		<header class="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
			<div>
				<h2 class="eyebrow">{t().common.language}</h2>
			</div>
			<LangSwitch />
		</header>
	</section>

	<section class="card">
		<header class="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
			<div>
				<h2 class="eyebrow">{t().account.setup}</h2>
				<p class="mt-0.5 text-xs text-muted">{t().account.setupHint}</p>
			</div>
			<a href="/welcome" class="btn-ghost h-9">{t().account.setupRun}</a>
		</header>
	</section>
</div>

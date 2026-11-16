<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowLeft, ArrowRight, Check, Palmtree } from '@lucide/svelte';
	import Logo from '#lib/components/Logo.svelte';
	import LangSwitch from '#lib/components/LangSwitch.svelte';
	import { MATCH_SIZES } from '#lib/match.js';
	import { MAX_GAMES } from '#lib/format.js';
	import { t } from '#lib/i18n.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const STEPS = 3;
	let step = $state(0);
	// typed values survive a language switch, which reloads the page data
	let name = $state(untrack(() => data.user.name));
	let games = $state(untrack(() => data.user.gamesPerWeek));
	let away = $state(untrack(() => data.user.away));
	let matchSize = $state(untrack(() => data.user.matchSize));

	const canNext = $derived(step !== 0 || (name.trim().length > 0 && name.trim().length <= 40));
</script>

<svelte:head><title>{t().welcome.title} · Courtside</title></svelte:head>

<div class="flex min-h-dvh flex-col">
	<header class="border-b border-line">
		<div class="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
			<Logo wordmark />
			<a href="/" class="eyebrow text-muted hover:text-fg" data-skip>{t().welcome.skip}</a>
		</div>
	</header>

	<main class="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
		<!-- progress -->
		<ol class="grid grid-cols-3 border border-line" aria-label={t().welcome.stepOf(step + 1, STEPS)}>
			{#each t().welcome.steps as label, i (i)}
				<li
					class="eyebrow flex h-9 items-center gap-2 border-r border-line px-2.5 text-[10px] last:border-r-0 sm:px-3
						{i === step ? 'bg-fg text-bg' : i < step ? 'text-fg' : 'text-faint'}"
					aria-current={i === step ? 'step' : undefined}
				>
					<span class="font-mono tabular-nums {i === step ? 'text-bg/60' : 'text-faint'}">0{i + 1}</span>
					<span class="truncate">{label}</span>
					{#if i < step}<Check class="ml-auto hidden size-3 text-ball sm:block" />{/if}
				</li>
			{/each}
		</ol>

		<form method="POST" class="mt-8">
			<!-- the inputs that matter are always in the form, whichever step is showing -->
			<input type="hidden" name="name" value={name} />
			<input type="hidden" name="gamesPerWeek" value={games} />
			<input type="hidden" name="matchSize" value={matchSize} />
			{#if away}<input type="hidden" name="away" value="on" />{/if}

			<p class="eyebrow text-faint">{t().welcome.stepOf(step + 1, STEPS)}</p>

			{#if step === 0}
				<h1 class="title mt-2">{t().welcome.basicsTitle}</h1>
				<p class="mt-2 max-w-xl text-sm text-muted">{t().welcome.basicsBody}</p>
				<div class="mt-8 grid max-w-sm gap-5">
					<div>
						<span class="label">{t().common.language}</span>
						<LangSwitch class="w-fit" />
					</div>
					<div>
						<label class="label" for="w-name">{t().common.name}</label>
						<input class="input" id="w-name" maxlength="40" autocomplete="given-name" bind:value={name} placeholder={t().common.namePlaceholder} />
					</div>
				</div>
			{:else if step === 1}
				<h1 class="title mt-2">{t().welcome.gamesTitle}</h1>
				<p class="mt-2 max-w-xl text-sm text-muted">{t().welcome.gamesBody}</p>
				<div class="mt-8 grid grid-cols-7 border border-line-strong sm:w-fit" role="radiogroup" aria-label={t().common.gamesPerWeek}>
					{#each Array.from({ length: MAX_GAMES }, (_, i) => i + 1) as n (n)}
						<button
							type="button"
							role="radio"
							aria-checked={games === n}
							class="flex h-16 cursor-pointer flex-col items-center justify-center border-r border-line-strong font-mono transition-colors last:border-r-0 sm:w-16
								{games === n ? 'bg-fg text-black' : 'text-muted hover:bg-hover hover:text-fg'}"
							onclick={() => (games = n)}
						>
							<span class="text-xl tabular-nums">{n}</span>
							<span class="text-[9px] tracking-widest uppercase {games === n ? 'text-black/55' : 'text-faint'}">×</span>
						</button>
					{/each}
				</div>
				<p class="mt-3 font-mono text-sm text-fg" aria-live="polite">{t().welcome.gamesFor(games)}</p>
				<p class="mt-1 text-xs text-faint">{t().common.gamesHint}</p>

				<h2 class="label mt-8">{t().common.matchSize}</h2>
				<div class="grid grid-cols-3 border border-line-strong sm:w-fit" role="radiogroup" aria-label={t().common.matchSize}>
					{#each MATCH_SIZES as size (size)}
						<button
							type="button"
							role="radio"
							aria-checked={matchSize === size}
							data-match-size={size}
							class="flex h-12 cursor-pointer items-center justify-center border-r border-line-strong px-4 text-sm transition-colors last:border-r-0
								{matchSize === size ? 'bg-fg text-black' : 'text-muted hover:bg-hover hover:text-fg'}"
							onclick={() => (matchSize = size)}
						>
							{t().common.matchSizes[size]}
						</button>
					{/each}
				</div>
				<p class="mt-2 text-xs text-faint">{t().common.matchSizeHint}</p>
				<label
					class="mt-8 flex max-w-xl cursor-pointer items-start gap-3 border px-4 py-3 transition-colors has-focus-visible:outline has-focus-visible:outline-fg
						{away ? 'border-ball/60 bg-panel' : 'border-dashed border-line-strong hover:border-muted'}"
				>
					<input type="checkbox" class="mt-0.5 size-4 accent-ball" bind:checked={away} data-break />
					<span>
						<span class="flex items-center gap-2 text-sm font-medium"><Palmtree class="size-3.5 {away ? 'text-ball' : 'text-muted'}" /> {t().welcome.breakToggle}</span>
						<span class="mt-0.5 block text-xs text-muted">{t().welcome.breakToggleHint}</span>
					</span>
				</label>
			{:else}
				<h1 class="title mt-2">{t().welcome.reviewTitle}</h1>
				<p class="mt-2 max-w-xl text-sm text-muted">{t().welcome.reviewBody}</p>
				<dl class="card mt-8 divide-y divide-line">
					<div class="flex items-center justify-between gap-4 px-5 py-3.5">
						<dt class="eyebrow text-muted">{t().common.name}</dt>
						<dd class="text-sm">{name.trim()}</dd>
					</div>
					<div class="flex items-center justify-between gap-4 px-5 py-3.5">
						<dt class="eyebrow text-muted">{t().common.gamesPerWeek}</dt>
						<dd class="font-mono text-sm tabular-nums">{t().welcome.perWeek(games)}</dd>
					</div>
					<div class="flex items-center justify-between gap-4 px-5 py-3.5">
						<dt class="eyebrow text-muted">{t().common.matchSize}</dt>
						<dd class="text-sm" data-review-match-size>{t().common.matchSizes[matchSize]}</dd>
					</div>
					{#if away}
						<div class="px-5 py-3.5">
							<dt class="eyebrow text-muted">{t().account.breakTitle}</dt>
							<dd class="mt-2 flex items-center gap-2 text-sm text-muted"><Palmtree class="size-3.5 shrink-0 text-ball" /> {t().welcome.breakPicked}</dd>
						</div>
					{/if}
				</dl>
				{#if form?.error}<p class="mt-4 text-sm text-danger" role="alert">{form.error}</p>{/if}
			{/if}

			<div class="mt-10 flex items-center gap-2 border-t border-dashed border-line-strong pt-6">
				{#if step > 0}
					<button type="button" class="btn-ghost h-10" onclick={() => step--}><ArrowLeft class="size-3.5" /> {t().common.back}</button>
				{/if}
				<span class="flex-1"></span>
				{#if step < STEPS - 1}
					<button type="button" class="btn-primary h-10" disabled={!canNext} onclick={() => step++}>
						{t().welcome.next} <ArrowRight class="size-3.5" />
					</button>
				{:else}
					<button class="btn-primary h-10">{t().welcome.finish} <ArrowRight class="size-3.5" /></button>
				{/if}
			</div>
		</form>
	</main>
</div>

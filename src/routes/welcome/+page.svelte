<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowLeft, ArrowRight, Check } from '@lucide/svelte';
	import Logo from '#lib/components/Logo.svelte';
	import LangSwitch from '#lib/components/LangSwitch.svelte';
	import { findOpportunities } from '#lib/match.js';
	import { MAX_GAMES } from '#lib/format.js';
	import { fmtWeekday, t } from '#lib/i18n.js';
	import { DAY_PARTS, SLOT_MINUTES, addDays, partSlots, weekday, weekStart, type DayPart } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const STEPS = 4;
	let step = $state(0);
	// typed values survive a language switch, which reloads the page data
	let name = $state(untrack(() => data.user.name));
	let games = $state(untrack(() => data.user.gamesPerWeek));
	let picked = $state<string[]>(untrack(() => data.initial));

	const PARTS = Object.keys(DAY_PARTS) as DayPart[];
	const days = $derived(Array.from({ length: 7 }, (_, i) => addDays(weekStart(data.today), i)));
	const key = (wd: number, part: DayPart) => `${wd}:${part}`;
	const has = (k: string) => picked.includes(k);
	const toggle = (k: string) => (picked = has(k) ? picked.filter((x) => x !== k) : [...picked, k]);
	const preset = (keys: string[]) => (picked = [...new Set([...picked, ...keys])]);
	const EVENINGS = [0, 1, 2, 3, 4].map((d) => key(d, 'evening'));
	const WEEKENDS = [5, 6].flatMap((d) => PARTS.slice(0, 3).map((p) => key(d, p)));

	// what saving would write: your marked times plus the picked blocks, from now on
	const mineAfter = $derived.by(() => {
		const me = data.user.id;
		const out: Record<string, number[]> = {};
		for (const date of data.match.dates) {
			const add = PARTS.filter((p) => has(key(weekday(date), p)))
				.flatMap(partSlots)
				.filter((s) => date > data.today || s >= data.nowSlot);
			const slots = new Set([...(data.match.availability[date]?.[me] ?? []), ...add]);
			if (slots.size) out[date] = [...slots].sort((a, b) => a - b);
		}
		return out;
	});
	const hours = $derived(Object.values(mineAfter).reduce((n, s) => n + s.length, 0) * (SLOT_MINUTES / 60));

	// live: games in the next two weeks that you'd be part of, at 90 minutes
	const live = $derived.by(() => {
		const me = data.user.id;
		const availability = Object.fromEntries(
			data.match.dates.map((d) => [d, { ...data.match.availability[d], [me]: mineAfter[d] ?? [] }])
		);
		const input = {
			...data.match,
			availability,
			duration: 90 / SLOT_MINUTES,
			notBefore: { date: data.today, slot: data.nowSlot }
		};
		const withMe = (kind: 'doubles' | 'singles') =>
			findOpportunities(input, kind).filter((o) => o.starts.some((s) => s.players.some((p) => p.id === me))).length;
		return { doubles: withMe('doubles'), singles: withMe('singles') };
	});

	const canNext = $derived(step !== 0 || (name.trim().length > 0 && name.trim().length <= 40));
	const summary = $derived(
		days
			.map((d, wd) => ({ d, parts: PARTS.filter((p) => has(key(wd, p))) }))
			.filter((x) => x.parts.length)
	);
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
		<ol class="grid grid-cols-4 border border-line" aria-label={t().welcome.stepOf(step + 1, STEPS)}>
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
			{#each picked as k (k)}<input type="hidden" name="block" value={k} />{/each}

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
			{:else if step === 2}
				<h1 class="title mt-2">{t().welcome.timesTitle}</h1>
				<p class="mt-2 max-w-xl text-sm text-muted">{t().welcome.timesBody}</p>
				<div class="mt-6 flex flex-wrap gap-2">
					<button type="button" class="btn-ghost" onclick={() => preset(EVENINGS)}>{t().welcome.presetEvenings}</button>
					<button type="button" class="btn-ghost" onclick={() => preset(WEEKENDS)}>{t().welcome.presetWeekends}</button>
					<button type="button" class="btn-quiet" onclick={() => (picked = [])} disabled={picked.length === 0}>{t().welcome.presetClear}</button>
				</div>

				<div class="mt-4 grid gap-6 lg:grid-cols-[1fr_200px]">
					<div class="card overflow-x-auto p-2 sm:p-3">
						<div class="grid min-w-[340px] gap-px" style="grid-template-columns: 5.5rem repeat(7, minmax(0, 1fr));">
							<div></div>
							{#each days as d (d)}
								<div class="eyebrow pb-2 text-center text-[10px] text-muted">{fmtWeekday(d)}</div>
							{/each}
							{#each PARTS as part (part)}
								{@const [a, b] = DAY_PARTS[part]}
								<div class="flex flex-col justify-center pr-2 text-xs">
									<span>{t().welcome.parts[part]}</span>
									<span class="font-mono text-[10px] text-faint tabular-nums">{String(a / 2).padStart(2, '0')}–{b / 2}</span>
								</div>
								{#each days as d, wd (d)}
									{@const k = key(wd, part)}
									{@const n = data.friendCounts[k] ?? 0}
									{@const on = has(k)}
									<button
										type="button"
										aria-pressed={on}
										aria-label="{fmtWeekday(d)} {t().welcome.parts[part]}{n ? `, ${t().welcome.friendsOften(n)}` : ''}"
										title={n ? t().welcome.friendsOften(n) : undefined}
										data-block={k}
										class="relative h-12 cursor-pointer border transition-colors sm:h-14
											{on ? 'border-ball bg-ball text-black' : 'border-line bg-bg text-muted hover:border-line-strong hover:text-fg'}"
										onclick={() => toggle(k)}
									>
										{#if on}<Check class="absolute top-1 left-1 size-3" />{/if}
										{#if n}
											<span class="absolute right-1 bottom-0.5 font-mono text-[10px] tabular-nums {on ? 'text-black/60' : ''}">{n}</span>
										{/if}
									</button>
								{/each}
							{/each}
						</div>
					</div>

					<aside class="card h-fit p-4" aria-live="polite">
						<h2 class="eyebrow">{t().welcome.live}</h2>
						{#if hours === 0}
							<p class="mt-2 text-xs text-muted">{t().welcome.liveNone}</p>
						{:else}
							<p class="mt-3 font-mono text-3xl tabular-nums" data-live-doubles>{live.doubles}</p>
							<p class="text-xs text-muted">{t().welcome.doublesNoun(live.doubles)}</p>
							<p class="mt-3 font-mono text-3xl tabular-nums" data-live-singles>{live.singles}</p>
							<p class="text-xs text-muted">{t().welcome.singlesNoun(live.singles)}</p>
							<p class="mt-3 border-t border-line pt-3 font-mono text-[11px] text-faint tabular-nums">{t().welcome.hoursTwoWeeks(hours)}</p>
						{/if}
					</aside>
				</div>
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
					<div class="px-5 py-3.5">
						<dt class="eyebrow text-muted">{t().welcome.usualTimes}</dt>
						<dd class="mt-2 text-sm">
							{#if summary.length === 0}
								<span class="text-muted">{t().welcome.noTimes}</span>
							{:else}
								<ul class="space-y-1">
									{#each summary as x (x.d)}
										<li class="flex gap-3"><span class="w-10 font-mono text-muted">{fmtWeekday(x.d)}</span>{x.parts.map((p) => t().welcome.parts[p]).join(', ')}</li>
									{/each}
								</ul>
								<p class="mt-3 font-mono text-[11px] text-faint tabular-nums">
									{t().welcome.hoursTwoWeeks(hours)} · {t().welcome.liveDoubles(live.doubles)} · {t().welcome.liveSingles(live.singles)}
								</p>
							{/if}
						</dd>
					</div>
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

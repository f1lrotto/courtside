<script lang="ts">
	import { ExternalLink } from '@lucide/svelte';
	import { courtKey } from '#lib/match.js';
	import { DAY_SLOTS, addDays, slotLabel } from '#lib/time.js';
	import { VENUES, bookingUrl } from '#lib/venues.js';
	import { courtLabel, euro, fmtDay, fmtDayMonth, fmtWeekday, t, timeAgo } from '#lib/i18n.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const past = (date: string, slot: number) => date < data.today || (date === data.today && slot < data.nowSlot);
	// neutral → lime, matching the rest of the app
	const heat = (n: number | undefined) =>
		n === undefined
			? 'transparent'
			: n === 0
				? 'rgb(255 255 255 / 0.03)'
				: `rgb(212 242 90 / ${0.08 + 0.62 * Math.min(n / Math.max(data.doublesCount, 1), 1)})`;
	const dayLabel = (d: string) => (d === data.today ? t().common.today : d === addDays(data.today, 1) ? t().common.tomorrow : fmtWeekday(d));
	const dayHref = (d: string) => `?day=${d}#day-detail`;

	const venues = $derived(
		VENUES.map((v) => ({ v, courts: data.courts.filter((c) => c.venue === v.id) })).filter((x) => x.courts.length)
	);
	const statusFor = (venue: string) => data.dayStatus.find((s) => s.venue === venue);
	const freeHours = (key: string) =>
		DAY_SLOTS.filter((s) => data.dayBlocks[key]?.[s]?.free && !past(data.day, s)).length / 2;

	// On narrow screens, start each timeline scrolled to the evening, where most games happen.
	function toEvening(node: HTMLElement) {
		if (node.scrollWidth <= node.clientWidth) return;
		const mark = node.querySelector<HTMLElement>('[data-h="34"]');
		const label = node.querySelector<HTMLElement>('[data-label]');
		if (mark) node.scrollLeft = mark.offsetLeft - (label?.offsetWidth ?? 0) - 8;
	}
</script>

<svelte:head><title>{t().courts.title} · Courtside</title></svelte:head>

<h1 class="title">{t().courts.title}</h1>
<p class="mt-1 text-sm text-muted">{t().courts.sub}</p>

<section class="card mt-8 p-4" aria-label={t().courts.overview}>
	<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
		<h2 class="eyebrow">{t().courts.freeDoubles} <span class="text-faint">· {t().courts.pickDay}</span></h2>
		<div class="eyebrow flex items-center gap-2 text-[10px] text-faint">
			{t().courts.none}
			<span class="flex h-2.5 w-24 overflow-hidden border border-line-strong">
				{#each [0, 1, 3, 5, 8] as n (n)}<span class="flex-1" style="background:{heat(n)}"></span>{/each}
			</span>
			{t().courts.many}
		</div>
	</div>
	<div class="relative mt-3 overflow-x-auto" {@attach toEvening}>
		<div class="grid min-w-[640px]" style="grid-template-columns: 6.5rem repeat({DAY_SLOTS.length}, minmax(0,1fr));">
			<div data-label class="sticky left-0 z-10 bg-panel"></div>
			{#each DAY_SLOTS as s (s)}
				<div data-h={s} class="pb-1 font-mono text-[10px] text-faint tabular-nums">{s % 2 === 0 ? slotLabel(s) : ''}</div>
			{/each}
			{#each data.dates as d (d)}
				<a
					href={dayHref(d)}
					data-sveltekit-replacestate
					aria-current={d === data.day ? 'date' : undefined}
					class="sticky left-0 z-10 flex items-center gap-1.5 bg-panel py-0.5 pr-2 pl-1.5 text-xs whitespace-nowrap transition-colors focus-visible:outline-offset-0
						{d === data.day ? 'text-fg shadow-[inset_2px_0_0_var(--color-fg)]' : 'text-muted hover:text-fg'}"
				>
					<span class="w-14">{dayLabel(d)}</span><span class="font-mono text-[10px] text-faint tabular-nums">{d.slice(8)}.{d.slice(5, 7)}</span>
				</a>
				{#each DAY_SLOTS as s (s)}
					{@const n = data.overview[d]?.[s]}
					<a
						href={dayHref(d)}
						data-sveltekit-replacestate
						tabindex="-1"
						class="my-px h-[18px] border-l border-panel {d === data.day ? 'outline outline-1 -outline-offset-1 outline-white/10' : ''}"
						style="background:{past(d, s) ? 'transparent' : heat(n)}"
						title="{fmtDay(d)} {slotLabel(s)}: {n === undefined ? t().courts.notSyncedCell : t().common.courtsOpen(n)}"
						aria-hidden="true"
					></a>
				{/each}
			{/each}
		</div>
	</div>
	<p class="mt-2 text-[11px] text-faint sm:hidden">{t().courts.swipe}</p>
</section>

<div id="day-detail" class="mt-10 flex scroll-mt-28 flex-wrap items-baseline justify-between gap-2">
	<h2 class="text-2xl tracking-[-0.03em]">{fmtDay(data.day)}</h2>
	<p class="text-xs text-faint">{t().courts.detailHint}</p>
</div>

<div class="mt-4 space-y-6">
	{#each venues as { v, courts } (v.id)}
		{@const st = statusFor(v.id)}
		<section class="card">
			<header class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-3">
				<span class="size-2.5 {v.id === 'aurial' ? 'bg-sky-400' : 'bg-amber-300'}"></span>
				<h3 class="eyebrow text-fg">{v.name}</h3>
				<span class="text-xs text-faint">
					{#if st?.error}
						<span class="text-danger">{t().courts.syncFailed(st.error)}</span>{#if st.fetched_at}&nbsp;· {t().courts.showingFrom(timeAgo(st.fetched_at))}{/if}
					{:else if st?.fetched_at}
						{t().courts.syncedAgo(timeAgo(st.fetched_at))}
					{:else}
						{t().courts.notSyncedYet}
					{/if}
				</span>
				<a href={bookingUrl(v.id, data.day)} target="_blank" rel="noopener noreferrer" class="btn-ghost ml-auto h-7">
					{t().courts.bookingPage} <ExternalLink class="size-3" />
				</a>
			</header>
			<div class="relative overflow-x-auto p-3" {@attach toEvening}>
				<div class="grid min-w-[720px]" style="grid-template-columns: 7.5rem repeat({DAY_SLOTS.length}, minmax(0,1fr));">
					<div data-label class="sticky left-0 z-10 bg-panel"></div>
					{#each DAY_SLOTS as s (s)}
						<div data-h={s} class="pb-1 font-mono text-[10px] text-faint tabular-nums">{s % 2 === 0 ? slotLabel(s) : ''}</div>
					{/each}
					{#each courts as c (courtKey(c))}
						{@const key = courtKey(c)}
						<div class="sticky left-0 z-10 flex items-center justify-between gap-2 bg-panel pr-3 text-xs">
							<span class="truncate" title={c.name}>{courtLabel(c.name)}{#if c.kind === 'singles'}<span class="ml-1 text-faint">{t().courts.twoPlayers}</span>{/if}</span>
							<span class="font-mono text-[10px] text-faint tabular-nums" title={t().courts.freeHours}>{freeHours(key)}h</span>
						</div>
						{#each DAY_SLOTS as s (s)}
							{@const b = data.dayBlocks[key]?.[s]}
							{@const gone = past(data.day, s)}
							{#if b?.free && !gone}
								<a
									href={bookingUrl(c.venue, data.day)}
									target="_blank"
									rel="noopener noreferrer"
									tabindex="-1"
									class="my-px h-6 border-l border-panel bg-ball/45 transition-colors hover:bg-ball"
									title="{t().courts.slotFree(courtLabel(c.name), slotLabel(s), slotLabel(s + 1))}{b.price !== null ? ` · ${euro(b.price)}` : ''}"
									aria-label={t().courts.slotFreeAria(courtLabel(c.name), slotLabel(s))}
								></a>
							{:else}
								<span
									class="my-px h-6 border-l border-panel {b ? (gone ? 'bg-white/[0.02]' : 'bg-white/[0.08]') : 'bg-transparent'}"
									title="{courtLabel(c.name)} {slotLabel(s)}: {gone ? t().courts.past : b ? t().courts.booked : t().courts.noData}"
								></span>
							{/if}
						{/each}
					{/each}
				</div>
				<div class="eyebrow sticky left-0 mt-3 flex gap-4 text-[10px] text-faint">
					<span class="flex items-center gap-1.5"><span class="h-2.5 w-4 bg-ball/30"></span>{t().courts.legendFree}</span>
					<span class="flex items-center gap-1.5"><span class="h-2.5 w-4 bg-white/[0.08]"></span>{t().courts.legendBooked}</span>
				</div>
			</div>
		</section>
	{:else}
		<div class="border border-dashed border-line px-6 py-14 text-center text-sm text-muted">
			{t().courts.firstSync}
		</div>
	{/each}
</div>
<p class="mt-6 text-xs text-faint">{fmtDayMonth(data.dates[0])} – {fmtDayMonth(data.dates.at(-1)!)} · {t().courts.refreshed}</p>

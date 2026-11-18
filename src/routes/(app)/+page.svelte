<script lang="ts">
	import { CalendarPlus, Check, Palmtree, Users } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import OpportunityCard from '#lib/components/OpportunityCard.svelte';
	import type { Opportunity } from '#lib/match.js';
	import { GAME_LENGTHS } from '#lib/format.js';
	import { addDays, slotLabel, todayLocal, weekStart } from '#lib/time.js';
	import { bookingUrl, venueById } from '#lib/venues.js';
	import { courtLabel, euro, fmtDay, t } from '#lib/i18n.js';
	import Avatar from '#lib/components/Avatar.svelte';
	import WhoIsFree from '#lib/components/WhoIsFree.svelte';
	import { ExternalLink } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type View = 'plan' | 'doubles' | 'singles' | 'oneShort';
	const VIEWS: View[] = ['plan', 'doubles', 'singles', 'oneShort'];
	const view = $derived<View>(VIEWS.find((v) => v === page.url.searchParams.get('view')) ?? 'plan');
	const week = $derived(page.url.searchParams.get('week'));
	const href = (v: View, len = data.len) => `?len=${len}${v === 'plan' ? '' : `&view=${v}`}${week ? `&week=${week}` : ''}`;
	const select = (v: View) => goto(href(v), { replace: true, reset: false });
	function tabKey(e: KeyboardEvent) {
		const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
		if (!step) return;
		e.preventDefault();
		const next = VIEWS[(VIEWS.indexOf(view) + step + VIEWS.length) % VIEWS.length];
		select(next);
		document.getElementById(`tab-${next}`)?.focus();
	}

	const tabs = $derived(
		VIEWS.map((id) => ({ id, label: t().matches.tabs[id][0], hint: t().matches.tabs[id][1], items: data[id] }))
	);
	const current = $derived(tabs.find((t) => t.id === view)!);

	const today = todayLocal();
	const dayTitle = (d: string) => (d === today ? t().common.today : d === addDays(today, 1) ? t().common.tomorrow : fmtDay(d));

	// plan: games per person per week, to show how full everyone's week is
	const planWeeksList = $derived(
		[...new Set(data.plan.map((g) => weekStart(g.date)))].map((w) => {
			const games = data.plan.filter((g) => weekStart(g.date) === w);
			const people = data.people.map((p) => ({ ...p, n: games.filter((g) => g.players.some((q) => q.id === p.id)).length }));
			return { week: w, games, people };
		})
	);

	const byDay = $derived(
		(current.id === 'plan' ? [] : (current.items as Opportunity[])).reduce<[string, Opportunity[]][]>((acc, o) => {
			const last = acc.at(-1);
			if (last && last[0] === o.date) last[1].push(o);
			else acc.push([o.date, [o]]);
			return acc;
		}, [])
	);
</script>

<svelte:head><title>{t().matches.title} · Courtside</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<h1 class="title">{t().matches.title}</h1>
		<p class="mt-1 text-sm text-muted">
			{t().matches.sub}
		</p>
	</div>
	<div class="flex items-center gap-2">
		<span class="eyebrow text-muted">{t().matches.gameLength}</span>
		<div class="flex border border-line-strong" role="group" aria-label={t().matches.gameLength}>
			{#each GAME_LENGTHS as l (l)}
				<a
					href={href(view, l)}
					data-sveltekit-noscroll
					data-sveltekit-replacestate
					aria-current={data.len === l ? 'true' : undefined}
					class="border-r border-line-strong px-3 py-1.5 font-mono text-xs tabular-nums transition-colors last:border-r-0
						{data.len === l ? 'bg-fg text-bg' : 'text-muted hover:bg-hover hover:text-fg'}"
				>
					{t().matches.min(l)}
				</a>
			{/each}
		</div>
	</div>
</div>

{#if page.url.searchParams.get('welcome') === 'done'}
	<div class="mt-6 flex items-center gap-4 border border-ball/40 bg-panel px-4 py-3" role="status" data-welcome-done>
		<span class="grid size-6 shrink-0 place-items-center bg-ball text-black"><Check class="size-3.5" /></span>
		<div class="min-w-0 flex-1">
			<div class="text-sm font-medium">{t().matches.welcomeTitle}</div>
			<div class="text-xs text-muted">{data.user.away ? t().welcome.breakPicked : t().matches.welcomeBody}</div>
		</div>
		{#if !data.user.away}<a href="/availability" class="eyebrow text-fg">{t().nav.availability} →</a>{/if}
	</div>
{:else if !data.meMarked && data.user.away}
	<a
		href="/account#break"
		class="mt-6 flex items-center gap-4 border border-ball/40 bg-panel px-4 py-3 transition-colors hover:border-ball"
		data-break-banner
	>
		<Palmtree class="size-5 shrink-0 text-ball" />
		<div class="min-w-0 flex-1">
			<div class="text-sm font-medium">{t().matches.breakTitle}</div>
			<div class="text-xs text-muted">{t().matches.breakBody}</div>
		</div>
		<span class="eyebrow text-fg">{t().matches.breakCta}</span>
	</a>
{:else if !data.meMarked}
	<a
		href="/availability"
		class="mt-6 flex items-center gap-4 border border-dashed border-line-strong bg-panel px-4 py-3 transition-colors hover:border-muted"
	>
		<CalendarPlus class="size-5 shrink-0 text-ball" />
		<div class="min-w-0 flex-1">
			<div class="text-sm font-medium">{t().matches.markTitle}</div>
			<div class="text-xs text-muted">{t().matches.markBody}</div>
		</div>
		<span class="eyebrow text-fg">{t().matches.markCta}</span>
	</a>
{/if}

<WhoIsFree week={data.overlap} people={data.people} meId={data.user.id} />

<div class="mt-8 flex flex-wrap items-stretch border-b border-line" role="tablist" aria-label={t().matches.tabsLabel} tabindex="-1" onkeydown={tabKey}>
	{#each tabs as t (t.id)}
		<button
			role="tab"
			id="tab-{t.id}"
			aria-selected={view === t.id}
			aria-controls="matches-panel"
			tabindex={view === t.id ? 0 : -1}
			class="eyebrow relative -mb-px flex h-10 cursor-pointer items-center gap-1.5 border-r border-line px-2.5 transition-colors sm:gap-2.5 sm:px-4 first:border-l focus-visible:outline-offset-[-2px]
				{view === t.id ? 'text-fg after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-fg' : 'text-muted hover:text-fg'}"
			onclick={() => select(t.id)}
		>
			{t.label}
			<span class="font-mono text-[11px] tabular-nums {view === t.id ? 'text-muted' : 'text-faint'}">{t.items.length}</span>
		</button>
	{/each}
	<span class="eyebrow ml-auto hidden self-center text-[10px] text-faint sm:block">{current.hint}</span>
</div>

<div id="matches-panel" role="tabpanel" aria-labelledby="tab-{view}">
{#if view === 'plan'}
	{#if data.plan.length === 0}
		<div class="mt-10 flex flex-col items-center border border-dashed border-line-strong px-6 py-14 text-center">
			<Users class="size-6 text-faint" />
			<p class="mt-3 text-sm font-medium">{data.hasCourtData ? t().matches.planEmpty : t().matches.stillSyncing}</p>
			<p class="mt-1 max-w-sm text-sm text-muted">
				{t().matches.planEmptyBody(data.markedCount, data.peopleCount)}
			</p>
			<a href="/availability" class="btn-ghost mt-5">{t().common.editAvailability}</a>
		</div>
	{:else}
		<p class="mt-4 max-w-2xl text-xs text-muted">
			{t().matches.planIntroA}<a href="/account" class="text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">{t().matches.planIntroLink}</a>{t().matches.planIntroB}
		</p>
		{#each planWeeksList as w (w.week)}
			<section class="mt-8">
				<h2 class="eyebrow rule mb-2 text-fg">{t().matches.weekOf(fmtDay(w.week))}</h2>
				<p class="mb-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-faint tabular-nums">
					{#each w.people as p (p.id)}
						<span class={p.n > 0 ? 'text-muted' : ''}>{p.id === data.user.id ? t().common.you : p.name} {p.n}/{p.gamesPerWeek ?? 2}</span>
					{/each}
				</p>
				<div class="-space-y-px">
					{#each w.games as g (g.date + g.slot + g.court.venue + g.court.courtId)}
						{@const n = g.kind === 'doubles' ? 4 : 2}
						<div class="card relative flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5" data-plan-game>
							<div class="w-full shrink-0 sm:w-44">
								<div class="eyebrow text-[10px] text-muted">{dayTitle(g.date)} · {t().common[g.kind]}</div>
								<div class="font-mono text-lg tracking-tight tabular-nums">
									{slotLabel(g.slot)}<span class="text-faint">–</span>{slotLabel(g.end)}
								</div>
							</div>
							<div class="flex min-w-0 flex-1 items-center gap-3">
								<div class="flex shrink-0 gap-px">
									{#each g.players as p (p.id)}<Avatar id={p.id} name={p.name} me={p.id === data.user.id} />{/each}
								</div>
								<span class="min-w-0 text-[13px]">{g.players.map((p) => (p.id === data.user.id ? t().common.you : p.name)).join(', ')}</span>
							</div>
							<div class="flex w-full shrink-0 items-center gap-2 sm:w-auto">
								<div class="min-w-0 flex-1 text-right text-xs leading-snug sm:flex-none">
									<span class="flex items-center justify-end gap-1.5 text-[13px] text-fg">
										<span class="size-2 {g.court.venue === 'aurial' ? 'bg-sky-400' : 'bg-amber-300'}"></span>
										{venueById(g.court.venue).short} · {courtLabel(g.court.name)}
									</span>
									{#if g.court.price !== null}
										<span class="text-muted">{euro(g.court.price)} · {t().common.each(euro(Math.round((g.court.price / n) * 100) / 100))}</span>
									{/if}
									{#if g.premium > 0}
										<span class="eyebrow mt-1 block text-[10px] text-orange-400">{t().common.premium(euro(g.premium))}</span>
									{/if}
								</div>
								<a
									href={bookingUrl(g.court.venue, g.date)}
									target="_blank"
									rel="noopener noreferrer"
									class="btn-primary"
									aria-label={t().common.bookAria(`${venueById(g.court.venue).short} ${courtLabel(g.court.name)}`, slotLabel(g.slot))}
								>
									{t().common.book} <ExternalLink class="size-3" />
								</a>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/each}
	{/if}
{:else}
{#if data.shorter[view] > current.items.length}
	<a href={href(view, 60)} data-sveltekit-noscroll class="mt-4 flex items-center gap-2 text-xs text-muted hover:text-fg">
		<span class="border border-line-strong px-1.5 font-mono text-[11px] text-ball tabular-nums">+{data.shorter[view] - current.items.length}</span>
		{t().matches.moreAt60(data.shorter[view] - current.items.length)}
	</a>
{/if}
{#if byDay.length === 0}
	<div class="mt-10 flex flex-col items-center border border-dashed border-line-strong px-6 py-14 text-center">
		<Users class="size-6 text-faint" />
		<p class="mt-3 text-sm font-medium">
			{#if !data.hasCourtData}
				{t().matches.stillSyncing}
			{:else if view === 'singles'}
				{t().matches.emptySingles}
			{:else if view === 'oneShort'}
				{t().matches.emptyOneShort}
			{:else}
				{t().matches.emptyDoubles}
			{/if}
		</p>
		<p class="mt-1 max-w-sm text-sm text-muted">
			{#if !data.hasCourtData}
				{t().matches.firstSync}
			{:else}
				{t().matches.emptyBody(data.markedCount, data.peopleCount, view === 'singles' ? 2 : view === 'oneShort' ? 3 : 4, data.len)}
			{/if}
		</p>
		<a href="/availability" class="btn-ghost mt-5">{t().common.editAvailability}</a>
	</div>
{:else}
	<div class="mt-6 space-y-8">
		{#each byDay as [date, items] (date)}
			<section>
				<h2 class="eyebrow rule mb-3 text-fg">
					{dayTitle(date)}
					{#if date === today || date === addDays(today, 1)}<span class="-ml-1 text-faint">{fmtDay(date)}</span>{/if}
				</h2>
				<div class="-space-y-px">
					{#each items as o (o.kind + o.firstStart + o.players.map((p) => p.id).join())}
						<OpportunityCard {o} meId={data.user.id} len={data.len} />
					{/each}
				</div>
			</section>
		{/each}
	</div>
{/if}
{/if}
</div>

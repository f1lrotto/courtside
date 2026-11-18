<script lang="ts">
	import { Ban, Check, ChevronLeft, ChevronRight, Palmtree } from '@lucide/svelte';
	import { page } from '$app/state';
	import Avatar from './Avatar.svelte';
	import { fmtDay, fmtDayMonth, fmtWeekday, t } from '../i18n';
	import { VENUES, type VenueId } from '../venues';
	import { DAY_SLOTS, FIRST_SLOT, LAST_SLOT, SLOT_MINUTES, addDays, slotLabel, weekStart } from '../time';

	interface Props {
		/** free: date -> userId -> slots; courtsFree: date -> slot -> doubles courts free per club (synced days only) */
		week: {
			monday: string;
			dates: string[];
			today: string;
			free: Record<string, Record<number, number[]>>;
			courtsFree: Record<string, Record<number, Record<VenueId, number>>>;
			/** ids who said they're not playing this week */
			notPlaying: number[];
		};
		people: { id: number; name: string; away?: boolean }[];
		meId: number;
	}
	let { week, people, meId }: Props = $props();

	const MIN_PEOPLE = 3;
	const MIN_SLOTS = 60 / SLOT_MINUTES;

	// keeps the page's other params (game length, tab) when changing week
	const weekHref = (monday: string) => {
		const q = new URLSearchParams(page.url.search);
		q.set('week', monday);
		return `?${q}`;
	};

	// date -> slot -> ids free then
	const freeAt = $derived(
		Object.fromEntries(
			week.dates.map((d) => {
				const bySlot: Record<number, Set<number>> = {};
				for (const [id, slots] of Object.entries(week.free[d] ?? {})) for (const s of slots) (bySlot[s] ??= new Set()).add(Number(id));
				return [d, bySlot];
			})
		)
	);
	// date -> slots inside some hour-long window where the same 3+ people are all free
	const together = $derived(
		Object.fromEntries(
			week.dates.map((d) => {
				const hit = new Set<number>();
				for (let w = FIRST_SLOT; w + MIN_SLOTS <= LAST_SLOT; w++) {
					const window = DAY_SLOTS.filter((s) => s >= w && s < w + MIN_SLOTS);
					const all = [...(freeAt[d][w] ?? [])].filter((id) => window.every((s) => freeAt[d][s]?.has(id)));
					if (all.length >= MIN_PEOPLE) for (const s of window) hit.add(s);
				}
				return [d, hit];
			})
		)
	);

	// this week's status, as on My availability: marking times wins, then a break, then "not playing"
	const status = $derived.by(() => {
		const marked = new Set(week.dates.flatMap((d) => Object.keys(week.free[d] ?? {}).map(Number)));
		const of = (p: { id: number; away?: boolean }) =>
			marked.has(p.id) ? 'marked' : p.away ? 'away' : week.notPlaying.includes(p.id) ? 'off' : 'missing';
		const groups = { marked: [] as string[], off: [] as string[], away: [] as string[], missing: [] as string[] };
		for (const p of people) groups[of(p)].push(p.id === meId ? t().common.you : p.name);
		return groups;
	});

	let pick = $state<{ date: string; slot: number } | null>(null);
	const picked = $derived.by(() => {
		if (!pick || !week.dates.includes(pick.date)) return null;
		const { date, slot } = pick;
		const free = freeAt[date][slot] ?? new Set<number>();
		// each person's unbroken free stretch around the picked slot, longest first
		const list = people
			.filter((p) => free.has(p.id))
			.map((p) => {
				let a = slot;
				let b = slot + 1;
				while (freeAt[date][a - 1]?.has(p.id)) a--;
				while (freeAt[date][b]?.has(p.id)) b++;
				return { ...p, from: a, to: b };
			})
			.sort((x, y) => y.to - y.from - (x.to - x.from) || x.from - y.from);
		return { date, slot, people: list, courts: week.courtsFree[date]?.[slot] };
	});
	const total = (c: Record<VenueId, number>) => c.aurial + c.oura;
	// a bar under each cell in the club's colour: blue Aurial, orange Oura, split when both have a court
	const VENUE_BG: Record<VenueId, string> = { aurial: 'bg-sky-400', oura: 'bg-amber-300' };
	const openAt = (d: string, s: number) => {
		const c = week.courtsFree[d]?.[s];
		return c ? VENUES.filter((v) => c[v.id] > 0).map((v) => v.id) : [];
	};

	const cellBg = (n: number, hit: boolean) =>
		hit
			? `rgb(212 242 90 / ${Math.min(0.6 + (n - MIN_PEOPLE) * 0.15, 1)})`
			: n
				? `rgb(255 255 255 / ${Math.min(0.03 + n * 0.045, 0.22)})`
				: 'transparent';
	// the same hatch My availability uses for "no doubles court open"
	const HATCH = 'bg-[repeating-linear-gradient(135deg,rgb(248_113_113/0.16)_0_2px,transparent_2px_6px)]';
	const HATCH_ON_LIME = 'bg-[repeating-linear-gradient(135deg,rgb(8_9_10/0.45)_0_2px,transparent_2px_6px)]';

	// On narrow screens, start scrolled to the evening, where most games happen.
	function toEvening(node: HTMLElement) {
		if (node.scrollWidth <= node.clientWidth) return;
		const mark = node.querySelector<HTMLElement>('[data-h="34"]');
		const label = node.querySelector<HTMLElement>('[data-label]');
		if (mark) node.scrollLeft = mark.offsetLeft - (label?.offsetWidth ?? 0) - 8;
	}
</script>

<section class="card mt-6" aria-label={t().overlap.title} data-overlap>
	<header class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
		<div>
			<h2 class="eyebrow">{t().overlap.title}</h2>
			<p class="mt-0.5 text-xs text-muted">{t().overlap.hint}</p>
		</div>
		<div class="flex items-center gap-1">
			<a class="btn-ghost w-8 px-0" href={weekHref(addDays(week.monday, -7))} data-sveltekit-noscroll data-sveltekit-replacestate aria-label={t().avail.prevWeek}><ChevronLeft class="size-4" /></a>
			<a class="btn-ghost min-w-36 tabular-nums" href={weekHref(weekStart(week.today))} data-sveltekit-noscroll data-sveltekit-replacestate title={t().avail.thisWeekJump}>
				{fmtDayMonth(week.dates[0])} – {fmtDayMonth(week.dates[6])}
			</a>
			<a class="btn-ghost w-8 px-0" href={weekHref(addDays(week.monday, 7))} data-sveltekit-noscroll data-sveltekit-replacestate aria-label={t().avail.nextWeek}><ChevronRight class="size-4" /></a>
		</div>
	</header>
	<div class="p-3 sm:p-4">
		<div class="relative overflow-x-auto" {@attach toEvening}>
			<div class="grid min-w-[720px]" style="grid-template-columns: 5.5rem repeat({DAY_SLOTS.length}, minmax(0,1fr));">
				<div data-label class="sticky left-0 z-20 bg-panel"></div>
				{#each DAY_SLOTS as s (s)}
					<div data-h={s} class="pb-1 font-mono text-[10px] text-faint tabular-nums">{s % 2 === 0 ? slotLabel(s) : ''}</div>
				{/each}
				{#each week.dates as d (d)}
					<div class="sticky left-0 z-20 flex items-center gap-1.5 bg-panel pr-2 text-xs whitespace-nowrap {d === week.today ? 'text-ball' : d < week.today ? 'text-faint' : 'text-muted'}">
						<span class="w-8">{fmtWeekday(d)}</span><span class="font-mono text-[10px] text-faint tabular-nums">{d.slice(8)}.{d.slice(5, 7)}</span>
					</div>
					{#each DAY_SLOTS as s (s)}
						{@const n = freeAt[d][s]?.size ?? 0}
						{@const hit = together[d].has(s)}
						{@const c = week.courtsFree[d]?.[s]}
						<!-- courts only matter when someone is free, so empty cells stay plain -->
						{@const noCourt = n > 0 && !!c && total(c) === 0}
						{@const open = n > 0 ? openAt(d, s) : []}
						{@const on = pick?.date === d && pick.slot === s}
						<button
							type="button"
							class="relative my-px h-7 cursor-pointer border-l border-panel font-mono text-[10px] tabular-nums hover:brightness-125 focus-visible:z-10 focus-visible:outline-offset-0
								{hit ? 'text-black' : 'text-muted'} {on ? 'z-10 outline outline-1 -outline-offset-1 outline-fg' : ''}"
							style="background:{cellBg(n, hit)}"
							aria-pressed={on}
							aria-label="{fmtDay(d)} {slotLabel(s)}: {t().overlap.free(n)}{c ? `, ${VENUES.map((v) => `${v.short} ${c[v.id]}`).join(', ')}` : ''}"
							data-hit={hit || undefined}
							data-no-court={noCourt || undefined}
							onclick={() => (pick = { date: d, slot: s })}
						>
							{#if noCourt}<span class="pointer-events-none absolute inset-0 {hit ? HATCH_ON_LIME : HATCH}"></span>{/if}
							{#if open.length}
								<span class="pointer-events-none absolute inset-x-0 bottom-0 flex h-[3px]" data-open={open.join(' ')}>
									{#each open as v (v)}<span class="flex-1 {VENUE_BG[v]}"></span>{/each}
								</span>
							{/if}
							<span class="relative">{n || ''}</span>
						</button>
					{/each}
				{/each}
			</div>
		</div>
		<div class="eyebrow mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-faint">
			<span class="flex items-center gap-1.5"><span class="h-2.5 w-4" style="background:{cellBg(3, true)}"></span>{t().overlap.legendTogether}</span>
			{#each VENUES as v (v.id)}
				<span class="flex items-center gap-1.5"><span class="h-[3px] w-4 {VENUE_BG[v.id]}"></span>{v.short}</span>
			{/each}
			<span class="flex items-center gap-1.5"><span class="h-2.5 w-4 border border-line {HATCH}"></span>{t().avail.legendNoCourt}</span>
		</div>
	</div>
	<p class="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-xs text-muted sm:px-5" data-week-status>
		<span class="text-faint">{t().avail.filledIn(people.length - status.missing.length, people.length)}</span>
		{#if status.marked.length}
			<span class="flex items-center gap-1" data-status="marked"><Check class="size-3 shrink-0 text-free" />{status.marked.join(', ')}</span>
		{/if}
		{#if status.off.length}
			<span class="flex items-center gap-1" data-status="off"><Ban class="size-3 shrink-0" />{t().avail.notPlayingShort}: {status.off.join(', ')}</span>
		{/if}
		{#if status.away.length}
			<span class="flex items-center gap-1" data-status="away"><Palmtree class="size-3 shrink-0" />{t().common.onBreakShort}: {status.away.join(', ')}</span>
		{/if}
		{#if status.missing.length}
			<span class="text-faint" data-status="missing">{t().avail.notYet}: {status.missing.join(', ')}</span>
		{/if}
	</p>
	<div class="border-t border-line px-4 py-3 text-[13px] sm:px-5" aria-live="polite" data-overlap-detail>
		{#if picked}
			<div class="flex flex-wrap items-baseline gap-x-2">
				<span class="font-mono text-fg tabular-nums">{fmtDay(picked.date)}, {slotLabel(picked.slot)}</span>
				<span class="text-xs text-muted">{t().overlap.free(picked.people.length)}</span>
				{#if picked.courts && total(picked.courts) === 0}
					<span class="text-xs text-danger">· {t().common.courtsOpen(0)}</span>
				{:else if picked.courts}
					<span class="flex items-center gap-3 text-xs text-muted">
						{#each VENUES as v (v.id)}
							<span class="flex items-center gap-1.5 {picked.courts[v.id] ? '' : 'text-faint'}"><span class="size-2 {VENUE_BG[v.id]} {picked.courts[v.id] ? '' : 'opacity-30'}"></span>{v.short} {picked.courts[v.id]}</span>
						{/each}
					</span>
				{/if}
			</div>
			{#if picked.people.length}
				<ul class="mt-3 flex flex-wrap gap-x-6 gap-y-2">
					{#each picked.people as p (p.id)}
						<li class="flex items-center gap-2">
							<Avatar id={p.id} name={p.name} size={20} me={p.id === meId} />
							{p.id === meId ? t().common.you : p.name}
							<span class="font-mono text-xs text-faint tabular-nums">{slotLabel(p.from)}–{slotLabel(p.to)}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-2 text-xs text-faint">{t().overlap.nobody}</p>
			{/if}
		{:else}
			<p class="text-xs text-faint">{t().overlap.pick}</p>
		{/if}
	</div>
</section>

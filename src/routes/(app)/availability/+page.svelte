<script lang="ts">
	import { ChevronLeft, ChevronRight, Copy, Eraser, Moon, Check, LoaderCircle, TriangleAlert, Undo2 } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import { DAY_SLOTS, FIRST_SLOT, LAST_SLOT, SLOT_MINUTES, addDays, fmtDayMonth, fmtWeekday, minutesNowLocal, slotLabel, weekStart } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Sel = Record<string, Set<number>>;
	const toSel = (m: Record<string, number[]>): Sel =>
		Object.fromEntries(data.dates.map((d) => [d, new Set(m[d] ?? [])]));

	// Re-derived on week navigation; reassigned locally while painting.
	let sel = $derived(toSel(data.mine));

	const nowSlot = Math.ceil(minutesNowLocal() / SLOT_MINUTES);
	const locked = (date: string, slot: number) => date < data.today || (date === data.today && slot < nowSlot);
	const thisWeek = $derived(weekStart(data.today));
	const editable = $derived(data.dates.some((d) => DAY_SLOTS.some((s) => !locked(d, s))));
	const sameSet = (a: Set<number>, b: Set<number>) => a.size === b.size && [...a].every((x) => b.has(x));

	// ---- painting: press and drag a rectangle. On touch, hold briefly first so swipes still scroll. ----
	let drag: { mode: boolean; di: number; s: number; snapshot: Sel; last: string } | null = null;
	let pending: { id: number; x: number; y: number; cell: { di: number; s: number }; timer: ReturnType<typeof setTimeout> } | null = null;
	let painting = $state(false);
	const HOLD_MS = 220;

	function cellAt(x: number, y: number) {
		const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-slot]');
		return el ? { di: Number(el.dataset.di), s: Number(el.dataset.slot) } : null;
	}

	function paint(to: { di: number; s: number }) {
		if (!drag) return;
		const key = `${to.di}:${to.s}`;
		if (key === drag.last) return;
		drag.last = key;
		const [d0, d1] = [Math.min(drag.di, to.di), Math.max(drag.di, to.di)];
		const [s0, s1] = [Math.min(drag.s, to.s), Math.max(drag.s, to.s)];
		const next: Sel = {};
		data.dates.forEach((date, di) => {
			const set = new Set(drag!.snapshot[date]);
			if (di >= d0 && di <= d1) {
				for (let s = s0; s <= s1; s++) {
					if (locked(date, s)) continue;
					if (drag!.mode) set.add(s);
					else set.delete(s);
				}
			}
			next[date] = set;
		});
		sel = next;
	}

	function begin(cell: { di: number; s: number }) {
		drag = { mode: !sel[data.dates[cell.di]].has(cell.s), di: cell.di, s: cell.s, snapshot: sel, last: '' };
		painting = true;
		focusCell = cell;
		paint(cell);
	}

	function down(e: PointerEvent) {
		if (e.button !== 0) return;
		const c = cellAt(e.clientX, e.clientY);
		if (!c || locked(data.dates[c.di], c.s)) return;
		inspect = c;
		if (e.pointerType === 'touch') {
			const cell = c;
			pending = {
				id: e.pointerId,
				x: e.clientX,
				y: e.clientY,
				cell,
				timer: setTimeout(() => {
					pending = null;
					navigator.vibrate?.(8);
					begin(cell);
				}, HOLD_MS)
			};
			return;
		}
		e.preventDefault();
		begin(c);
	}

	function move(e: PointerEvent) {
		if (pending && Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > 8) cancelPending();
		if (!drag) {
			if (e.pointerType === 'mouse') inspect = cellAt(e.clientX, e.clientY) ?? inspect;
			return;
		}
		const c = cellAt(e.clientX, e.clientY);
		if (c) paint(c);
	}

	function cancelPending() {
		if (pending) clearTimeout(pending.timer);
		pending = null;
	}

	function up() {
		if (pending) {
			// a quick tap toggles one cell
			const { cell } = pending;
			cancelPending();
			begin(cell);
		}
		if (!drag) return;
		const before = drag.snapshot;
		drag = null;
		painting = false;
		save(data.dates.filter((d) => !sameSet(before[d], sel[d])));
	}

	// While painting on touch, stop the page from scrolling under the finger.
	function blockScroll(node: HTMLElement) {
		const stop = (e: TouchEvent) => {
			if (drag) e.preventDefault();
		};
		node.addEventListener('touchmove', stop, { passive: false });
		return () => node.removeEventListener('touchmove', stop);
	}

	// ---- keyboard: the grid is one tab stop; arrows move, Space/Enter toggles ----
	let focusCell = $state({ di: 0, s: 36 });
	function cellEl(c: { di: number; s: number }) {
		return document.querySelector<HTMLElement>(`[data-di="${c.di}"][data-slot="${c.s}"]`);
	}
	function gridKey(e: KeyboardEvent) {
		const moves: Record<string, [number, number]> = {
			ArrowUp: [0, -1],
			ArrowDown: [0, 1],
			ArrowLeft: [-1, 0],
			ArrowRight: [1, 0]
		};
		const m = moves[e.key];
		if (!m) return;
		e.preventDefault();
		const next = {
			di: Math.min(6, Math.max(0, focusCell.di + m[0])),
			s: Math.min(LAST_SLOT - 1, Math.max(FIRST_SLOT, focusCell.s + m[1]))
		};
		focusCell = next;
		inspect = next;
		cellEl(next)?.focus();
	}
	function keyToggle(e: MouseEvent, date: string, slot: number) {
		if (e.detail !== 0 || locked(date, slot)) return; // pointer clicks are handled by painting
		const set = new Set(sel[date]);
		if (set.has(slot)) set.delete(slot);
		else set.add(slot);
		sel = { ...sel, [date]: set };
		save([date]);
	}

	// ---- saving: one request at a time, in order ----
	let status = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let queue: Promise<void> = Promise.resolve();
	function save(dates: string[]) {
		dates = dates.filter((d) => d >= data.today);
		if (dates.length === 0) return;
		const days = Object.fromEntries(dates.map((d) => [d, [...sel[d]].sort((a, b) => a - b)]));
		status = 'saving';
		queue = queue.then(async () => {
			try {
				const r = await fetch('/api/availability', {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ days })
				});
				status = r.ok ? 'saved' : 'error';
			} catch {
				status = 'error';
			}
		});
	}
	$effect(() => {
		void data.monday;
		status = 'idle';
		undo = null;
	});

	// ---- bulk actions, each undoable for a few seconds ----
	let undo = $state<{ label: string; before: Sel } | null>(null);
	let undoTimer: ReturnType<typeof setTimeout> | undefined;

	function setWeek(label: string, fn: (date: string, i: number) => Set<number>) {
		const before = sel;
		const next: Sel = {};
		data.dates.forEach((d, i) => {
			const wanted = fn(d, i);
			next[d] = new Set(DAY_SLOTS.filter((s) => (locked(d, s) ? before[d].has(s) : wanted.has(s))));
		});
		const changed = data.dates.filter((d) => !sameSet(before[d], next[d]));
		if (changed.length === 0) return;
		sel = next;
		save(changed);
		clearTimeout(undoTimer);
		undo = { label, before };
		undoTimer = setTimeout(() => (undo = null), 6000);
	}
	function doUndo() {
		if (!undo) return;
		const { before } = undo;
		undo = null;
		const changed = data.dates.filter((d) => !sameSet(before[d], sel[d]));
		sel = before;
		save(changed);
	}

	const EVENING = DAY_SLOTS.filter((s) => s >= 36); // 18:00–22:00
	const eveningsOn = $derived(
		data.dates.slice(0, 5).every((d) => EVENING.every((s) => locked(d, s) || sel[d].has(s)))
	);
	function toggleEvenings() {
		if (eveningsOn) setWeek('Removed weekday evenings', (d, i) => new Set([...sel[d]].filter((s) => i >= 5 || !EVENING.includes(s))));
		else setWeek('Added weekday evenings', (d, i) => (i < 5 ? new Set([...sel[d], ...EVENING]) : sel[d]));
	}
	const copyLastWeek = () =>
		setWeek('Copied last week', (d) => new Set([...sel[d], ...(data.prevWeek[d] ?? [])]));
	const clearWeek = () => setWeek('Cleared the week', () => new Set());

	const hasPrev = $derived(Object.values(data.prevWeek).some((s) => s.length > 0));
	const total = $derived(Object.values(sel).reduce((n, s) => n + s.size, 0) * (SLOT_MINUTES / 60));
	const filledIn = $derived(
		data.people.filter((p) => (p.id === data.user.id ? total > 0 : data.filledIn.some((q) => q.id === p.id)))
	);
	const missing = $derived(data.people.filter((p) => !filledIn.some((q) => q.id === p.id)));

	// ---- details for the cell under the pointer, focused, or last tapped (works without hover) ----
	let inspect = $state<{ di: number; s: number } | null>(null);
	const detail = $derived.by(() => {
		if (!inspect) return null;
		const date = data.dates[inspect.di];
		const who = [...(sel[date]?.has(inspect.s) ? ['You'] : []), ...(data.others[date]?.[inspect.s] ?? [])];
		const c = data.courtsFree[date]?.[inspect.s];
		return {
			when: `${fmtWeekday(date)} ${fmtDayMonth(date)}, ${slotLabel(inspect.s)}`,
			who: who.length ? who.join(', ') : 'Nobody free yet',
			courts: c === undefined ? null : `${c} doubles court${c === 1 ? '' : 's'} open`
		};
	});

	const cellBg = (on: boolean, n: number) =>
		on
			? 'var(--color-ball)'
			: n
				? `rgb(255 255 255 / ${Math.min(0.03 + n * 0.045, 0.22)})`
				: 'transparent';
</script>

<svelte:head><title>My availability · Courtside</title></svelte:head>
<svelte:window onpointerup={up} onpointercancel={() => { cancelPending(); up(); }} />

{#if data.welcome}
	<div class="mb-6 border border-dashed border-line-strong bg-panel px-4 py-3 text-sm">
		<span class="font-medium">Welcome to Courtside.</span>
		<span class="text-muted">Mark when you can play. It saves as you go.</span>
	</div>
{/if}

<div class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<h1 class="title">My availability</h1>
		<p class="mt-1 text-sm text-muted">
			<span class="hidden sm:inline">Click or drag to mark when you can play; drag over marked cells to erase.</span>
			<span class="sm:hidden">Tap a cell to mark it. Hold, then drag, to mark a range.</span>
		</p>
	</div>
	<div class="flex items-center gap-1">
		<a class="btn-ghost w-8 px-0" href="?week={addDays(data.monday, -7)}" data-sveltekit-noscroll aria-label="Previous week"><ChevronLeft class="size-4" /></a>
		<a class="btn-ghost min-w-36 tabular-nums" href="?week={thisWeek}" data-sveltekit-noscroll title="Jump to this week">
			{fmtDayMonth(data.dates[0])} – {fmtDayMonth(data.dates[6])}
		</a>
		<a class="btn-ghost w-8 px-0" href="?week={addDays(data.monday, 7)}" data-sveltekit-noscroll aria-label="Next week"><ChevronRight class="size-4" /></a>
	</div>
</div>

<div class="mt-6 flex flex-wrap items-center gap-2">
	<button class="btn-ghost {eveningsOn ? 'border-fg! bg-fg! text-black!' : ''}" onclick={toggleEvenings} disabled={!editable} aria-pressed={eveningsOn}>
		<Moon class="size-3.5" /> Weekday evenings
	</button>
	<button class="btn-ghost" onclick={copyLastWeek} disabled={!hasPrev || !editable} title={hasPrev ? 'Add last week’s times to this week' : 'Nothing marked last week'}>
		<Copy class="size-3.5" /> Copy last week
	</button>
	<button class="btn-ghost" onclick={clearWeek} disabled={total === 0 || !editable}><Eraser class="size-3.5" /> Clear week</button>
	{#if !editable}<span class="text-xs text-faint">This week is over.</span>{/if}
</div>

<div class="mt-4 grid gap-6 lg:grid-cols-[1fr_220px]">
	<div class="card p-2 sm:p-3">
		<p class="mb-2 flex min-h-5 flex-wrap items-baseline gap-x-2 border-b border-line px-1 pb-2 text-xs" aria-live="polite">
			{#if detail}
				<span class="font-mono text-fg tabular-nums">{detail.when}</span>
				<span class="text-muted">{detail.who}</span>
				{#if detail.courts}<span class="text-faint">· {detail.courts}</span>{/if}
			{:else}
				<span class="text-faint">Point at, tap or focus a cell to see who's free then.</span>
			{/if}
		</p>
		<div
			{@attach blockScroll}
			class="grid select-none"
			style="grid-template-columns: 2.75rem repeat(7, minmax(0, 1fr));"
			onpointerdown={down}
			onpointermove={move}
			onkeydown={gridKey}
			role="grid"
			aria-label="Weekly availability. Arrow keys move, Space toggles."
			tabindex="-1"
		>
			<div class="sticky top-[100px] z-10 bg-panel sm:top-14"></div>
			{#each data.dates as d (d)}
				<div class="sticky top-[100px] z-10 border-b border-line bg-panel pt-1 pb-2 text-center sm:top-14 {d === data.today ? 'text-ball' : d < data.today ? 'text-faint' : 'text-muted'}">
					<div class="eyebrow text-[10px]">{fmtWeekday(d)}</div>
					<div class="font-mono text-base {d === data.today || d < data.today ? '' : 'text-fg'}">{Number(d.slice(8))}</div>
				</div>
			{/each}

			{#each DAY_SLOTS as s (s)}
				<div class="-mt-1.5 pr-2 text-right font-mono text-[10px] text-faint tabular-nums {s % 2 ? 'invisible' : ''}">{slotLabel(s)}</div>
				{#each data.dates as d, di (d)}
					{@const on = sel[d].has(s)}
					{@const n = data.others[d]?.[s]?.length ?? 0}
					{@const c = data.courtsFree[d]?.[s]}
					{@const lock = locked(d, s)}
					<button
						type="button"
						data-di={di}
						data-slot={s}
						role="gridcell"
						aria-selected={on}
						aria-label="{fmtWeekday(d)} {fmtDayMonth(d)} {slotLabel(s)}{on ? ', you are free' : ''}{n ? `, ${n} others free` : ''}{c === 0 ? ', no court open' : ''}"
						aria-disabled={lock}
						tabindex={focusCell.di === di && focusCell.s === s ? 0 : -1}
						onclick={(e) => keyToggle(e, d, s)}
						onfocus={() => (inspect = { di, s })}
						class="relative h-7 border-l border-line sm:h-[22px] {s % 2 === 0 ? 'border-t border-t-line-strong' : 'border-t border-t-line/50'}
							{lock ? 'cursor-not-allowed' : 'cursor-pointer'} {painting ? '' : 'hover:brightness-125'} focus-visible:z-10 focus-visible:outline-offset-0"
						style="background:{cellBg(on, n)};{lock ? 'opacity:.35' : ''}"
					>
						{#if c === 0}
							<span
								class="pointer-events-none absolute inset-0 {on
									? 'bg-[repeating-linear-gradient(135deg,rgb(8_9_10/0.45)_0_2px,transparent_2px_6px)]'
									: 'bg-[repeating-linear-gradient(135deg,rgb(248_113_113/0.16)_0_2px,transparent_2px_6px)]'}"
							></span>
						{/if}
						{#if n}
							<span class="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 font-mono text-[10px] tabular-nums {on ? 'font-semibold text-bg/80' : 'text-muted'}">{n}</span>
						{/if}
					</button>
				{/each}
			{/each}
		</div>
	</div>

	<aside class="space-y-4 text-sm">
		<div class="card p-4">
			<h2 class="eyebrow">Legend</h2>
			<ul class="mt-3 space-y-2.5 text-xs text-muted">
				<li class="flex items-center gap-2.5"><span class="h-3.5 w-5 bg-ball"></span> You're free</li>
				<li class="flex items-center gap-2.5">
					<span class="relative h-3.5 w-5 bg-white/15"><span class="absolute inset-0 grid place-items-center font-mono text-[9px] text-muted">3</span></span>
					Friends free too (also shown on your cells)
				</li>
				<li class="flex items-center gap-2.5">
					<span class="h-3.5 w-5 border border-line bg-[repeating-linear-gradient(135deg,rgb(248_113_113/0.3)_0_2px,transparent_2px_6px)]"></span>
					No doubles court open
				</li>
			</ul>
		</div>
		<div class="card p-4">
			<h2 class="eyebrow">This week</h2>
			<p class="mt-0.5 text-xs text-muted">{filledIn.length} of {data.people.length} filled in</p>
			<ul class="mt-3 space-y-2">
				{#each filledIn as p (p.id)}
					<li class="flex items-center gap-2 text-[13px]">
						<Avatar id={p.id} name={p.name} size={20} me={p.id === data.user.id} />
						{p.name}{#if p.id === data.user.id}<span class="text-faint">&nbsp;(you)</span>{/if}
						<Check class="ml-auto size-3.5 text-free" />
					</li>
				{/each}
				{#each missing as p (p.id)}
					<li class="flex items-center gap-2 text-[13px] text-faint">
						<span class="opacity-50"><Avatar id={p.id} name={p.name} size={20} /></span>
						{p.name}{#if p.id === data.user.id}&nbsp;(you){/if}
						<span class="ml-auto text-[11px]">not yet</span>
					</li>
				{/each}
			</ul>
		</div>
	</aside>
</div>

<!-- save status and undo: fixed at the bottom so they're visible while painting on a phone -->
<div class="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
	{#if undo || status !== 'idle'}
		<div class="pointer-events-auto flex items-center gap-3 border border-line-strong bg-panel-2 py-1.5 pr-1.5 pl-3.5 font-mono text-xs shadow-2xl shadow-black" role="status">
			{#if status === 'saving'}
				<LoaderCircle class="size-3.5 animate-spin text-muted" /><span class="text-muted">Saving…</span>
			{:else if status === 'error'}
				<TriangleAlert class="size-3.5 text-danger" /><span class="text-danger">Couldn't save. Check your connection.</span>
			{:else}
				<Check class="size-3.5 text-free" /><span class="text-muted">{undo ? undo.label : 'Saved'} · {total} h this week</span>
			{/if}
			{#if undo}
				<button class="btn-primary h-7" onclick={doUndo}><Undo2 class="size-3.5" /> Undo</button>
			{:else}
				<span class="w-1"></span>
			{/if}
		</div>
	{/if}
</div>

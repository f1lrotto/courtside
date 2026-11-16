<script lang="ts">
	import { ChevronDown, ExternalLink } from '@lucide/svelte';
	import Avatar from './Avatar.svelte';
	import type { Opportunity } from '../match';
	import { PLAYERS_NEEDED, bestStart, premium } from '../match';
	import { slotLabel } from '../time';
	import { bookingUrl, venueById } from '../venues';
	import { courtLabel, euro, t } from '../i18n';

	let { o, meId, len }: { o: Opportunity; meId: number; len: number } = $props();

	const slots = $derived(len / 30);
	let open = $state(false);
	let picked = $state<number | null>(null);
	const pick = $derived(picked ?? bestStart(o));
	const start = $derived(o.starts[Math.min(pick, o.starts.length - 1)]);
	const cheapest = $derived(start.courts[0]);
	// how much more than the cheapest court at this time, when the cheaper ones are booked
	const extra = $derived(premium(start));
	const over = (price: number | null) => (price !== null && start.floor !== null ? price - start.floor : 0);
	const needed = $derived(PLAYERS_NEEDED[o.kind]);
	const includesMe = $derived(start.players.some((p) => p.id === meId));
	const flexible = $derived(o.starts.length > 1);
	// you first, then everyone else by name
	const shown = $derived([...start.players].sort((a, b) => Number(b.id === meId) - Number(a.id === meId)));
	const each = (price: number) => euro(Math.round((price / needed) * 100) / 100);

	// who joins or leaves along the window, relative to the suggested start
	const changes = $derived.by(() => {
		if (!flexible) return '';
		const notes: string[] = [];
		for (const p of o.players) {
			const at = o.starts.filter((s) => s.players.some((q) => q.id === p.id)).map((s) => s.slot);
			if (at.length === o.starts.length) continue;
			const first = at[0];
			const last = at[at.length - 1];
			if (first > o.firstStart) notes.push(t().card.startsFrom(p.name, slotLabel(first)));
			else if (last < o.lastStart) notes.push(t().card.onlyUntil(p.name, slotLabel(last)));
		}
		return notes.join(' · ');
	});
</script>

<div class="card relative overflow-hidden transition-colors {open ? 'z-10 border-line-strong' : 'hover:z-10 hover:border-line-strong'}">
	<div class="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5">
		<button
			type="button"
			class="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-6 gap-y-2.5 text-left"
			aria-expanded={open}
			onclick={() => (open = !open)}
		>
			<div class="w-full shrink-0 sm:w-44">
				<div class="font-mono text-lg tracking-tight tabular-nums">
					{slotLabel(start.slot)}<span class="text-faint"> – </span>{slotLabel(start.slot + slots)}
				</div>
				<div class="eyebrow mt-0.5 text-[10px] text-muted">
					{#if flexible}
						{t().card.canStart(slotLabel(o.firstStart), slotLabel(o.lastStart))}
					{:else}
						{t().card.game(len)}
					{/if}
				</div>
			</div>

			<div class="flex min-w-0 flex-1 items-center gap-3">
				<div class="flex shrink-0 gap-px">
					{#each shown as p (p.id)}
						<Avatar id={p.id} name={p.name} me={p.id === meId} />
					{/each}
				</div>
				<div class="min-w-0 text-[13px] leading-snug">
					<span class="text-fg">{shown.map((p) => (p.id === meId ? t().common.you : p.name)).join(', ')}</span>
					<span class="eyebrow block text-[10px] text-faint">
						{t().card.free(start.players.length)}{#if start.players.length > needed}&nbsp;· {t().card.pick(needed)}{/if}{#if !includesMe}&nbsp;· {t().card.withoutYou}{/if}
					</span>
				</div>
			</div>
			<ChevronDown class="hidden size-4 shrink-0 text-faint transition-transform sm:block {open ? 'rotate-180' : ''}" />
		</button>

		<div class="flex w-full shrink-0 items-center gap-2 sm:w-auto">
			<div class="min-w-0 flex-1 text-right text-xs leading-snug sm:flex-none">
				<span class="flex items-center justify-end gap-1.5 text-[13px] text-fg">
					<span class="size-2 {cheapest.venue === 'aurial' ? 'bg-sky-400' : 'bg-amber-300'}"></span>
					{venueById(cheapest.venue).short} · {courtLabel(cheapest.name)}
				</span>
				<span class="text-muted">
					{#if cheapest.price !== null}{euro(cheapest.price)} · {t().common.each(each(cheapest.price))}{/if}{#if start.courts.length > 1}<span class="text-faint">&nbsp;· {t().card.more(start.courts.length - 1)}</span>{/if}
				</span>
				{#if extra > 0}
					<span
						class="eyebrow mt-1 block text-[10px] text-orange-400"
						title={t().card.premiumTitle(euro(start.floor!))}
					>
						{t().common.premium(euro(extra))}
					</span>
				{/if}
			</div>
			<a
				href={bookingUrl(cheapest.venue, o.date)}
				target="_blank"
				rel="noopener noreferrer"
				class="btn-primary"
				aria-label={t().common.bookAria(`${venueById(cheapest.venue).short} ${courtLabel(cheapest.name)}`, slotLabel(start.slot))}
			>
				{t().common.book} <ExternalLink class="size-3" />
			</a>
			<button
				type="button"
				class="btn-quiet w-8 px-0 sm:hidden"
				aria-label={open ? t().card.hideDetails : t().card.showDetails}
				aria-expanded={open}
				onclick={() => (open = !open)}
			>
				<ChevronDown class="size-4 transition-transform {open ? 'rotate-180' : ''}" />
			</button>
		</div>
	</div>

	{#if open}
		<div class="border-t border-dashed border-line-strong bg-bg px-4 py-4">
			{#if flexible}
				<div class="mb-1 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={t().card.startTime}>
					<span class="eyebrow mr-1 text-muted">{t().card.startAt}</span>
					{#each o.starts as s, i (s.slot)}
						<button
							type="button"
							role="radio"
							aria-checked={i === pick}
							class="h-7 cursor-pointer border px-2 font-mono text-xs tabular-nums transition-colors
								{i === pick ? 'border-fg bg-fg text-black' : 'border-line-strong text-muted hover:border-muted hover:text-fg'}"
							onclick={() => (picked = i)}
						>
							{slotLabel(s.slot)}<span class="ml-1 {i === pick ? 'text-black/55' : 'text-faint'}">{t().card.players(s.players.length)}</span>{#if premium(s) > 0}<span
										class="ml-1 {i === pick ? 'text-orange-700' : 'text-orange-400'}"
										title={t().card.onlyPricier}>+{euro(premium(s))}</span
									>{/if}
						</button>
					{/each}
				</div>
				{#if changes}<p class="mb-1 text-xs text-faint">{changes}</p>{/if}
			{/if}
			<div class="eyebrow mt-3 text-muted">
				{t().card.courtsFree(start.courts.length, slotLabel(start.slot), slotLabel(start.slot + slots))}
			</div>
			<ul class="mt-2 grid border-t border-l border-line sm:grid-cols-2 lg:grid-cols-3">
				{#each start.courts as c (c.venue + c.courtId)}
					<li class="border-r border-b border-line">
						<a
							href={bookingUrl(c.venue, o.date)}
							target="_blank"
							rel="noopener noreferrer"
							class="group flex h-full items-center gap-3 bg-panel px-3 py-2 transition-colors hover:bg-hover"
						>
							<span class="size-2 shrink-0 {c.venue === 'aurial' ? 'bg-sky-400' : 'bg-amber-300'}"></span>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-[13px]">{venueById(c.venue).short} · {courtLabel(c.name)}</span>
								{#if c.price !== null}
									<span class="block text-xs text-muted"
										>{euro(c.price)} <span class="text-faint">· {t().common.each(each(c.price))}</span
										>{#if over(c.price) > 0}<span class="text-orange-400">&nbsp;· +{euro(over(c.price))}</span>{/if}</span
									>
								{/if}
							</span>
							<span class="eyebrow flex items-center gap-1 text-muted group-hover:text-fg">{t().common.book} <ExternalLink class="size-3" /></span>
						</a>
					</li>
				{/each}
			</ul>
			<p class="mt-3 text-xs text-faint">{t().card.bookingHint(slotLabel(start.slot))}</p>
		</div>
	{/if}
</div>

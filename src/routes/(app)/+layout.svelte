<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';
	import { timeAgo } from '#lib/format.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const links = $derived([
		{ href: '/', label: 'Matches' },
		{ href: '/availability', label: 'My availability' },
		{ href: '/courts', label: 'Courts' },
		...(data.user.role === 'admin' ? [{ href: '/admin', label: 'Admin' }] : [])
	]);
	const active = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<div class="min-h-dvh">
	<header class="sticky top-0 z-30 border-b border-line bg-bg">
		<div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 px-4 sm:h-14 sm:flex-nowrap sm:px-6">
			<a href="/" class="flex h-14 shrink-0 items-center" aria-label="Courtside home"><Logo wordmark /></a>
			<nav class="order-last -mx-4 -mb-px flex h-11 w-[calc(100%+2rem)] items-stretch overflow-x-auto border-t border-line sm:order-none sm:mx-0 sm:h-14 sm:w-auto sm:border-t-0 sm:border-l" aria-label="Main">
				{#each links as l (l.href)}
					<a
						href={l.href}
						aria-current={active(l.href) ? 'page' : undefined}
						class="eyebrow relative flex flex-1 items-center justify-center border-r border-line px-2 whitespace-nowrap transition-colors last:border-r-0 focus-visible:outline-offset-[-2px] sm:flex-none sm:px-5 sm:last:border-r
							{active(l.href) ? 'text-fg after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-fg' : 'text-muted hover:text-fg'}"
					>
						{l.label}
					</a>
				{/each}
			</nav>
			<div class="ml-auto flex items-center gap-3">
				<span class="eyebrow hidden items-center gap-2 text-[10px] text-faint md:flex" title="Court data from the clubs' booking pages">
					<span class="size-1.5 {data.lastUpdated ? 'bg-free' : 'bg-faint'} {data.refreshing ? 'animate-pulse' : ''}"></span>
					{data.refreshing ? 'Syncing courts…' : data.lastUpdated ? `Courts synced ${timeAgo(data.lastUpdated)}` : 'Courts not synced yet'}
				</span>
				<form method="POST" action="/logout" class="flex items-center gap-2">
					<a href="/account" aria-current={active('/account') ? 'page' : undefined} class="text-[13px] underline-offset-4 hover:text-fg hover:underline {active('/account') ? 'text-fg underline' : 'text-muted'}" title="Your account">{data.user.name}</a>
					<button class="btn-ghost h-7 px-2">Sign out</button>
				</form>
			</div>
		</div>
	</header>
	<main class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
		{@render children()}
	</main>
</div>

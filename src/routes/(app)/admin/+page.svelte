<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Check, Copy, KeyRound, RefreshCw, Trash2 } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import { timeAgo } from '#lib/format.js';
	import { VENUES } from '#lib/venues.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let copied = $state('');
	let shown = $state('');
	const signupLink = (email: string) => `${page.url.origin}/signup?email=${encodeURIComponent(email)}`;
	async function copy(email: string) {
		shown = email;
		try {
			await navigator.clipboard.writeText(signupLink(email));
			copied = email;
			setTimeout(() => copied === email && (copied = ''), 1500);
		} catch {
			// clipboard blocked: the link stays visible below the row to copy by hand
		}
	}
	function confirmRole(e: Event & { currentTarget: HTMLSelectElement }, name: string, was: string) {
		const el = e.currentTarget;
		const msg = el.value === 'admin' ? `Make ${name} an admin? Admins can invite and remove people.` : `Remove admin rights from ${name}?`;
		if (confirm(msg)) el.form?.requestSubmit();
		else el.value = was;
	}

	const sync = $derived(
		VENUES.map((v) => {
			const rows = data.status.filter((s) => s.venue === v.id);
			const ok = rows.filter((r) => !r.error);
			const last = ok.map((r) => r.fetched_at!).sort().at(-1);
			return { v, days: rows.length, ok: ok.length, errors: rows.filter((r) => r.error), last };
		})
	);
</script>

<svelte:head><title>Admin · Courtside</title></svelte:head>

<h1 class="title">Admin</h1>
<p class="mt-1 text-sm text-muted">Invite friends, manage members and check the court sync.</p>

<div class="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
	<div class="space-y-6">
		<section class="card">
			<header class="border-b border-line px-5 py-4">
				<h2 class="eyebrow">Invite someone</h2>
				<p class="mt-0.5 text-xs text-muted">
					No email is sent. Tell them to sign up with this address, or copy their signup link below.
				</p>
			</header>
			<form method="POST" action="?/invite" use:enhance class="flex flex-wrap items-start gap-2 px-5 py-4">
				<input class="input min-w-56 flex-1" name="email" type="email" placeholder="friend@example.com" required aria-label="Email to invite" value={form?.invite && 'error' in form.invite ? form.invite.email : ''} />
				<select name="role" class="input w-auto pr-8" aria-label="Role">
					<option value="user">Member</option>
					<option value="admin">Admin</option>
				</select>
				<button class="btn-primary h-10">Invite</button>
				{#if form?.invite && 'error' in form.invite}
					<p class="w-full text-sm text-danger" role="alert">{form.invite.error}</p>
				{:else if form?.invite && 'ok' in form.invite}
					<p class="w-full text-sm text-free" role="status">Invited {form.invite.ok}. They can sign up now.</p>
				{/if}
			</form>
			{#if data.invites.length}
				<ul class="divide-y divide-line border-t border-line-strong">
					{#each data.invites as inv (inv.email)}
						<li class="flex flex-wrap items-center gap-3 px-5 py-3 text-[13px]">
							<span class="min-w-0 flex-1 truncate">{inv.email}</span>
							{#if inv.role === 'admin'}<span class="chip">admin</span>{/if}
							<span class="text-xs text-faint">pending · {timeAgo(inv.created_at)}</span>
							<button type="button" class="btn-quiet h-7 text-xs" onclick={() => copy(inv.email)}>
								{#if copied === inv.email}<Check class="size-3.5 text-free" /> Copied{:else}<Copy class="size-3.5" /> Signup link{/if}
							</button>
							<form method="POST" action="?/revoke" use:enhance>
								<input type="hidden" name="email" value={inv.email} />
								<button class="btn-quiet h-7 text-xs hover:text-danger">Revoke</button>
							</form>
							{#if shown === inv.email}
								<input
									class="input h-8 w-full font-mono text-xs text-muted"
									readonly
									value={signupLink(inv.email)}
									aria-label="Signup link for {inv.email}"
									onfocus={(e) => e.currentTarget.select()}
								/>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="card">
			<header class="border-b border-line px-5 py-4">
				<h2 class="eyebrow">Members <span class="ml-1 text-faint">{data.users.length}</span></h2>
			</header>
			<ul class="divide-y divide-line">
				{#each data.users as u (u.id)}
					{@const self = u.id === data.user.id}
					<li class="flex flex-wrap items-center gap-3 px-5 py-3">
						<Avatar id={u.id} name={u.name} size={26} />
						<div class="min-w-0 flex-1">
							<div class="truncate text-[13px]">{u.name}{#if self}<span class="text-faint">&nbsp;(you)</span>{/if}</div>
							<div class="truncate text-xs text-muted">{u.email}</div>
						</div>
						<form method="POST" action="?/setRole" use:enhance>
							<input type="hidden" name="id" value={u.id} />
							<select
								name="role"
								class="input h-7 w-auto py-0 pr-7 text-xs"
								disabled={self}
								aria-label="Role for {u.name}"
								onchange={(e) => confirmRole(e, u.name, u.role)}
							>
								<option value="user" selected={u.role !== 'admin'}>Member</option>
								<option value="admin" selected={u.role === 'admin'}>Admin</option>
							</select>
						</form>
						<form
							method="POST"
							action="?/resetPassword"
							use:enhance={({ cancel }) => {
								if (!confirm(`Reset ${u.name}'s password? They're signed out and need the new password you'll see here.`)) cancel();
							}}
						>
							<input type="hidden" name="id" value={u.id} />
							<button class="btn-quiet h-7 w-7 px-0" disabled={self} aria-label="Reset password for {u.name}" title={self ? 'Change yours on your account page' : `Reset ${u.name}'s password`}>
								<KeyRound class="size-3.5" />
							</button>
						</form>
						<form
							method="POST"
							action="?/remove"
							use:enhance={({ cancel }) => {
								if (!confirm(`Remove ${u.name}? Their availability is deleted too.`)) cancel();
							}}
						>
							<input type="hidden" name="id" value={u.id} />
							<button class="btn-quiet h-7 w-7 px-0 hover:text-danger" disabled={self} aria-label="Remove {u.name}" title={self ? "You can't remove yourself" : `Remove ${u.name}`}>
								<Trash2 class="size-3.5" />
							</button>
						</form>
						{#if form?.reset?.id === u.id}
							<p class="w-full border border-dashed border-line-strong px-3 py-2 text-xs text-muted" role="status">
								New password for {u.name}:
								<code class="ml-1 bg-hover px-1.5 py-0.5 font-mono text-[13px] text-fg select-all" data-temp-password>{form.reset.password}</code>
								<span class="text-faint">· shown once. Send it to them; they can change it on their account page.</span>
							</p>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	</div>

	<section class="card h-fit">
		<header class="flex items-center justify-between border-b border-line px-5 py-4">
			<h2 class="eyebrow">Court sync</h2>
			<form method="POST" action="?/refresh" use:enhance={() => async ({ update }) => update()}>
				<button class="btn-ghost h-7" disabled={data.refreshing}>
					<RefreshCw class="size-3.5 {data.refreshing ? 'animate-spin' : ''}" />
					{data.refreshing ? 'Syncing…' : 'Sync now'}
				</button>
			</form>
		</header>
		<ul class="divide-y divide-line">
			{#each sync as s (s.v.id)}
				<li class="px-5 py-3.5">
					<div class="flex items-center gap-2 text-[13px]">
						<span class="size-2 {s.errors.length ? 'bg-danger' : s.ok ? 'bg-free' : 'bg-faint'}"></span>
						{s.v.name}
					</div>
					<div class="mt-1 text-xs text-muted">
						{s.ok}/{s.days || 14} days synced{#if s.last}&nbsp;· {timeAgo(s.last)}{/if}
					</div>
					{#each s.errors.slice(0, 3) as e (e.date)}
						<div class="mt-1 text-xs text-danger">{e.date}: {e.error}</div>
					{/each}
				</li>
			{/each}
		</ul>
		<p class="border-t border-line px-5 py-3 text-xs text-faint">Synced automatically every 15 minutes. Aurial Rača is not included.</p>
	</section>
</div>

<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import LangSwitch from '#lib/components/LangSwitch.svelte';
	import { t } from '#lib/i18n.js';
	let { children } = $props();
</script>

<div class="grid min-h-dvh lg:grid-cols-2">
	<!-- left: hero, the way better-auth.com opens -->
	<section
		class="relative flex flex-col justify-between overflow-hidden border-b border-line px-6 py-6 lg:border-r lg:border-b-0 lg:px-10 lg:py-8"
	>
		<div
			aria-hidden="true"
			class="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,var(--color-line)_0_1px,transparent_1px_6px)] mask-[radial-gradient(ellipse_70%_60%_at_70%_45%,#000_10%,transparent_70%)] opacity-70"
		></div>
		<div class="relative flex items-center justify-between"><Logo wordmark /><LangSwitch /></div>
		<div class="relative mt-8 lg:mt-0">
			<p class="eyebrow hidden items-center gap-2 border border-line-strong bg-bg px-2.5 py-1 text-muted sm:inline-flex">
				<span class="size-1.5 bg-ball"></span> {t().authHero.badge}
			</p>
			<p class="max-w-[15ch] text-[32px] leading-[1.05] tracking-[-0.04em] text-balance sm:mt-6 sm:text-[56px]">
				{t().authHero.headline}
			</p>
		</div>
		<p class="eyebrow relative mt-10 hidden text-faint sm:block lg:mt-0">{t().authHero.inviteOnly} <span class="px-2">/</span> Bratislava</p>
	</section>

	<!-- right: the form -->
	<section class="flex items-start justify-center px-6 py-10 sm:items-center sm:py-14">
		<div class="frame w-full max-w-[360px] bg-bg">
			<div class="px-6 pt-6 pb-6">
				{@render children()}
			</div>
		</div>
	</section>
</div>

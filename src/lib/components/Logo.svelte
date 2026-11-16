<script lang="ts">
	let { size = 20, wordmark = false }: { size?: number; wordmark?: boolean } = $props();
</script>

<span class="inline-flex items-center gap-2.5">
	<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
		<rect width="32" height="32" fill="#fafafa" />
		<path d="M9 6c4.6 2.7 6.5 8.2 4.4 20M23 26c-4.6-2.7-6.5-8.2-4.4-20" fill="none" stroke="#000" stroke-width="2.6" />
	</svg>
	{#if wordmark}<span class="text-[17px] tracking-[-0.01em] uppercase">Courtside.</span>{/if}
</span>

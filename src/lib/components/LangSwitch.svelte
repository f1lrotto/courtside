<script lang="ts">
	import { LANGS, lang, setLang, t } from '../i18n';

	let { class: cls = '' }: { class?: string } = $props();
</script>

<div class="flex border border-line-strong {cls}" role="group" aria-label={t().common.language}>
	{#each LANGS as l (l)}
		<button
			type="button"
			lang={l}
			aria-pressed={lang() === l}
			title={l === 'en' ? 'English' : 'Slovenčina'}
			class="eyebrow h-7 cursor-pointer border-r border-line-strong px-2 text-[10px] transition-colors last:border-r-0
				{lang() === l ? 'bg-fg text-bg' : 'text-muted hover:bg-hover hover:text-fg'}"
			onclick={() => setLang(l)}
		>
			{l}
		</button>
	{/each}
</div>

<script lang="ts">
	import { initials, personHue } from '../format';
	import { t } from '../i18n';

	let { id, name, size = 22, me = false }: { id: number; name: string; size?: number; me?: boolean } = $props();
	const hue = $derived(personHue(id));
</script>

<span
	title={me ? `${name} ${t().common.youParen}` : name}
	class="relative inline-flex shrink-0 items-center justify-center font-mono font-semibold outline-1 outline-bg select-none {me ? 'z-10' : ''}"
	style="width:{size}px;height:{size}px;font-size:{Math.round(size * 0.45)}px;background:hsl({hue} 45% 22%);color:hsl({hue} 80% 82%);{me
		? 'outline:2px solid var(--color-ball);outline-offset:0'
		: ''}"
>
	{initials(name)}
</span>

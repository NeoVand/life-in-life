<script lang="ts">
	import { getSimulationState } from '../stores/simulation.svelte.js';
	import { RULE_PRESETS } from '../utils/rules.js';

	interface Props {
		onclose: () => void;
		oninitialize: (type: string, density?: number) => void;
	}

	let { onclose, oninitialize }: Props = $props();

	const simState = getSimulationState();

	// Initialization patterns
	const PATTERNS = {
		random: [
			{ id: 'random-sparse', name: 'Sparse', density: 0.15, desc: 'Low density random' },
			{ id: 'random-medium', name: 'Medium', density: 0.3, desc: 'Balanced random' },
			{ id: 'random-dense', name: 'Dense', density: 0.5, desc: 'High density random' }
		],
		structures: [
			{ id: 'glider', name: 'Glider', desc: 'Classic diagonal spaceship' },
			{ id: 'glider-gun', name: 'Glider Gun', desc: 'Gosper glider gun' },
			{ id: 'r-pentomino', name: 'R-Pentomino', desc: 'Long-lived methuselah' },
			{ id: 'acorn', name: 'Acorn', desc: 'Grows for 5206 generations' },
			{ id: 'diehard', name: 'Diehard', desc: 'Vanishes after 130 generations' }
		],
		oscillators: [
			{ id: 'blinker', name: 'Blinker', desc: 'Period 2' },
			{ id: 'pulsar', name: 'Pulsar', desc: 'Period 3, symmetric' },
			{ id: 'pentadecathlon', name: 'Pentadecathlon', desc: 'Period 15' }
		],
		still: [
			{ id: 'block', name: 'Block', desc: '2x2 still life' },
			{ id: 'beehive', name: 'Beehive', desc: '6-cell still life' },
			{ id: 'loaf', name: 'Loaf', desc: '7-cell still life' }
		]
	};

	let selectedCategory = $state('random');
	let selectedPattern = $state('random-medium');
	let customDensity = $state(30);

	function handleInitialize() {
		const pattern = getAllPatterns().find(p => p.id === selectedPattern);
		if (pattern && 'density' in pattern) {
			oninitialize(selectedPattern, pattern.density);
		} else if (selectedCategory === 'random') {
			oninitialize('random-custom', customDensity / 100);
		} else {
			oninitialize(selectedPattern);
		}
		onclose();
	}

	function getAllPatterns() {
		return [...PATTERNS.random, ...PATTERNS.structures, ...PATTERNS.oscillators, ...PATTERNS.still];
	}

	// Get appropriate patterns based on current rule
	const relevantPatterns = $derived.by(() => {
		const rule = simState.currentRule.ruleString;
		// Most patterns work best with Life (B3/S23)
		if (rule === 'B3/S23') {
			return PATTERNS;
		}
		// For other rules, mainly offer random initialization
		return {
			random: PATTERNS.random,
			structures: [],
			oscillators: [],
			still: []
		};
	});

	const isLifeRule = $derived(simState.currentRule.ruleString === 'B3/S23');
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={(e) => e.target === e.currentTarget && onclose()}>
	<div class="modal">
		<div class="header">
			<span class="title">Initialize Grid</span>
			<button class="close-btn" onclick={onclose} aria-label="Close">✕</button>
		</div>

		<div class="content">
			<!-- Category tabs -->
			<div class="tabs">
				<button 
					class="tab" 
					class:active={selectedCategory === 'random'}
					onclick={() => { selectedCategory = 'random'; selectedPattern = 'random-medium'; }}
				>
					Random
				</button>
				{#if isLifeRule}
					<button 
						class="tab" 
						class:active={selectedCategory === 'structures'}
						onclick={() => { selectedCategory = 'structures'; selectedPattern = 'glider'; }}
					>
						Structures
					</button>
					<button 
						class="tab" 
						class:active={selectedCategory === 'oscillators'}
						onclick={() => { selectedCategory = 'oscillators'; selectedPattern = 'blinker'; }}
					>
						Oscillators
					</button>
					<button 
						class="tab" 
						class:active={selectedCategory === 'still'}
						onclick={() => { selectedCategory = 'still'; selectedPattern = 'block'; }}
					>
						Still Life
					</button>
				{/if}
			</div>

			<!-- Pattern grid -->
			<div class="patterns">
				{#if selectedCategory === 'random'}
					{#each PATTERNS.random as pattern}
						<button 
							class="pattern-btn"
							class:selected={selectedPattern === pattern.id}
							onclick={() => selectedPattern = pattern.id}
						>
							<span class="pattern-name">{pattern.name}</span>
							<span class="pattern-desc">{pattern.desc}</span>
						</button>
					{/each}
					<!-- Custom density option -->
					<div class="custom-density" class:selected={selectedPattern === 'random-custom'}>
						<button 
							class="pattern-btn custom"
							class:selected={selectedPattern === 'random-custom'}
							onclick={() => selectedPattern = 'random-custom'}
						>
							<span class="pattern-name">Custom</span>
							<span class="pattern-desc">{customDensity}% density</span>
						</button>
						{#if selectedPattern === 'random-custom'}
							<input 
								type="range" 
								min="5" 
								max="80" 
								bind:value={customDensity}
								class="density-slider"
							/>
						{/if}
					</div>
				{:else if selectedCategory === 'structures'}
					{#each PATTERNS.structures as pattern}
						<button 
							class="pattern-btn"
							class:selected={selectedPattern === pattern.id}
							onclick={() => selectedPattern = pattern.id}
						>
							<span class="pattern-name">{pattern.name}</span>
							<span class="pattern-desc">{pattern.desc}</span>
						</button>
					{/each}
				{:else if selectedCategory === 'oscillators'}
					{#each PATTERNS.oscillators as pattern}
						<button 
							class="pattern-btn"
							class:selected={selectedPattern === pattern.id}
							onclick={() => selectedPattern = pattern.id}
						>
							<span class="pattern-name">{pattern.name}</span>
							<span class="pattern-desc">{pattern.desc}</span>
						</button>
					{/each}
				{:else if selectedCategory === 'still'}
					{#each PATTERNS.still as pattern}
						<button 
							class="pattern-btn"
							class:selected={selectedPattern === pattern.id}
							onclick={() => selectedPattern = pattern.id}
						>
							<span class="pattern-name">{pattern.name}</span>
							<span class="pattern-desc">{pattern.desc}</span>
						</button>
					{/each}
				{/if}
			</div>

			{#if !isLifeRule}
				<div class="note">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<path d="M12 16v-4M12 8h.01" />
					</svg>
					<span>Structured patterns are only available for Conway's Life (B3/S23)</span>
				</div>
			{/if}
		</div>

		<div class="footer">
			<button class="btn cancel" onclick={onclose}>Cancel</button>
			<button class="btn apply" onclick={handleInitialize}>Initialize</button>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: var(--ui-bg, rgba(12, 12, 18, 0.85));
		backdrop-filter: blur(16px);
		border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.1));
		border-radius: 12px;
		padding: 0.8rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
		min-width: 320px;
		max-width: 400px;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.title {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--ui-text-hover, #e0e0e0);
	}

	.close-btn {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: var(--ui-text, #666);
		font-size: 0.9rem;
		cursor: pointer;
		border-radius: 4px;
	}

	.close-btn:hover {
		background: var(--ui-border, rgba(255, 255, 255, 0.1));
		color: var(--ui-text-hover, #fff);
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.tabs {
		display: flex;
		gap: 0.25rem;
		background: var(--ui-input-bg, rgba(0, 0, 0, 0.2));
		padding: 0.2rem;
		border-radius: 6px;
	}

	.tab {
		flex: 1;
		padding: 0.4rem 0.5rem;
		background: transparent;
		border: none;
		color: var(--ui-text, #888);
		font-size: 0.7rem;
		font-weight: 500;
		cursor: pointer;
		border-radius: 4px;
		transition: all 0.15s;
	}

	.tab:hover {
		color: var(--ui-text-hover, #fff);
	}

	.tab.active {
		background: var(--ui-accent-bg, rgba(45, 212, 191, 0.2));
		color: var(--ui-accent, #2dd4bf);
	}

	.patterns {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.4rem;
	}

	.pattern-btn {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 0.5rem 0.6rem;
		background: var(--ui-input-bg, rgba(0, 0, 0, 0.2));
		border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.08));
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.pattern-btn:hover {
		border-color: var(--ui-border-hover, rgba(255, 255, 255, 0.15));
		background: var(--ui-bg-hover, rgba(20, 20, 30, 0.5));
	}

	.pattern-btn.selected {
		background: var(--ui-accent-bg, rgba(45, 212, 191, 0.15));
		border-color: var(--ui-accent-border, rgba(45, 212, 191, 0.4));
	}

	.pattern-name {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--ui-text-hover, #e0e0e0);
	}

	.pattern-btn.selected .pattern-name {
		color: var(--ui-accent, #2dd4bf);
	}

	.pattern-desc {
		font-size: 0.6rem;
		color: var(--ui-text, #666);
		margin-top: 0.15rem;
	}

	.custom-density {
		grid-column: span 2;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.custom-density .pattern-btn {
		width: 100%;
	}

	.density-slider {
		width: 100%;
		accent-color: var(--ui-accent, #2dd4bf);
	}

	.note {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem;
		background: var(--ui-input-bg, rgba(0, 0, 0, 0.2));
		border-radius: 6px;
		font-size: 0.65rem;
		color: var(--ui-text, #888);
	}

	.note svg {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}

	.footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.4rem;
		padding-top: 0.4rem;
		border-top: 1px solid var(--ui-border, rgba(255, 255, 255, 0.06));
	}

	.btn {
		padding: 0.4rem 0.9rem;
		border-radius: 5px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn.cancel {
		background: transparent;
		border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.1));
		color: var(--ui-text, #888);
	}

	.btn.cancel:hover {
		background: var(--ui-border, rgba(255, 255, 255, 0.05));
		color: var(--ui-text-hover, #e0e0e0);
	}

	.btn.apply {
		background: var(--ui-accent, #2dd4bf);
		border: none;
		color: #0a0a0f;
	}

	.btn.apply:hover {
		filter: brightness(1.15);
	}
</style>


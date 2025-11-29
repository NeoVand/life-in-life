<script lang="ts">
	import Canvas from '$lib/components/Canvas.svelte';
	import Controls from '$lib/components/Controls.svelte';
	import RuleEditor from '$lib/components/RuleEditor.svelte';
	import HelpOverlay from '$lib/components/HelpOverlay.svelte';
	import Settings from '$lib/components/Settings.svelte';
	import { getSimulationState, getUIState } from '$lib/stores/simulation.svelte.js';

	const simState = getSimulationState();
	const uiState = getUIState();
	
	let showHelp = $state(false);
	let canvas: Canvas;

	// Convert alive color (0-1 RGB) to CSS color strings
	const accentColor = $derived.by(() => {
		const [r, g, b] = simState.aliveColor;
		return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
	});

	const accentColorBg = $derived.by(() => {
		const [r, g, b] = simState.aliveColor;
		return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 0.15)`;
	});

	const accentColorBorder = $derived.by(() => {
		const [r, g, b] = simState.aliveColor;
		return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 0.3)`;
	});

	function handleClear() {
		canvas.clear();
	}

	function handleRandomize() {
		canvas.randomize();
	}

	function handleStep() {
		canvas.stepOnce();
	}

	function handleResetView() {
		canvas.resetView();
	}

	function handleRuleChange() {
		canvas.updateRule();
	}

	function handleGridSizeChange(width: number, height: number) {
		canvas.resize(width, height);
	}

	function handleScreenshot() {
		canvas.screenshot();
	}

	function handleKeydown(e: KeyboardEvent) {
		// Ignore if typing in an input
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
			return;
		}

		switch (e.code) {
			case 'Space':
				e.preventDefault();
				simState.togglePlay();
				break;
			case 'KeyC':
				if (!e.ctrlKey && !e.metaKey) {
					handleClear();
				}
				break;
			case 'KeyR':
				if (!e.ctrlKey && !e.metaKey) {
					handleRandomize();
				}
				break;
			case 'KeyS':
				if (!e.ctrlKey && !e.metaKey) {
					handleStep();
				}
				break;
			case 'KeyG':
				simState.showGrid = !simState.showGrid;
				break;
			case 'KeyE':
				uiState.showRuleEditor = !uiState.showRuleEditor;
				break;
			case 'Home':
				handleResetView();
				break;
			case 'Escape':
				showHelp = false;
				uiState.closeAll();
				break;
			case 'F1':
			case 'Slash':
				if (e.shiftKey || e.code === 'F1') {
					e.preventDefault();
					showHelp = !showHelp;
				}
				break;
			case 'BracketLeft':
				simState.brushSize = Math.max(1, simState.brushSize - 1);
				break;
			case 'BracketRight':
				simState.brushSize = Math.min(50, simState.brushSize + 1);
				break;
			case 'Comma':
				simState.speed = Math.max(1, simState.speed - 5);
				break;
			case 'Period':
				simState.speed = Math.min(120, simState.speed + 5);
				break;
		}
	}
</script>

<svelte:head>
	<title>Cellular Automaton</title>
	<meta name="description" content="WebGPU-powered cellular automaton visualizer with customizable rules" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<main 
	class="app" 
	class:light-theme={simState.isLightTheme}
	style="--ui-accent: {accentColor}; --ui-accent-bg: {accentColorBg}; --ui-accent-border: {accentColorBorder};"
>
	<Canvas bind:this={canvas} />

	<Controls
		onclear={handleClear}
		onrandomize={handleRandomize}
		onstep={handleStep}
		onresetview={handleResetView}
		onscreenshot={handleScreenshot}
		onhelp={() => (showHelp = !showHelp)}
		{showHelp}
	/>

	{#if showHelp}
		<HelpOverlay onclose={() => (showHelp = false)} />
	{/if}

	{#if uiState.showRuleEditor}
		<RuleEditor
			onclose={() => (uiState.showRuleEditor = false)}
			onrulechange={handleRuleChange}
		/>
	{/if}

	{#if uiState.showSettings}
		<Settings
			onclose={() => (uiState.showSettings = false)}
			ongridsizechange={handleGridSizeChange}
		/>
	{/if}
</main>

<style>
	.app {
		width: 100%;
		height: 100vh;
		overflow: hidden;
		--ui-bg: rgba(12, 12, 18, 0.7);
		--ui-bg-hover: rgba(20, 20, 30, 0.8);
		--ui-border: rgba(255, 255, 255, 0.08);
		--ui-border-hover: rgba(255, 255, 255, 0.15);
		--ui-text: #888;
		--ui-text-hover: #fff;
		/* --ui-accent, --ui-accent-bg, --ui-accent-border are set via inline style */
	}

	.app.light-theme {
		--ui-bg: rgba(255, 255, 255, 0.85);
		--ui-bg-hover: rgba(240, 240, 245, 0.95);
		--ui-border: rgba(0, 0, 0, 0.1);
		--ui-border-hover: rgba(0, 0, 0, 0.2);
		--ui-text: #555;
		--ui-text-hover: #1a1a1a;
		/* accent colors come from inline style based on selected color */
	}
</style>

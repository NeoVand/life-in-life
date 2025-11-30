<script lang="ts">
	import { onMount } from 'svelte';
	import { initWebGPU, type WebGPUContext, type WebGPUError } from '../webgpu/context.js';
	import { Simulation } from '../webgpu/simulation.js';
	import { getSimulationState, GRID_SCALES, type GridScale } from '../stores/simulation.svelte.js';

	const simState = getSimulationState();

	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let ctx: WebGPUContext | null = null;
	let simulation: Simulation | null = null;
	let error = $state<WebGPUError | null>(null);

	let canvasWidth = $state(0);
	let canvasHeight = $state(0);

	// Mouse state
	let isDrawing = $state(false);
	let isPanning = $state(false);
	let isShiftHeld = $state(false);
	let mouseInCanvas = $state(false);
	let gridMouseX = $state(0);
	let gridMouseY = $state(0);
	let lastMouseX = 0;
	let lastMouseY = 0;

	// Touch state
	let touchMode: 'none' | 'draw' | 'pan' | 'pinch' = 'none';
	let lastTouchX = 0;
	let lastTouchY = 0;
	let lastPinchDistance = 0;
	let touchStartTime = 0;

	// Animation
	let animationId: number | null = null;
	let lastStepTime = 0;

	// Track initial orientation to detect rotation
	let initialOrientation: 'portrait' | 'landscape' | null = null;
	let isRotated = $state(false);


	/**
	 * Calculate grid dimensions from scale and screen aspect ratio
	 * The baseCells value represents the shorter dimension
	 */
	function calculateGridDimensions(scale: GridScale, screenWidth: number, screenHeight: number): { width: number; height: number } {
		const scaleConfig = GRID_SCALES.find(s => s.name === scale) ?? GRID_SCALES[2]; // Default to medium
		const baseCells = scaleConfig.baseCells;
		
		const aspect = screenWidth / screenHeight;
		
		if (aspect >= 1) {
			// Landscape or square: height is the shorter dimension
			const height = baseCells;
			const width = Math.round(baseCells * aspect);
			return { width, height };
		} else {
			// Portrait: width is the shorter dimension
			const width = baseCells;
			const height = Math.round(baseCells / aspect);
			return { width, height };
		}
	}

	onMount(() => {
		initializeWebGPU();

		// Handle resize
		const resizeObserver = new ResizeObserver(handleResize);
		resizeObserver.observe(container);

		// Handle orientation change on mobile - just rotate the canvas
		function handleOrientationChange() {
			if (!initialOrientation) return;
			
			const screenWidth = window.innerWidth;
			const screenHeight = window.innerHeight;
			const currentOrientation = screenWidth >= screenHeight ? 'landscape' : 'portrait';
			
			// Check if orientation flipped from initial
			isRotated = currentOrientation !== initialOrientation;
		}
		
		window.addEventListener('orientationchange', handleOrientationChange);
		// Also listen to resize event as a fallback
		window.addEventListener('resize', handleOrientationChange);

		// Add touch event listeners with { passive: false } to allow preventDefault
		canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
		canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
		canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
		canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener('orientationchange', handleOrientationChange);
			window.removeEventListener('resize', handleOrientationChange);
			if (animationId !== null) {
				cancelAnimationFrame(animationId);
			}
			// Remove touch event listeners
			canvas.removeEventListener('touchstart', handleTouchStart);
			canvas.removeEventListener('touchmove', handleTouchMove);
			canvas.removeEventListener('touchend', handleTouchEnd);
			canvas.removeEventListener('touchcancel', handleTouchEnd);
			simulation?.destroy();
		};
	});

	async function initializeWebGPU() {
		const result = await initWebGPU(canvas);

		if (!result.ok) {
			error = result.error;
			return;
		}

		ctx = result.value;
		
		// Calculate initial grid size based on screen dimensions and scale
		const screenWidth = window.innerWidth;
		const screenHeight = window.innerHeight;
		
		// Remember initial orientation
		initialOrientation = screenWidth >= screenHeight ? 'landscape' : 'portrait';
		
		const { width, height } = calculateGridDimensions(simState.gridScale, screenWidth, screenHeight);
		simState.gridWidth = width;
		simState.gridHeight = height;
		
		simulation = new Simulation(ctx, {
			width,
			height,
			rule: simState.currentRule
		});

		// Initial randomization for visual appeal
		simulation.randomize(0.15);
		
		// Reset view to fit grid (will use canvas dimensions once available)
		// The first render will update canvas dimensions, then we can reset properly
		requestAnimationFrame(() => {
			simulation?.resetView(canvasWidth, canvasHeight);
		});

		// Start animation loop
		animationLoop(performance.now());
	}

	function handleResize(entries: ResizeObserverEntry[]) {
		const entry = entries[0];
		if (!entry) return;

		const { width, height } = entry.contentRect;
		const dpr = window.devicePixelRatio || 1;

		canvasWidth = Math.floor(width * dpr);
		canvasHeight = Math.floor(height * dpr);

		canvas.width = canvasWidth;
		canvas.height = canvasHeight;

		if (ctx) {
			ctx.context.configure({
				device: ctx.device,
				format: ctx.format,
				alphaMode: 'premultiplied'
			});
		}
	}

	function animationLoop(timestamp: number) {
		animationId = requestAnimationFrame(animationLoop);

		if (!simulation || canvasWidth === 0 || canvasHeight === 0) return;

		// Run simulation steps if playing
		if (simState.isPlaying) {
			const stepInterval = 1000 / simState.speed;
			if (timestamp - lastStepTime >= stepInterval) {
				simulation.step();
				simState.incrementGeneration();
				lastStepTime = timestamp;
			}
		}

		// Sync view state including brush preview
		const showBrush = mouseInCanvas && !isShiftHeld && !isPanning;
		simulation.setView({
			showGrid: simState.showGrid,
			isLightTheme: simState.isLightTheme,
			aliveColor: simState.aliveColor,
			brushX: showBrush ? gridMouseX : -1000,
			brushY: showBrush ? gridMouseY : -1000,
			brushRadius: showBrush ? simState.brushSize : -1,
			wrapBoundary: simState.wrapBoundary
		});

		// Always render - swap dimensions if canvas is rotated
		const renderWidth = isRotated ? canvasHeight : canvasWidth;
		const renderHeight = isRotated ? canvasWidth : canvasHeight;
		simulation.render(renderWidth, renderHeight);

		// Update alive cells count (sync version for display)
		simState.aliveCells = simulation.countAliveCells();
	}

	// Track previous playing state to trigger count update when paused
	let wasPlaying = false;
	$effect(() => {
		if (wasPlaying && !simState.isPlaying && simulation) {
			// Just paused - get accurate count from GPU
			simulation.countAliveCellsAsync().then(count => {
				simState.aliveCells = count;
			});
		}
		wasPlaying = simState.isPlaying;
	});

	// Keyboard handlers for shift key
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Shift') {
			isShiftHeld = true;
		}
	}

	function handleKeyUp(e: KeyboardEvent) {
		if (e.key === 'Shift') {
			isShiftHeld = false;
			if (!isPanning) {
				// Reset cursor if not actively panning
			}
		}
	}

	// Mouse event handlers
	function handleMouseDown(e: MouseEvent) {
		if (!simulation) return;

		const rect = canvas.getBoundingClientRect();
		const x = (e.clientX - rect.left) * (canvasWidth / rect.width);
		const y = (e.clientY - rect.top) * (canvasHeight / rect.height);

		lastMouseX = e.clientX;
		lastMouseY = e.clientY;

		// Middle mouse button or shift+left = pan
		if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
			isPanning = true;
			e.preventDefault();
			return;
		}

		// Left click = draw, right click = erase
		if (e.button === 0 || e.button === 2) {
			isDrawing = true;
			const state = e.button === 0 ? simState.brushState : 0;
			const gridPos = simulation.screenToGrid(x, y, canvasWidth, canvasHeight);
			simulation.paintBrush(gridPos.x, gridPos.y, simState.brushSize, state);
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (!simulation) return;

		const rect = canvas.getBoundingClientRect();
		const x = (e.clientX - rect.left) * (canvasWidth / rect.width);
		const y = (e.clientY - rect.top) * (canvasHeight / rect.height);

		// Update grid mouse position for brush preview
		const gridPos = simulation.screenToGrid(x, y, canvasWidth, canvasHeight);
		gridMouseX = gridPos.x;
		gridMouseY = gridPos.y;

		if (isPanning) {
			const deltaX = e.clientX - lastMouseX;
			const deltaY = e.clientY - lastMouseY;
			simulation.pan(deltaX, deltaY, rect.width, rect.height);
			lastMouseX = e.clientX;
			lastMouseY = e.clientY;
			return;
		}

		if (isDrawing) {
			const state = e.buttons === 1 ? simState.brushState : 0;
			simulation.paintBrush(gridPos.x, gridPos.y, simState.brushSize, state);
		}
	}

	function handleMouseUp() {
		if (isDrawing && simulation && !simState.isPlaying) {
			// After painting while paused, update the count
			simulation.countAliveCellsAsync().then(count => {
				simState.aliveCells = count;
			});
		}
		isDrawing = false;
		isPanning = false;
	}

	function handleMouseEnter() {
		mouseInCanvas = true;
	}

	function handleMouseLeave() {
		mouseInCanvas = false;
		isDrawing = false;
		isPanning = false;
	}

	function handleWheel(e: WheelEvent) {
		if (!simulation) return;
		e.preventDefault();

		const rect = canvas.getBoundingClientRect();
		const x = (e.clientX - rect.left) * (canvasWidth / rect.width);
		const y = (e.clientY - rect.top) * (canvasHeight / rect.height);

		// Zoom factor
		const factor = e.deltaY > 0 ? 1.1 : 0.9;
		simulation.zoomAt(x, y, canvasWidth, canvasHeight, factor);
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
	}

	// Touch event handlers
	function getTouchDistance(touches: TouchList): number {
		if (touches.length < 2) return 0;
		const dx = touches[0].clientX - touches[1].clientX;
		const dy = touches[0].clientY - touches[1].clientY;
		return Math.sqrt(dx * dx + dy * dy);
	}

	function getTouchCenter(touches: TouchList): { x: number; y: number } {
		if (touches.length < 2) {
			return { x: touches[0].clientX, y: touches[0].clientY };
		}
		return {
			x: (touches[0].clientX + touches[1].clientX) / 2,
			y: (touches[0].clientY + touches[1].clientY) / 2
		};
	}

	function handleTouchStart(e: TouchEvent) {
		if (!simulation) return;
		e.preventDefault();

		const touches = e.touches;
		touchStartTime = performance.now();

		if (touches.length === 1) {
			// Single touch - start drawing
			touchMode = 'draw';
			const touch = touches[0];
			const rect = canvas.getBoundingClientRect();
			const x = (touch.clientX - rect.left) * (canvasWidth / rect.width);
			const y = (touch.clientY - rect.top) * (canvasHeight / rect.height);
			
			lastTouchX = touch.clientX;
			lastTouchY = touch.clientY;

			const gridPos = simulation.screenToGrid(x, y, canvasWidth, canvasHeight);
			gridMouseX = gridPos.x;
			gridMouseY = gridPos.y;
			simulation.paintBrush(gridPos.x, gridPos.y, simState.brushSize, simState.brushState);
		} else if (touches.length === 2) {
			// Two fingers - start pinch/pan
			touchMode = 'pinch';
			lastPinchDistance = getTouchDistance(touches);
			const center = getTouchCenter(touches);
			lastTouchX = center.x;
			lastTouchY = center.y;
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (!simulation) return;
		e.preventDefault();

		const touches = e.touches;
		const rect = canvas.getBoundingClientRect();

		if (touches.length === 1 && touchMode === 'draw') {
			// Single finger drawing
			const touch = touches[0];
			const x = (touch.clientX - rect.left) * (canvasWidth / rect.width);
			const y = (touch.clientY - rect.top) * (canvasHeight / rect.height);

			const gridPos = simulation.screenToGrid(x, y, canvasWidth, canvasHeight);
			gridMouseX = gridPos.x;
			gridMouseY = gridPos.y;
			simulation.paintBrush(gridPos.x, gridPos.y, simState.brushSize, simState.brushState);
			
			lastTouchX = touch.clientX;
			lastTouchY = touch.clientY;
		} else if (touches.length === 2 && touchMode === 'pinch') {
			// Two finger pinch zoom and pan
			const currentDistance = getTouchDistance(touches);
			const center = getTouchCenter(touches);

			// Zoom
			if (lastPinchDistance > 0) {
				const zoomFactor = lastPinchDistance / currentDistance;
				const screenX = (center.x - rect.left) * (canvasWidth / rect.width);
				const screenY = (center.y - rect.top) * (canvasHeight / rect.height);
				simulation.zoomAt(screenX, screenY, canvasWidth, canvasHeight, zoomFactor);
			}

			// Pan
			const deltaX = center.x - lastTouchX;
			const deltaY = center.y - lastTouchY;
			simulation.pan(deltaX, deltaY, rect.width, rect.height);

			lastPinchDistance = currentDistance;
			lastTouchX = center.x;
			lastTouchY = center.y;
		} else if (touches.length === 1 && touchMode === 'pinch') {
			// Went from 2 fingers to 1 - switch to pan mode
			touchMode = 'pan';
			const touch = touches[0];
			lastTouchX = touch.clientX;
			lastTouchY = touch.clientY;
		} else if (touches.length === 1 && touchMode === 'pan') {
			// Single finger panning (after pinch)
			const touch = touches[0];
			const deltaX = touch.clientX - lastTouchX;
			const deltaY = touch.clientY - lastTouchY;
			simulation.pan(deltaX, deltaY, rect.width, rect.height);
			lastTouchX = touch.clientX;
			lastTouchY = touch.clientY;
		}
	}

	function handleTouchEnd(e: TouchEvent) {
		if (!simulation) return;
		e.preventDefault();

		const touches = e.touches;

		if (touches.length === 0) {
			// All fingers lifted
			if (touchMode === 'draw' && !simState.isPlaying) {
				// After drawing while paused, update the count
				simulation.countAliveCellsAsync().then(count => {
					simState.aliveCells = count;
				});
			}
			touchMode = 'none';
			lastPinchDistance = 0;
		} else if (touches.length === 1 && touchMode === 'pinch') {
			// Went from 2 to 1 finger - continue as pan
			touchMode = 'pan';
			const touch = touches[0];
			lastTouchX = touch.clientX;
			lastTouchY = touch.clientY;
		}
	}

	// Expose simulation methods
	export function clear() {
		if (!simulation) return;
		simulation.clear();
		simState.resetGeneration();
		simState.aliveCells = 0;
	}

	export function randomize(density: number = 0.15) {
		if (!simulation) return;
		simulation.randomize(density);
		simState.resetGeneration();
		// Randomize already sets _aliveCells, but do async count for accuracy
		simulation.countAliveCellsAsync().then(count => {
			simState.aliveCells = count;
		});
	}

	export function initialize(type: string, options?: { density?: number; tiled?: boolean; spacing?: number }) {
		if (!simulation) return;
		
		// Clear first
		simulation.clear();
		simState.resetGeneration();
		
		// Handle random types
		if (type.startsWith('random')) {
			const d = options?.density ?? 0.15;
			simulation.randomize(d);
			return;
		}

		// Define patterns (relative to center)
		const patterns: Record<string, [number, number][]> = {
			// Conway's Life patterns
			'glider': [[0, -1], [1, 0], [-1, 1], [0, 1], [1, 1]],
			'lwss': [[-2, -1], [-2, 1], [-1, -2], [0, -2], [1, -2], [2, -2], [2, -1], [2, 0], [1, 1]],
			'r-pentomino': [[0, -1], [1, -1], [-1, 0], [0, 0], [0, 1]],
			'acorn': [[-3, 0], [-2, 0], [-2, -2], [0, -1], [1, 0], [2, 0], [3, 0]],
			'diehard': [[-3, 0], [-2, 0], [-2, 1], [2, 1], [3, -1], [3, 1], [4, 1]],
			'blinker': [[-1, 0], [0, 0], [1, 0]],
			'toad': [[-1, 0], [0, 0], [1, 0], [0, 1], [1, 1], [2, 1]],
			'beacon': [[-1, -1], [0, -1], [-1, 0], [1, 1], [2, 0], [2, 1]],
			'block': [[0, 0], [1, 0], [0, 1], [1, 1]],
			'beehive': [[-1, 0], [0, -1], [1, -1], [2, 0], [1, 1], [0, 1]],
			'loaf': [[0, -1], [1, -1], [-1, 0], [2, 0], [0, 1], [2, 1], [1, 2]],
			'boat': [[0, 0], [1, 0], [0, 1], [2, 1], [1, 2]],
			'pulsar': [
				[-6, -4], [-6, -3], [-6, -2], [-4, -6], [-3, -6], [-2, -6],
				[-6, 2], [-6, 3], [-6, 4], [-4, 6], [-3, 6], [-2, 6],
				[6, -4], [6, -3], [6, -2], [4, -6], [3, -6], [2, -6],
				[6, 2], [6, 3], [6, 4], [4, 6], [3, 6], [2, 6],
				[-1, -4], [-1, -3], [-1, -2], [1, -4], [1, -3], [1, -2],
				[-1, 2], [-1, 3], [-1, 4], [1, 2], [1, 3], [1, 4],
				[-4, -1], [-3, -1], [-2, -1], [-4, 1], [-3, 1], [-2, 1],
				[4, -1], [3, -1], [2, -1], [4, 1], [3, 1], [2, 1]
			],
			'pentadecathlon': [
				[-4, 0], [-3, -1], [-3, 1], [-2, 0], [-1, 0], [0, 0], [1, 0],
				[2, 0], [3, -1], [3, 1], [4, 0]
			],
			'glider-gun': [
				[-18, 0], [-18, 1], [-17, 0], [-17, 1],
				[-8, 0], [-8, 1], [-8, 2], [-7, -1], [-7, 3], [-6, -2], [-6, 4],
				[-5, -2], [-5, 4], [-4, 1], [-3, -1], [-3, 3], [-2, 0], [-2, 1], [-2, 2],
				[-1, 1],
				[2, -2], [2, -1], [2, 0], [3, -2], [3, -1], [3, 0], [4, -3], [4, 1],
				[6, -4], [6, -3], [6, 1], [6, 2],
				[16, -2], [16, -1], [17, -2], [17, -1]
			],
			// HighLife patterns
			'replicator': [[0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1]],
			// Day & Night patterns
			'dn-glider': [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [1, 2]],
			'dn-blinker': [[-1, 0], [0, 0], [1, 0]],
			'dn-ship': [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
			// Brian's Brain patterns
			'bb-glider': [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2]]
		};

		const pattern = patterns[type];
		if (!pattern) return;

		const gridW = simState.gridWidth;
		const gridH = simState.gridHeight;
		let aliveCells = 0;

		if (options?.tiled && options.spacing) {
			// Tile the pattern across the grid
			// spacing is the actual cell distance on the grid
			const spacing = options.spacing;
			
			for (let ty = Math.floor(spacing / 2); ty < gridH; ty += spacing) {
				for (let tx = Math.floor(spacing / 2); tx < gridW; tx += spacing) {
					for (const [dx, dy] of pattern) {
						const x = tx + dx;
						const y = ty + dy;
						if (x >= 0 && x < gridW && y >= 0 && y < gridH) {
							simulation.setCell(x, y, 1);
							aliveCells++;
						}
					}
				}
			}
		} else {
			// Single pattern in center
			const cx = Math.floor(gridW / 2);
			const cy = Math.floor(gridH / 2);
			for (const [dx, dy] of pattern) {
				const x = cx + dx;
				const y = cy + dy;
				if (x >= 0 && x < gridW && y >= 0 && y < gridH) {
					simulation.setCell(x, y, 1);
					aliveCells++;
				}
			}
		}

		// Update the alive cells count
		simulation.updateAliveCellsCount(aliveCells);
		
		// Also do an async count to ensure accuracy after GPU operations settle
		simulation.countAliveCellsAsync().then(count => {
			simState.aliveCells = count;
		});
	}

	export function stepOnce() {
		if (!simulation) return;
		simulation.step();
		simState.incrementGeneration();
		// Update alive cells count after step
		simulation.countAliveCellsAsync().then(count => {
			simState.aliveCells = count;
		});
	}

	export function resetView() {
		simulation?.resetView(canvasWidth, canvasHeight);
	}

	export function updateRule() {
		simulation?.setRule(simState.currentRule);
	}

	export function getSimulation(): Simulation | null {
		return simulation;
	}

	export function screenshot() {
		if (!canvas) return;
		
		// Create a link and trigger download
		const link = document.createElement('a');
		link.download = `cellular-automaton-gen${simState.generation}.png`;
		link.href = canvas.toDataURL('image/png');
		link.click();
	}

	export function resize(width: number, height: number) {
		if (!ctx || !simulation) return;
		
		// Update store
		simState.gridWidth = width;
		simState.gridHeight = height;
		
		// Recreate simulation with new size
		simulation.destroy();
		simulation = new Simulation(ctx, {
			width,
			height,
			rule: simState.currentRule
		});
		simulation.randomize(0.15);
		simState.resetGeneration();
		
		// Update alive cells count
		simulation.countAliveCellsAsync().then(count => {
			simState.aliveCells = count;
		});
	}
	
	export function setScale(scale: GridScale) {
		if (!ctx || !simulation) return;
		
		// Calculate new dimensions based on current screen size
		const screenWidth = window.innerWidth;
		const screenHeight = window.innerHeight;
		const { width, height } = calculateGridDimensions(scale, screenWidth, screenHeight);
		
		// Update store
		simState.gridScale = scale;
		simState.gridWidth = width;
		simState.gridHeight = height;
		
		// Recreate simulation with new size
		simulation.destroy();
		simulation = new Simulation(ctx, {
			width,
			height,
			rule: simState.currentRule
		});
		simulation.randomize(0.15);
		simState.resetGeneration();
		
		// Reset view to fit the new grid
		simulation.resetView(canvasWidth, canvasHeight);
		
		// Update alive cells count
		simulation.countAliveCellsAsync().then(count => {
			simState.aliveCells = count;
		});
	}
</script>

<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<div class="canvas-container" bind:this={container}>
	{#if error}
		<div class="error">
			<div class="error-icon">⚠️</div>
			<h2>WebGPU Not Available</h2>
			<p>{error.message}</p>
			<p class="hint">
				Try using a recent version of Chrome, Edge, Safari, or Firefox.
			</p>
		</div>
	{/if}
	<canvas
		bind:this={canvas}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
		onwheel={handleWheel}
		oncontextmenu={handleContextMenu}
		class:hidden={!!error}
		class:panning={isPanning}
		class:pan-ready={isShiftHeld && !isPanning}
		class:rotated={isRotated}
	></canvas>
</div>

<style>
	.canvas-container {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: #0d0d12;
	}

	canvas {
		width: 100%;
		height: 100%;
		display: block;
		cursor: crosshair;
		touch-action: none; /* Prevent default touch behaviors */
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
	}

	/* Rotate canvas 90 degrees when device orientation changes from initial */
	canvas.rotated {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 100vh;
		height: 100vw;
		transform: translate(-50%, -50%) rotate(90deg);
	}

	canvas.pan-ready {
		cursor: grab;
	}

	canvas.panning {
		cursor: grabbing;
	}

	canvas.hidden {
		display: none;
	}

	.error {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #e0e0e0;
		text-align: center;
		padding: 2rem;
	}

	.error-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.error h2 {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0 0 1rem;
		color: #ff6b6b;
	}

	.error p {
		margin: 0.5rem 0;
		max-width: 500px;
		line-height: 1.6;
	}

	.error .hint {
		color: #888;
		font-size: 0.9rem;
	}
</style>

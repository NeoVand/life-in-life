/**
 * Simulation State Store
 * Manages reactive state for the cellular automaton
 */

import type { CARule } from '../utils/rules.js';
import { getDefaultRule } from '../utils/rules.js';

// Simulation state
let isPlaying = $state(false);
let speed = $state(10); // Steps per second
let brushSize = $state(3);
let brushState = $state(1); // 1 = draw alive, 0 = erase
let currentRule = $state<CARule>(getDefaultRule());
let generation = $state(0);
let showGrid = $state(true);

// Grid configuration
let gridWidth = $state(1024);
let gridHeight = $state(1024);

// Visual settings
let isLightTheme = $state(false);
let aliveColor = $state<[number, number, number]>([0.2, 0.9, 0.95]); // Cyan default

// Last initialization settings
let lastInitPattern = $state('random-medium');
let lastInitCategory = $state('random');
let lastInitTiling = $state(true);
let lastInitSpacing = $state(50); // Actual cell spacing on main grid

export function getSimulationState() {
	return {
		get isPlaying() {
			return isPlaying;
		},
		set isPlaying(value: boolean) {
			isPlaying = value;
		},

		get speed() {
			return speed;
		},
		set speed(value: number) {
			speed = Math.max(1, Math.min(120, value));
		},

		get brushSize() {
			return brushSize;
		},
		set brushSize(value: number) {
			brushSize = Math.max(1, Math.min(50, value));
		},

		get brushState() {
			return brushState;
		},
		set brushState(value: number) {
			brushState = value;
		},

		get currentRule() {
			return currentRule;
		},
		set currentRule(value: CARule) {
			currentRule = value;
		},

		get generation() {
			return generation;
		},
		set generation(value: number) {
			generation = value;
		},

		get showGrid() {
			return showGrid;
		},
		set showGrid(value: boolean) {
			showGrid = value;
		},

		get gridWidth() {
			return gridWidth;
		},
		set gridWidth(value: number) {
			gridWidth = value;
		},

		get gridHeight() {
			return gridHeight;
		},
		set gridHeight(value: number) {
			gridHeight = value;
		},

		get isLightTheme() {
			return isLightTheme;
		},
		set isLightTheme(value: boolean) {
			isLightTheme = value;
		},

		get aliveColor() {
			return aliveColor;
		},
		set aliveColor(value: [number, number, number]) {
			aliveColor = value;
		},

		get lastInitPattern() {
			return lastInitPattern;
		},
		set lastInitPattern(value: string) {
			lastInitPattern = value;
		},

		get lastInitCategory() {
			return lastInitCategory;
		},
		set lastInitCategory(value: string) {
			lastInitCategory = value;
		},

		get lastInitTiling() {
			return lastInitTiling;
		},
		set lastInitTiling(value: boolean) {
			lastInitTiling = value;
		},

		get lastInitSpacing() {
			return lastInitSpacing;
		},
		set lastInitSpacing(value: number) {
			lastInitSpacing = value;
		},

		// Actions
		togglePlay() {
			isPlaying = !isPlaying;
		},

		play() {
			isPlaying = true;
		},

		pause() {
			isPlaying = false;
		},

		resetGeneration() {
			generation = 0;
		},

		incrementGeneration() {
			generation++;
		}
	};
}

// UI state
let showRuleEditor = $state(false);
let showSettings = $state(false);
let showHelp = $state(false);

export function getUIState() {
	return {
		get showRuleEditor() {
			return showRuleEditor;
		},
		set showRuleEditor(value: boolean) {
			showRuleEditor = value;
			if (value) {
				showSettings = false;
				showHelp = false;
			}
		},

		get showSettings() {
			return showSettings;
		},
		set showSettings(value: boolean) {
			showSettings = value;
			if (value) {
				showRuleEditor = false;
				showHelp = false;
			}
		},

		get showHelp() {
			return showHelp;
		},
		set showHelp(value: boolean) {
			showHelp = value;
			if (value) {
				showRuleEditor = false;
				showSettings = false;
			}
		},

		closeAll() {
			showRuleEditor = false;
			showSettings = false;
			showHelp = false;
		}
	};
}


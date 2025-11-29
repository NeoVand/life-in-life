<script lang="ts">
	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="modal-backdrop" onclick={(e) => e.target === e.currentTarget && onclose()}>
	<div class="modal">
		<div class="header">
			<div class="logo">
				<svg viewBox="0 0 16 16" class="heart-icon">
					<!-- Outer glow / half-alive cells (dimmer shade) -->
					<rect class="heart-dim" x="1" y="2" width="1" height="1"/>
					<rect class="heart-dim" x="5" y="1" width="1" height="1"/>
					<rect class="heart-dim" x="6" y="2" width="1" height="1"/>
					<rect class="heart-dim" x="9" y="2" width="1" height="1"/>
					<rect class="heart-dim" x="10" y="1" width="1" height="1"/>
					<rect class="heart-dim" x="14" y="2" width="1" height="1"/>
					<rect class="heart-dim" x="1" y="5" width="1" height="1"/>
					<rect class="heart-dim" x="14" y="5" width="1" height="1"/>
					<rect class="heart-dim" x="2" y="7" width="1" height="1"/>
					<rect class="heart-dim" x="13" y="7" width="1" height="1"/>
					<rect class="heart-dim" x="3" y="8" width="1" height="1"/>
					<rect class="heart-dim" x="12" y="8" width="1" height="1"/>
					<rect class="heart-dim" x="4" y="9" width="1" height="1"/>
					<rect class="heart-dim" x="11" y="9" width="1" height="1"/>
					<rect class="heart-dim" x="5" y="10" width="1" height="1"/>
					<rect class="heart-dim" x="10" y="10" width="1" height="1"/>
					<rect class="heart-dim" x="6" y="11" width="1" height="1"/>
					<rect class="heart-dim" x="9" y="11" width="1" height="1"/>
					<rect class="heart-dim" x="7" y="12" width="2" height="1"/>
					<!-- Main heart - alive cells (bright) -->
					<rect class="heart-bright" x="2" y="2" width="3" height="1"/>
					<rect class="heart-bright" x="11" y="2" width="3" height="1"/>
					<rect class="heart-bright" x="2" y="3" width="5" height="1"/>
					<rect class="heart-bright" x="9" y="3" width="5" height="1"/>
					<rect class="heart-bright" x="2" y="4" width="12" height="1"/>
					<rect class="heart-bright" x="2" y="5" width="12" height="1"/>
					<rect class="heart-bright" x="3" y="6" width="10" height="1"/>
					<rect class="heart-bright" x="4" y="7" width="8" height="1"/>
					<rect class="heart-bright" x="5" y="8" width="6" height="1"/>
					<rect class="heart-bright" x="6" y="9" width="4" height="1"/>
					<rect class="heart-bright" x="7" y="10" width="2" height="1"/>
				</svg>
				<div class="title-group">
					<span class="title">Games of Life</span>
					<span class="tagline">GPU-powered cellular automaton visualizer</span>
				</div>
			</div>
			<button class="close-btn" onclick={onclose} aria-label="Close">✕</button>
		</div>

		<div class="content">
			<div class="columns">
				<!-- Left column -->
				<div class="column">
					<div class="section">
						<h3>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
							</svg>
							Technology
						</h3>
						<ul>
							<li><strong>WebGPU</strong> — GPU compute shaders</li>
							<li><strong>Svelte 5</strong> — Reactive UI</li>
							<li><strong>SvelteKit</strong> — Static generation</li>
						</ul>
					</div>

					<div class="section">
						<h3>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10"/>
								<path d="M12 6v6l4 2"/>
							</svg>
							Features
						</h3>
						<ul>
							<li>Conway's Life, HighLife, Day & Night...</li>
							<li>Custom rule editor + live preview</li>
							<li>Multi-state cellular automata</li>
							<li>Interactive painting & patterns</li>
						</ul>
					</div>
				</div>

				<!-- Right column -->
				<div class="column">
					<div class="section">
						<h3>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
							</svg>
							Quick Start
						</h3>
						<ul>
							<li><kbd>Space</kbd> Play / Pause</li>
							<li><kbd>Click</kbd> Draw · <kbd>Right-click</kbd> Erase</li>
							<li><kbd>Scroll</kbd> Zoom · <kbd>Shift+Drag</kbd> Pan</li>
							<li><kbd>E</kbd> Rules · <kbd>I</kbd> Initialize</li>
							<li><kbd>[ ]</kbd> Brush size · <kbd>, .</kbd> Speed</li>
						</ul>
					</div>
				</div>
			</div>

			<div class="footer">
				<div class="author">
					by <strong>Neo Mohsenvand</strong>
				</div>
				<a 
					href="https://github.com/NeoVand/games-of-life" 
					target="_blank" 
					rel="noopener noreferrer"
					class="github-link"
				>
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
					</svg>
					GitHub
				</a>
			</div>
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
		background: var(--ui-bg, rgba(12, 12, 18, 0.9));
		backdrop-filter: blur(16px);
		border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.1));
		border-radius: 10px;
		padding: 0.8rem;
		max-width: 480px;
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.6rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--ui-border, rgba(255, 255, 255, 0.08));
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.heart-icon {
		width: 24px;
		height: 24px;
	}

	.heart-icon .heart-bright {
		fill: var(--ui-accent, #2dd4bf);
	}

	.heart-icon .heart-dim {
		fill: var(--ui-accent, #2dd4bf);
		opacity: 0.4;
	}

	.title-group {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.title {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--ui-text-hover, #fff);
		letter-spacing: -0.02em;
	}

	.tagline {
		font-size: 0.55rem;
		color: var(--ui-text, #888);
		font-style: italic;
	}

	.close-btn {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: var(--ui-text, #666);
		font-size: 0.75rem;
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
		gap: 0.5rem;
	}

	.columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.column {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.section {
		background: var(--ui-input-bg, rgba(0, 0, 0, 0.2));
		border-radius: 6px;
		padding: 0.5rem;
	}

	.section h3 {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		margin: 0 0 0.35rem;
		font-size: 0.55rem;
		font-weight: 600;
		color: var(--ui-accent, #2dd4bf);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.section h3 svg {
		width: 10px;
		height: 10px;
	}

	.section ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.section li {
		font-size: 0.55rem;
		color: var(--ui-text-hover, #ccc);
		padding: 0.15rem 0;
		padding-left: 0.6rem;
		position: relative;
		line-height: 1.3;
	}

	.section li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--ui-accent, #2dd4bf);
	}

	.section li strong {
		color: var(--ui-text-hover, #fff);
	}

	kbd {
		display: inline-block;
		padding: 0.05rem 0.2rem;
		background: var(--ui-border, rgba(255, 255, 255, 0.1));
		border: 1px solid var(--ui-border-hover, rgba(255, 255, 255, 0.15));
		border-radius: 2px;
		font-family: 'SF Mono', Monaco, monospace;
		font-size: 0.5rem;
		color: var(--ui-text-hover, #ccc);
	}

	.footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 0.5rem;
		border-top: 1px solid var(--ui-border, rgba(255, 255, 255, 0.08));
	}

	.author {
		font-size: 0.55rem;
		color: var(--ui-text, #888);
	}

	.author strong {
		color: var(--ui-text-hover, #e0e0e0);
	}

	.github-link {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.5rem;
		background: var(--ui-border, rgba(255, 255, 255, 0.08));
		border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.1));
		border-radius: 5px;
		color: var(--ui-text-hover, #e0e0e0);
		font-size: 0.55rem;
		font-weight: 500;
		text-decoration: none;
		transition: all 0.15s;
	}

	.github-link:hover {
		background: var(--ui-accent-bg, rgba(45, 212, 191, 0.15));
		border-color: var(--ui-accent-border, rgba(45, 212, 191, 0.3));
		color: var(--ui-accent, #2dd4bf);
	}

	.github-link svg {
		width: 12px;
		height: 12px;
	}
</style>

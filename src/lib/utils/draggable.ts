/**
 * Draggable utility for making modals moveable
 * Implements a Svelte action for drag-to-move functionality
 */

export interface DraggableOptions {
	/** CSS selector for the drag handle element (defaults to the element itself) */
	handle?: string;
	/** Callback when drag starts */
	onDragStart?: () => void;
	/** Callback when drag ends */
	onDragEnd?: (position: { x: number; y: number }) => void;
	/** Initial position (if restoring from saved state) */
	initialPosition?: { x: number; y: number } | null;
	/** Whether to constrain to viewport bounds */
	bounds?: boolean;
}

export interface DraggableReturn {
	update: (options: DraggableOptions) => void;
	destroy: () => void;
}

/**
 * Svelte action to make an element draggable
 * Usage: <div use:draggable={{ handle: '.header' }}>
 */
export function draggable(node: HTMLElement, options: DraggableOptions = {}): DraggableReturn {
	let handleEl: HTMLElement | null = null;
	let isDragging = false;
	let startX = 0;
	let startY = 0;
	let initialX = 0;
	let initialY = 0;
	let currentX = 0;
	let currentY = 0;
	let hasMoved = false;

	function init() {
		// Find handle element
		if (options.handle) {
			handleEl = node.querySelector(options.handle);
		} else {
			handleEl = node;
		}

		if (!handleEl) {
			console.warn('Draggable: handle element not found');
			return;
		}

		// Style the handle
		handleEl.style.cursor = 'grab';
		handleEl.style.userSelect = 'none';

		// Add event listeners
		handleEl.addEventListener('mousedown', onMouseDown);
		handleEl.addEventListener('touchstart', onTouchStart, { passive: false });

		// Apply initial position if provided
		if (options.initialPosition) {
			currentX = options.initialPosition.x;
			currentY = options.initialPosition.y;
			applyTransform();
		}
	}

	function applyTransform() {
		node.style.transform = `translate(${currentX}px, ${currentY}px)`;
	}

	function constrainToBounds(x: number, y: number): { x: number; y: number } {
		if (!options.bounds) return { x, y };

		const rect = node.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		// Calculate the element's position without transform
		const baseX = rect.left - currentX;
		const baseY = rect.top - currentY;

		// Ensure at least 100px of the modal is visible
		const minVisible = 100;

		const minX = -baseX - rect.width + minVisible;
		const maxX = viewportWidth - baseX - minVisible;
		const minY = -baseY + 10; // Keep at least 10px from top
		const maxY = viewportHeight - baseY - minVisible;

		return {
			x: Math.max(minX, Math.min(maxX, x)),
			y: Math.max(minY, Math.min(maxY, y))
		};
	}

	function onMouseDown(e: MouseEvent) {
		// Only left mouse button
		if (e.button !== 0) return;

		// Don't drag if clicking on interactive elements
		const target = e.target as HTMLElement;
		if (target.closest('button, input, select, textarea, a, [data-no-drag]')) {
			return;
		}

		e.preventDefault();
		startDrag(e.clientX, e.clientY);
		
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
	}

	function onTouchStart(e: TouchEvent) {
		if (e.touches.length !== 1) return;

		const target = e.target as HTMLElement;
		if (target.closest('button, input, select, textarea, a, [data-no-drag]')) {
			return;
		}

		e.preventDefault();
		const touch = e.touches[0];
		startDrag(touch.clientX, touch.clientY);

		document.addEventListener('touchmove', onTouchMove, { passive: false });
		document.addEventListener('touchend', onTouchEnd);
		document.addEventListener('touchcancel', onTouchEnd);
	}

	function startDrag(clientX: number, clientY: number) {
		isDragging = true;
		hasMoved = false;
		startX = clientX;
		startY = clientY;
		initialX = currentX;
		initialY = currentY;

		if (handleEl) {
			handleEl.style.cursor = 'grabbing';
		}

		// Add dragging class for visual feedback
		node.classList.add('dragging');

		options.onDragStart?.();
	}

	function onMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		e.preventDefault();
		updatePosition(e.clientX, e.clientY);
	}

	function onTouchMove(e: TouchEvent) {
		if (!isDragging || e.touches.length !== 1) return;
		e.preventDefault();
		const touch = e.touches[0];
		updatePosition(touch.clientX, touch.clientY);
	}

	function updatePosition(clientX: number, clientY: number) {
		const dx = clientX - startX;
		const dy = clientY - startY;

		// Only consider it "moved" if it moved more than 3px
		if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
			hasMoved = true;
		}

		let newX = initialX + dx;
		let newY = initialY + dy;

		const constrained = constrainToBounds(newX, newY);
		currentX = constrained.x;
		currentY = constrained.y;

		applyTransform();
	}

	function onMouseUp() {
		endDrag();
		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('mouseup', onMouseUp);
	}

	function onTouchEnd() {
		endDrag();
		document.removeEventListener('touchmove', onTouchMove);
		document.removeEventListener('touchend', onTouchEnd);
		document.removeEventListener('touchcancel', onTouchEnd);
	}

	function endDrag() {
		if (!isDragging) return;
		isDragging = false;

		if (handleEl) {
			handleEl.style.cursor = 'grab';
		}

		node.classList.remove('dragging');

		if (hasMoved) {
			options.onDragEnd?.({ x: currentX, y: currentY });
		}
	}

	function destroy() {
		if (handleEl) {
			handleEl.removeEventListener('mousedown', onMouseDown);
			handleEl.removeEventListener('touchstart', onTouchStart);
			handleEl.style.cursor = '';
			handleEl.style.userSelect = '';
		}
		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('mouseup', onMouseUp);
		document.removeEventListener('touchmove', onTouchMove);
		document.removeEventListener('touchend', onTouchEnd);
		document.removeEventListener('touchcancel', onTouchEnd);
	}

	function update(newOptions: DraggableOptions) {
		// Clean up old handle
		if (handleEl) {
			handleEl.removeEventListener('mousedown', onMouseDown);
			handleEl.removeEventListener('touchstart', onTouchStart);
			handleEl.style.cursor = '';
			handleEl.style.userSelect = '';
		}

		options = newOptions;
		init();
	}

	// Initialize
	init();

	return {
		update,
		destroy
	};
}

/**
 * Center a modal in the viewport
 */
export function centerInViewport(element: HTMLElement): { x: number; y: number } {
	const rect = element.getBoundingClientRect();
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;

	return {
		x: (viewportWidth - rect.width) / 2 - rect.left,
		y: (viewportHeight - rect.height) / 2 - rect.top
	};
}


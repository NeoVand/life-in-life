// Cellular Automaton Render Shader
// Visualizes cell states with zoom/pan support

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

struct RenderParams {
    grid_width: f32,
    grid_height: f32,
    canvas_width: f32,
    canvas_height: f32,
    offset_x: f32,       // Pan offset in grid units
    offset_y: f32,
    zoom: f32,           // Zoom level (cells visible across canvas width)
    num_states: f32,     // For color interpolation
    show_grid: f32,      // 1.0 to show grid lines
    is_light_theme: f32, // 1.0 for light theme, 0.0 for dark
    alive_r: f32,        // Alive cell color (RGB)
    alive_g: f32,
    alive_b: f32,
    brush_x: f32,        // Brush center in grid coordinates
    brush_y: f32,
    brush_radius: f32,   // Brush radius in cells
}

@group(0) @binding(0) var<uniform> params: RenderParams;
@group(0) @binding(1) var<storage, read> cell_state: array<u32>;

// Full-screen triangle vertices (oversized triangle that covers entire viewport)
@vertex
fn vertex_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    var output: VertexOutput;
    
    // Generate vertices for a triangle that covers the entire screen
    // Vertex 0: (-1, -1) -> bottom-left
    // Vertex 1: (3, -1)  -> far right (off screen)  
    // Vertex 2: (-1, 3)  -> far top (off screen)
    var pos: vec2<f32>;
    switch (vertex_index) {
        case 0u: { pos = vec2<f32>(-1.0, -1.0); }
        case 1u: { pos = vec2<f32>(3.0, -1.0); }
        case 2u: { pos = vec2<f32>(-1.0, 3.0); }
        default: { pos = vec2<f32>(0.0, 0.0); }
    }
    
    output.position = vec4<f32>(pos, 0.0, 1.0);
    // Convert from NDC (-1 to 1) to UV (0 to 1)
    output.uv = (pos + 1.0) * 0.5;
    // Flip Y for correct orientation
    output.uv.y = 1.0 - output.uv.y;
    
    return output;
}

// Get cell state at grid position (with bounds checking)
fn get_cell_state(grid_x: i32, grid_y: i32) -> u32 {
    if (grid_x < 0 || grid_x >= i32(params.grid_width) || 
        grid_y < 0 || grid_y >= i32(params.grid_height)) {
        return 0u;
    }
    return cell_state[u32(grid_x) + u32(grid_y) * u32(params.grid_width)];
}

// Background color based on theme
fn get_bg_color() -> vec3<f32> {
    if (params.is_light_theme > 0.5) {
        return vec3<f32>(0.95, 0.95, 0.97);
    }
    return vec3<f32>(0.05, 0.05, 0.08);
}

// Grid line color based on theme
fn get_grid_color() -> vec3<f32> {
    if (params.is_light_theme > 0.5) {
        return vec3<f32>(0.85, 0.85, 0.88);
    }
    return vec3<f32>(0.08, 0.08, 0.12);
}

// Convert RGB to HSL
fn rgb_to_hsl(rgb: vec3<f32>) -> vec3<f32> {
    let max_c = max(max(rgb.r, rgb.g), rgb.b);
    let min_c = min(min(rgb.r, rgb.g), rgb.b);
    let l = (max_c + min_c) / 2.0;
    
    if (max_c == min_c) {
        return vec3<f32>(0.0, 0.0, l);
    }
    
    let d = max_c - min_c;
    let s = select(d / (2.0 - max_c - min_c), d / (max_c + min_c), l > 0.5);
    
    var h: f32;
    if (max_c == rgb.r) {
        h = (rgb.g - rgb.b) / d + select(0.0, 6.0, rgb.g < rgb.b);
    } else if (max_c == rgb.g) {
        h = (rgb.b - rgb.r) / d + 2.0;
    } else {
        h = (rgb.r - rgb.g) / d + 4.0;
    }
    h /= 6.0;
    
    return vec3<f32>(h, s, l);
}

// Convert HSL to RGB
fn hsl_to_rgb(hsl: vec3<f32>) -> vec3<f32> {
    if (hsl.y == 0.0) {
        return vec3<f32>(hsl.z, hsl.z, hsl.z);
    }
    
    let q = select(hsl.z + hsl.y - hsl.z * hsl.y, hsl.z * (1.0 + hsl.y), hsl.z < 0.5);
    let p = 2.0 * hsl.z - q;
    
    let r = hue_to_rgb(p, q, hsl.x + 1.0/3.0);
    let g = hue_to_rgb(p, q, hsl.x);
    let b = hue_to_rgb(p, q, hsl.x - 1.0/3.0);
    
    return vec3<f32>(r, g, b);
}

fn hue_to_rgb(p: f32, q: f32, t_in: f32) -> f32 {
    var t = t_in;
    if (t < 0.0) { t += 1.0; }
    if (t > 1.0) { t -= 1.0; }
    if (t < 1.0/6.0) { return p + (q - p) * 6.0 * t; }
    if (t < 1.0/2.0) { return q; }
    if (t < 2.0/3.0) { return p + (q - p) * (2.0/3.0 - t) * 6.0; }
    return p;
}

// Color palette for cell states
fn state_to_color(state: u32, num_states: u32) -> vec3<f32> {
    let alive_color = vec3<f32>(params.alive_r, params.alive_g, params.alive_b);
    let bg = get_bg_color();
    
    if (state == 0u) {
        return bg;
    }
    
    if (num_states == 2u) {
        // Standard 2-state: use alive color
        return alive_color;
    }
    
    // Multi-state (Generations): gradient from alive to dying
    if (state == 1u) {
        return alive_color;
    }
    
    // Dying states - more distinct color progression
    let dying_progress = f32(state - 1u) / f32(num_states - 1u);
    
    // Convert alive color to HSL
    let alive_hsl = rgb_to_hsl(alive_color);
    
    // Shift hue more aggressively through a color wheel segment
    // This creates more visually distinct intermediate states
    var dying_hue = alive_hsl.x + 0.25 * dying_progress; // Quarter hue rotation
    if (dying_hue > 1.0) { dying_hue -= 1.0; }
    
    // Keep saturation high initially, then drop off
    let sat_curve = 1.0 - dying_progress * dying_progress;
    let dying_sat = alive_hsl.y * max(sat_curve, 0.2);
    
    // Lightness: stay visible longer, then fade
    let light_factor = select(
        1.0 - dying_progress * 0.5, // Dark theme: start bright, gradually dim
        mix(alive_hsl.z, 0.35, dying_progress * 0.8), // Light theme: move to gray
        params.is_light_theme > 0.5
    );
    let dying_light = select(
        mix(alive_hsl.z, 0.15, dying_progress * dying_progress),
        light_factor,
        params.is_light_theme > 0.5
    );
    
    let dying_hsl = vec3<f32>(dying_hue, dying_sat, dying_light);
    let dying_rgb = hsl_to_rgb(dying_hsl);
    
    // Only blend with background at the very end
    let bg_blend = dying_progress * dying_progress * dying_progress; // Cubic for late blend
    return mix(dying_rgb, bg, bg_blend * 0.6);
}

// Check if a cell is within the brush radius
fn is_in_brush(cell_x: i32, cell_y: i32) -> bool {
    if (params.brush_radius < 0.0) {
        return false; // Brush preview disabled
    }
    
    // Calculate distance from cell center to brush center
    let dx = f32(cell_x) + 0.5 - params.brush_x;
    let dy = f32(cell_y) + 0.5 - params.brush_y;
    let dist_sq = dx * dx + dy * dy;
    let radius_sq = params.brush_radius * params.brush_radius;
    
    return dist_sq <= radius_sq;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4<f32> {
    // Calculate aspect ratio correction
    let aspect = params.canvas_width / params.canvas_height;
    
    // Convert UV to grid coordinates
    // zoom represents how many cells are visible across the screen width
    let cells_visible_x = params.zoom;
    let cells_visible_y = params.zoom / aspect;
    
    let grid_x = input.uv.x * cells_visible_x + params.offset_x;
    let grid_y = input.uv.y * cells_visible_y + params.offset_y;
    
    // Get integer cell coordinates
    let cell_x = i32(floor(grid_x));
    let cell_y = i32(floor(grid_y));
    
    // Get cell state
    let state = get_cell_state(cell_x, cell_y);
    
    // Base color from state
    var color = state_to_color(state, u32(params.num_states));
    
    // Brush preview highlight
    if (is_in_brush(cell_x, cell_y)) {
        // Highlight color based on theme
        let highlight = select(
            vec3<f32>(0.3, 0.9, 0.85), // Cyan highlight for dark theme
            vec3<f32>(0.1, 0.6, 0.55), // Teal highlight for light theme
            params.is_light_theme > 0.5
        );
        // Semi-transparent overlay
        color = mix(color, highlight, 0.35);
    }
    
    // Add grid lines when enabled and zoomed in enough to see them
    if (params.show_grid > 0.5) {
        let frac_x = fract(grid_x);
        let frac_y = fract(grid_y);
        
        // Grid line thickness scales with zoom - thicker when zoomed in
        // At zoom 1000, lines are very thin; at zoom 50, lines are more visible
        let base_thickness = 0.08;
        let line_thickness = clamp(base_thickness * (200.0 / params.zoom), 0.01, 0.15);
        
        // Only draw lines if cells are large enough to see them (> ~2 pixels per cell)
        let pixels_per_cell = params.canvas_width / params.zoom;
        if (pixels_per_cell > 2.0) {
            if (frac_x < line_thickness || frac_x > (1.0 - line_thickness) ||
                frac_y < line_thickness || frac_y > (1.0 - line_thickness)) {
                // Grid lines - darker overlay
                color = mix(color, get_grid_color(), 0.5);
            }
        }
    }
    
    return vec4<f32>(color, 1.0);
}

---
name: basementuniverse-view-port
description: >
  Use this skill when implementing or working with chunk-based viewport rendering systems in 2D games using @basementuniverse/view-port. Handles visible chunk computation, lazy chunk generation, chunk lifecycle management (update/draw), and FIFO cache eviction. Ideal for tile-based or grid-based world rendering where only visible + buffered chunks need processing.
---

# Basement Universe View Port

Use this skill when working with `@basementuniverse/view-port`.

## When to Use This Skill

Invoke this skill when:
- Implementing chunk-based rendering for 2D game worlds
- Setting up viewport/camera systems that need to manage visible chunks
- Optimizing large world rendering by only processing visible areas
- Creating procedurally generated worlds with lazy chunk generation
- Working with grid-based game systems that need efficient spatial queries
- Debugging chunk visibility, generation, or cache issues

## Key Concepts

**ViewPort** is a lightweight chunk-visibility manager that:
1. Computes visible grid cells from camera bounds
2. Lazily generates missing chunks via a generator function
3. Calls `update()` and `draw()` on visible + border chunks
4. Evicts old chunks using a bounded FIFO cache

**Grid Coordinates**: The library works in grid cells (not world coordinates). Each cell has:
- Grid position: `vec2(x, y)` in cells
- World position: `vec2(x * gridSize.x, y * gridSize.y)` in world units

**Chunk Lifecycle**:
1. Camera moves → ViewPort computes visible grid range
2. Missing chunks generated via `generator(gridPosition)`
3. All visible + border chunks get `update()` called
4. All visible + border chunks get `draw()` called
5. When cache exceeds limit, oldest chunks evicted (FIFO)

## Installation

```bash
npm install @basementuniverse/view-port
```

## Basic Usage Pattern

```ts
import { ViewPort, type ViewPortOptions } from '@basementuniverse/view-port';

// Define your chunk type
class MyChunk {
  private worldPosition: vec2;

  constructor(gridCell: vec2, gridSize: vec2) {
    // Convert grid coordinates to world coordinates
    this.worldPosition = vec2.mul(gridCell, gridSize);
  }

  update(dt: number, screen: vec2, camera: Camera) {
    // Update chunk logic
  }

  draw(context: CanvasRenderingContext2D, screen: vec2, camera: Camera) {
    // Draw chunk content
  }
}

// Create viewport
const viewPort = new ViewPort<MyChunk>({
  gridSize: { x: 150, y: 150 },
  generator: (cell) => new MyChunk(cell, { x: 150, y: 150 }),
  border: 1, // Load 1 chunk beyond visible area
});

// Game loop
function update(dt: number) {
  camera.update(screen);
  viewPort.update(dt, screen, camera);
}

function draw(ctx: CanvasRenderingContext2D) {
  camera.setTransforms(ctx);
  viewPort.draw(ctx, screen, camera);
}
```

## Important Behavior Notes

1. **Grid vs World Coordinates**: The `generator` receives **grid coordinates**, not world coordinates. Convert to world space inside your chunk constructor if needed.

2. **Generation Throttling**: Maximum `maxElementsToGenerate` chunks are created per `update()` call to prevent frame drops when camera moves quickly.

3. **Automatic Cache Sizing**: The cache size (`maxElements`) may auto-grow to fit the current visible area plus buffer plus `bufferAmount`.

4. **Chunk Persistence**: Chunks are persistent objects until evicted from the cache. Store state directly in chunk instances.

5. **Border Area**: The `border` option loads chunks beyond the visible area. Increase this if chunks should be preloaded further out, or if chunks need to interact with neighbors.

6. **Variadic Arguments**: Both `update()` and `draw()` accept `...args` which are forwarded to chunk methods. Use this to pass shared game systems/services.

## Camera Requirements

The viewport requires a camera object with this shape:

```ts
interface Camera {
  position: vec2;
  readonly actualPosition: vec2;
  scale: number;
  readonly actualScale: number;
  bounds: { top: number; bottom: number; left: number; right: number };
}
```

The `bounds` property is used for visibility calculations. See [@basementuniverse/camera](https://www.npmjs.com/package/@basementuniverse/camera) for a compatible camera implementation.

## Debug Visualization

Enable debug overlays to visualize chunks:

```ts
const viewPort = new ViewPort({
  debug: {
    showOrigin: true,        // Show cyan cross at world origin
    showChunkBorders: true,  // Show yellow grid lines
    showChunkLabels: true,   // Show "x, y" labels in each cell
  }
});
```

Or enable all debug features at once:

```ts
const viewPort = new ViewPort({ debug: true });
```

## Performance Tuning

Key options for performance optimization:

- **`maxElementsToGenerate`**: Limit chunks created per frame (default: 10). Increase for faster generation, decrease if chunk creation is expensive.
- **`bufferAmount`**: Extra cache headroom beyond visible area (default: 100). Increase if chunks are being evicted too aggressively.
- **`border`**: Grid cells beyond visible area to load (default: 1). Increase for more preloading, decrease to reduce memory.
- **`spatialHashMaxElements`**: Total cache capacity (default: 1000). Auto-grows if too small.

## Common Patterns

### Passing Shared Systems to Chunks

```ts
viewPort.update(dt, screen, camera, gameWorld, entityManager);
viewPort.draw(ctx, screen, camera, renderer, assetLoader);

// In your chunk:
class MyChunk {
  update(dt: number, screen: vec2, camera: Camera, world: any, entities: any) {
    // Use shared systems
  }
}
```

### Accessing Chunk Count

```ts
console.log(`Active chunks: ${viewPort.countChunks}`);
```

### Getting Visible Chunks Directly

```ts
const visibleChunks = viewPort.getVisibleChunks(camera);
// Returns T[] - useful for custom processing
```

## References

- Public API: [references/api.md](references/api.md)
- Types reference: [references/types.md](references/types.md)
- Usage patterns: [references/usage-patterns.md](references/usage-patterns.md)
- Example code: [references/example.md](references/example.md)

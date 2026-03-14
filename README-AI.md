# @basementuniverse/view-port (AI Reference)

Lightweight chunk-visibility manager for 2D world rendering.

- Computes visible grid cells from camera bounds
- Lazily generates missing chunks
- Calls chunk `update()` and `draw()` for visible+border cells
- Evicts old chunks with a bounded FIFO cache

## Install

`npm install @basementuniverse/view-port`

## Import

```ts
import { ViewPort, type ViewPortOptions } from '@basementuniverse/view-port';
```

## Core API

```ts
class ViewPort<T extends ViewPortChunk> {
	constructor(options?: Partial<ViewPortOptions<T>>)
	get countChunks(): number
	update(dt: number, screen: vec2, camera: Camera, ...args: any[]): void
	draw(context: CanvasRenderingContext2D, screen: vec2, camera: Camera, ...args: any[]): void
}
```

### `ViewPortChunk` contract (generic `T`)

```ts
type ViewPortChunk = {
	update?(dt: number, screen: vec2, camera: Camera, ...args: any[]): void;
	draw?(context: CanvasRenderingContext2D, screen: vec2, camera: Camera, ...args: any[]): void;
};
```

### Required camera shape

```ts
type Camera = {
	position: vec2;
	readonly actualPosition: vec2;
	scale: number;
	readonly actualScale: number;
	bounds: { top: number; bottom: number; left: number; right: number };
};
```

`ViewPort` uses `camera.bounds` for visibility math.

## Options

```ts
type ViewPortOptions<T extends ViewPortChunk = any> = {
	gridSize: vec2;
	generator: (v: vec2) => T;
	border: number;
	bufferAmount: number;
	maxElementsToGenerate: number;
	spatialHashMaxElements: number;
	spatialHashMaxElementsToRemove: number;
	debug?: Partial<{
		showOrigin: boolean;
		showChunkBorders: boolean;
		showChunkLabels: boolean;
	}> | boolean;
};
```

### Defaults

```ts
{
	gridSize: vec2(100, 100),
	generator: () => ({}),
	border: 1,
	bufferAmount: 100,
	maxElementsToGenerate: 10,
	spatialHashMaxElements: 1000,
	spatialHashMaxElementsToRemove: 100
}
```

## Runtime behavior (important)

1. **Visible cell range** is computed from `camera.bounds / gridSize` using floor/ceil.
2. `border` is applied to both min and max grid coordinates.
3. Missing chunks are created via `generator(cell)` where `cell` is **grid coordinates**, not world coordinates.
4. Generation per `update()` is capped by `maxElementsToGenerate`.
5. Chunks are stored in an internal spatial hash + insertion-order array.
6. When cache size exceeds `maxElements`, older chunks are evicted (FIFO), up to `spatialHashMaxElementsToRemove` per insert.
7. `maxElements` may auto-grow at runtime to fit current visible area:
	 - `visibleCells + perimeter + bufferAmount`
8. `draw()` only draws fetched chunks; debug overlays are optional.

## Debug modes

- `debug: true` enables all debug visuals.
- `debug: false`/unset disables all.
- Object form enables specific overlays:
	- `showOrigin` (cross at world origin if in range)
	- `showChunkBorders` (grid lines)
	- `showChunkLabels` (`"x, y"` centered per cell)

## Minimal usage pattern

```ts
const viewPort = new ViewPort<MyChunk>({
	gridSize: { x: 150, y: 150 },
	generator: (cell) => new MyChunk(cell),
});

function update(dt: number) {
	camera.update(screen);
	viewPort.update(dt, screen, camera);
}

function draw(ctx: CanvasRenderingContext2D) {
	camera.setTransforms(ctx);
	viewPort.draw(ctx, screen, camera);
}
```

## Notes for code generation

- Treat chunk instances as persistent objects until evicted.
- Store world position inside chunk at creation time if needed:
	- `world = cell * gridSize`
- Pass shared systems through `...args` on `update()` / `draw()`.
- Use `countChunks` for diagnostics/telemetry.

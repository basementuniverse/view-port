# Types Reference

## Core Types

### ViewPortOptions<T>

```ts
export type ViewPortOptions<T extends ViewPortChunk = any> = {
  gridSize: vec2;
  generator: (v: vec2) => T;
  border: number;
  bufferAmount: number;
  maxElementsToGenerate: number;
  spatialHashMaxElements: number;
  spatialHashMaxElementsToRemove: number;
  debug?: Partial<ViewPortDebugOptions> | boolean;
};
```

Configuration options for the ViewPort class.

#### Properties

**`gridSize: vec2`**
- Size of each grid cell in world units
- Default: `vec2(100, 100)`
- Example: `{ x: 150, y: 150 }` for 150x150 pixel chunks

**`generator: (v: vec2) => T`**
- Function that creates a chunk for a given grid cell coordinate
- Parameter `v` is in **grid coordinates** (not world coordinates)
- Default: `() => ({})` (empty object)
- Example: `(cell) => new MyChunk(cell)`

**`border: number`**
- Number of grid cells beyond visible area to load/update
- Increases the "preload zone" around the viewport
- Default: `1`
- Use cases:
  - `0` = Only visible chunks
  - `1` = One chunk border around visible area
  - `2+` = Larger preload zone for fast-moving cameras

**`bufferAmount: number`**
- Extra cache headroom beyond minimum required chunks
- Prevents aggressive eviction when camera moves slightly
- Default: `100`
- Formula: `cacheSize = visibleChunks + perimeter + bufferAmount`

**`maxElementsToGenerate: number`**
- Maximum chunks to create per `update()` call
- Prevents frame drops when camera moves quickly
- Default: `10`
- Increase if chunk generation is fast
- Decrease if chunk generation is expensive

**`spatialHashMaxElements: number`**
- Initial maximum number of chunks to store in cache
- May auto-grow at runtime to fit visible area
- Default: `1000`
- Set higher if you have large visible areas

**`spatialHashMaxElementsToRemove: number`**
- Maximum chunks to evict per insertion when cache is full
- Default: `100`
- Higher values = more aggressive cleanup
- Lower values = spread eviction over multiple frames

**`debug?: Partial<ViewPortDebugOptions> | boolean`**
- Enable debug visualization
- `true` = Enable all debug options
- `false` or omit = Disable all
- Object = Enable specific options (see ViewPortDebugOptions)

### ViewPortDebugOptions

```ts
type ViewPortDebugOptions = {
  showOrigin: boolean;
  showChunkBorders: boolean;
  showChunkLabels: boolean;
};
```

Debug visualization options.

**`showOrigin: boolean`**
- Shows cyan cross at world origin (0, 0) if visible
- Useful for verifying coordinate systems

**`showChunkBorders: boolean`**
- Draws yellow grid lines showing chunk boundaries
- Helps visualize chunk layout

**`showChunkLabels: boolean`**
- Displays "x, y" labels centered in each chunk
- Shows grid coordinates for each chunk

### ViewPortChunk

```ts
interface ViewPortChunk {
  update?(dt: number, screen: vec2, camera: Camera, ...args: any[]): void;
  draw?(
    context: CanvasRenderingContext2D,
    screen: vec2,
    camera: Camera,
    ...args: any[]
  ): void;
}
```

Interface that chunk objects should implement. Both methods are optional.

**`update()` Method:**
- Called once per frame for visible + border chunks
- Parameters:
  - `dt` - Delta time in seconds
  - `screen` - Screen dimensions
  - `camera` - Camera object
  - `...args` - Additional arguments from viewPort.update()

**`draw()` Method:**
- Called once per frame for visible + border chunks
- Parameters:
  - `context` - Canvas 2D rendering context
  - `screen` - Screen dimensions
  - `camera` - Camera object
  - `...args` - Additional arguments from viewPort.draw()

**Example Implementation:**
```ts
class GameChunk implements ViewPortChunk {
  private worldPosition: vec2;

  constructor(gridCell: vec2, gridSize: vec2) {
    this.worldPosition = vec2.mul(gridCell, gridSize);
  }

  update(dt: number, screen: vec2, camera: Camera) {
    // Update entities in this chunk
  }

  draw(ctx: CanvasRenderingContext2D, screen: vec2, camera: Camera) {
    // Draw chunk contents
    ctx.fillRect(
      this.worldPosition.x,
      this.worldPosition.y,
      gridSize.x,
      gridSize.y
    );
  }
}
```

### Bounds

```ts
export type Bounds = {
  topLeft: vec2;
  bottomRight: vec2;
};
```

Represents axis-aligned bounding box for a chunk.

**Properties:**
- `topLeft` - Top-left corner position in world coordinates
- `bottomRight` - Bottom-right corner position in world coordinates

## Required External Types

### Camera

```ts
interface Camera {
  position: vec2;
  readonly actualPosition: vec2;
  scale: number;
  readonly actualScale: number;
  bounds: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}
```

Simplified camera interface required by ViewPort. The `bounds` property is used for visibility calculations.

**Required Properties:**
- `position` - Camera position in world space
- `actualPosition` - Actual camera position (may differ if interpolated)
- `scale` - Camera zoom level
- `actualScale` - Actual zoom level (may differ if interpolated)
- `bounds` - Screen bounds in world space (critical for visibility)
  - `top` - Top edge in world coordinates
  - `bottom` - Bottom edge in world coordinates
  - `left` - Left edge in world coordinates
  - `right` - Right edge in world coordinates

**Compatible Implementation:**
See [@basementuniverse/camera](https://www.npmjs.com/package/@basementuniverse/camera)

### vec2

```ts
type vec2 = {
  x: number;
  y: number;
}
```

2D vector type from [@basementuniverse/vec](https://www.npmjs.com/package/@basementuniverse/vec).

**Common Operations:**
```ts
import { vec2 } from '@basementuniverse/vec';

const v1 = vec2(10, 20);
const v2 = vec2(5, 5);

vec2.add(v1, v2);  // { x: 15, y: 25 }
vec2.sub(v1, v2);  // { x: 5, y: 15 }
vec2.mul(v1, v2);  // { x: 50, y: 100 }
vec2.div(v1, v2);  // { x: 2, y: 4 }
```

## Internal Types

### SpatialHashElement<T>

```ts
type SpatialHashElement<T> = [vec2, T];
```

Internal tuple type storing grid position and chunk instance.

### SpatialHash<T>

```ts
class SpatialHash<T = any> {
  constructor(maxElements: number, maxElementsToRemove: number);
  get count(): number;
  add(v: vec2, element: T): void;
  remove(v: vec2): void;
  has(v: vec2): boolean;
  get(v: vec2): T | undefined;
  fetch(tl?: vec2, br?: vec2): T[];
}
```

Internal spatial hash data structure. Not exposed in public API.

**Features:**
- Grid-based spatial indexing
- FIFO eviction when full
- Fast rectangular range queries
- String-based coordinate hashing

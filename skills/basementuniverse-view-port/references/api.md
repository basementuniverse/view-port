# API Reference

## ViewPort Class

```ts
class ViewPort<T extends ViewPortChunk>
```

The main viewport manager class. Generic type `T` should extend `ViewPortChunk` interface.

### Constructor

```ts
constructor(options?: Partial<ViewPortOptions<T>>)
```

Creates a new viewport instance.

**Parameters:**
- `options` - Optional configuration object. See [ViewPortOptions](./types.md#viewportoptions) for details.

**Example:**
```ts
const viewPort = new ViewPort<MyChunk>({
  gridSize: vec2(200, 200),
  generator: (cell) => new MyChunk(cell),
  border: 2,
});
```

### Properties

#### `countChunks` (readonly)

```ts
get countChunks(): number
```

Returns the current number of chunks stored in the spatial hash.

**Returns:** Number of active chunks

**Example:**
```ts
console.log(`Active chunks: ${viewPort.countChunks}`);
```

### Methods

#### `update()`

```ts
update(
  dt: number,
  screen: vec2,
  camera: Camera,
  ...args: any[]
): void
```

Update all visible chunks. Should be called once per frame in your game loop.

**Parameters:**
- `dt` - Delta time in seconds since last frame
- `screen` - Screen size as vec2 (width, height)
- `camera` - Camera object with position, scale, and bounds
- `...args` - Additional arguments forwarded to chunk `update()` methods

**Behavior:**
1. Computes visible grid range from camera bounds
2. Generates missing chunks (up to `maxElementsToGenerate` per call)
3. Calls `update()` on all visible + border chunks
4. Auto-adjusts cache size if needed
5. Evicts old chunks if cache exceeds limit

**Example:**
```ts
function gameUpdate(deltaTime: number) {
  camera.update(screen);
  viewPort.update(deltaTime, screen, camera, world, entities);
}
```

#### `draw()`

```ts
draw(
  context: CanvasRenderingContext2D,
  screen: vec2,
  camera: Camera,
  ...args: any[]
): void
```

Draw all visible chunks. Should be called once per frame in your render loop.

**Parameters:**
- `context` - Canvas 2D rendering context
- `screen` - Screen size as vec2 (width, height)
- `camera` - Camera object with position, scale, and bounds
- `...args` - Additional arguments forwarded to chunk `draw()` methods

**Behavior:**
1. Computes visible grid range from camera bounds
2. Calls `draw()` on all visible + border chunks
3. Renders debug overlays if enabled

**Example:**
```ts
function gameRender(ctx: CanvasRenderingContext2D) {
  camera.setTransforms(ctx);
  viewPort.draw(ctx, screen, camera, renderer, assets);
}
```

#### `getVisibleChunks()`

```ts
getVisibleChunks(camera: Camera): T[]
```

Returns an array of currently visible chunks without updating or drawing them.

**Parameters:**
- `camera` - Camera object with bounds

**Returns:** Array of chunk instances (type `T`)

**Use Cases:**
- Custom chunk processing
- Collision detection across visible chunks
- Debug/diagnostic information
- Direct access to chunk data

**Example:**
```ts
const chunks = viewPort.getVisibleChunks(camera);
chunks.forEach(chunk => {
  // Custom processing
  if (chunk.hasImportantThing) {
    handleImportantThing(chunk);
  }
});
```

## Static Members

### Default Options

```ts
private static readonly DEFAULT_OPTIONS: ViewPortOptions = {
  gridSize: vec2(100, 100),
  generator: () => ({}) as ViewPortChunk,
  border: 1,
  bufferAmount: 100,
  maxElementsToGenerate: 10,
  spatialHashMaxElements: 1000,
  spatialHashMaxElementsToRemove: 100,
}
```

### Debug Constants

```ts
private static readonly DEBUG_ORIGIN_COLOUR = 'cyan'
private static readonly DEBUG_ORIGIN_LINE_WIDTH = 2
private static readonly DEBUG_ORIGIN_SIZE = 10

private static readonly DEBUG_CHUNK_BORDER_COLOUR = 'yellow'
private static readonly DEBUG_CHUNK_BORDER_LINE_WIDTH = 2

private static readonly DEBUG_CHUNK_LABEL_COLOUR = 'white'
private static readonly DEBUG_CHUNK_LABEL_FONT = '12px monospace'
```

## Internal Implementation Notes

### Visible Range Calculation

```ts
const topLeft = vec2.sub(
  vec2.map(
    vec2.div(vec2(bounds.left, bounds.top), gridSize),
    Math.floor
  ),
  border
);

const bottomRight = vec2.add(
  vec2.map(
    vec2.div(vec2(bounds.right, bounds.bottom), gridSize),
    Math.ceil
  ),
  border
);
```

Camera bounds are divided by grid size and floored/ceiled to get integer grid coordinates. Border is then subtracted/added to extend the range.

### Auto-Growing Cache

```ts
const size = vec2.sub(bottomRight, topLeft);
const perimeter = 2 * size.x + 2 * size.y;
const visibleGridCells = size.x * size.y + perimeter + bufferAmount;

if (spatialHash.maxElements < visibleGridCells) {
  spatialHash.maxElements = visibleGridCells;
}
```

Cache automatically grows to accommodate visible area + perimeter + buffer amount.

### Generation Throttling

```ts
let i = 0;
for (let x = topLeft.x; x < bottomRight.x; x++) {
  for (let y = topLeft.y; y < bottomRight.y; y++) {
    if (!spatialHash.has(vec2(x, y))) {
      spatialHash.add(vec2(x, y), generator(vec2(x, y)));
      if (i++ > maxElementsToGenerate) {
        return; // Stop generating
      }
    }
  }
}
```

Generation stops after `maxElementsToGenerate` chunks to prevent frame drops.

### FIFO Eviction

```ts
while (elements.length > maxElements && i++ < maxElementsToRemove) {
  const [oldV] = elements.shift()!;
  grid.delete(hashVec(oldV));
}
```

When cache exceeds limit, oldest chunks are removed from the front of the queue (FIFO), up to `maxElementsToRemove` per insertion.

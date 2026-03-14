# view-port

A viewport into worldspace, for rendering chunks in games.

If you're rendering tile-based worlds, the `@basementuniverse/tile-map` package is a better choice since it contains tile-map specific functionality.

This package is more general-purpose; it provides a `ViewPort` class which calculates which chunks are visible, generates new chunks if necessary, and updates/draws them.

## Installation

```bash
npm install @basementuniverse/view-port
```

## How to use

See the [example](./example/example.html) for a complete example of how to use the `ViewPort` class.

Create a viewport:

```js
const viewPort = new ViewPort(options);
```

Update it every frame:

```js
function update(deltaTime) {
  viewPort.update(deltaTime, screenSize, camera);
}
```

Draw it every frame:

```js
function draw(context) {
  viewPort.draw(context, screenSize, camera);
}
```

## Options

```ts
export type ViewPortOptions<T extends ViewPortChunk = any> = {
  /**
   * The size of each grid cell in world units.
   *
   * Default is (100, 100)
   */
  gridSize: vec2;

  /**
   * A function that generates a chunk for a given grid cell coordinate.
   *
   * Default is a function that returns an empty object.
   *
   * `v` is in grid-cell coordinates.
   */
  generator: (v: vec2) => T;

  /**
   * Buffer area around the viewport in grid cells. Chunks within this area
   * will also be generated and updated.
   */
  border: number;

  /**
   * The number of chunks to store in the spatial hash buffer before old chunks
   * are removed. This should be at least the number of chunks that can be
   * visible at once, plus the buffer area.
   */
  bufferAmount: number;

  /**
   * The maximum number of chunks to generate per update. This is to prevent
   * performance issues when the camera moves quickly and many chunks need to
   * be generated at once.
   */
  maxElementsToGenerate: number;

  /**
   * The maximum number of elements to store in the spatial hash.
   */
  spatialHashMaxElements: number;

  /**
   * The maximum number of elements to remove from the spatial hash when it
   * exceeds the maximum number of elements.
   */
  spatialHashMaxElementsToRemove: number;

  /**
   * Optional debug options
   *
   * Can be a boolean value (in which case all sub-options will be set to the
   * same value), or an object allowing specific debug options to be enabled
   * individually
   */
  debug?: Partial<ViewPortDebugOptions> | boolean;
};
```

# Complete Working Example

This is a complete working example from the library's example folder, demonstrating basic usage of ViewPort with keyboard-controlled camera movement.

## HTML Example

```html
<!DOCTYPE html>
<html>
<head>
<style>
body {
  background-color: #333;
}

canvas {
  width: 800px;
  height: 800px;
  background-color: #222;
  border: 3px black solid;
  border-radius: 5px;
  margin: 20px;
}
</style>
</head>
<body>
<canvas></canvas>
<script src="../build/index.js"></script>
<script src="./camera.js"></script>
<script>

const SCREEN = { x: 800, y: 800 };

const COLOURS = [
  '#ff000033',
  '#00ff0033',
  '#ffff0033',
  '#ff880033',
  '#0000ff33',
  '#88008833',
  '#ff008833',
  '#0088ff33',
];

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 800;

const Camera = window.default;

let viewPort = null;
let camera = null;

// Keyboard controls for camera movement
window.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowUp':
      camera.position.y -= 10;
      break;
    case 'ArrowDown':
      camera.position.y += 10;
      break;
    case 'ArrowLeft':
      camera.position.x -= 10;
      break;
    case 'ArrowRight':
      camera.position.x += 10;
      break;
    case '[':
      camera.scale += 0.1;
      break;
    case ']':
      camera.scale -= 0.1;
      break;
  }
});

// Define a simple chunk class
class Chunk {
  constructor(position, color) {
    this.position = position;
    this.color = color;
  }

  update() {}

  draw(context) {
    context.fillStyle = this.color;
    context.fillRect(this.position.x, this.position.y, 150, 150);
  }
}

// Initialize camera and viewport
function init() {
  camera = new Camera({ x: 0, y: 0 });

  viewPort = new ViewPort({
    gridSize: { x: 150, y: 150 },
    generator: position => new Chunk(
      // Convert grid coordinates to world coordinates
      { x: position.x * 150, y: position.y * 150 },
      COLOURS[Math.floor(Math.random() * COLOURS.length)]
    ),
    spatialHashMaxElements: 200,
    debug: true, // Show debug overlays
  });
}

// Update game state
function update() {
  camera.update(SCREEN);
  viewPort.update(1 / 60, SCREEN, camera);
}

// Render game
function draw() {
  context.clearRect(0, 0, 800, 800);
  context.save();

  // Apply camera transforms
  camera.setTransforms(context);

  // Draw viewport (chunks)
  viewPort.draw(context, SCREEN, camera);

  context.restore();

  // Draw UI overlay (chunk count)
  context.fillStyle = 'white';
  context.font = '20px sans-serif';
  context.fillText(`Chunks: ${viewPort.countChunks}`, 10, 30);
}

// Main game loop
function loop() {
  update();
  draw();
  window.requestAnimationFrame(loop);
}

init();
loop();

</script>
</body>
</html>
```

## TypeScript Version

```ts
import { ViewPort, ViewPortOptions } from '@basementuniverse/view-port';
import { vec2 } from '@basementuniverse/vec';
import Camera from '@basementuniverse/camera';

const SCREEN = vec2(800, 800);

const COLOURS = [
  '#ff000033',
  '#00ff0033',
  '#ffff0033',
  '#ff880033',
  '#0000ff33',
  '#88008833',
  '#ff008833',
  '#0088ff33',
];

// Define chunk class implementing ViewPortChunk
class Chunk {
  private position: vec2;
  private color: string;

  constructor(position: vec2, color: string) {
    this.position = position;
    this.color = color;
  }

  update(dt: number, screen: vec2, camera: Camera): void {
    // Update logic here
  }

  draw(
    context: CanvasRenderingContext2D,
    screen: vec2,
    camera: Camera
  ): void {
    context.fillStyle = this.color;
    context.fillRect(this.position.x, this.position.y, 150, 150);
  }
}

// Setup
const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const context = canvas.getContext('2d')!;

canvas.width = 800;
canvas.height = 800;

const camera = new Camera(vec2(0, 0));

const viewPort = new ViewPort<Chunk>({
  gridSize: vec2(150, 150),
  generator: (gridPosition: vec2) => {
    // Convert grid coordinates to world coordinates
    const worldPosition = vec2.mul(gridPosition, 150);
    const color = COLOURS[Math.floor(Math.random() * COLOURS.length)];
    return new Chunk(worldPosition, color);
  },
  spatialHashMaxElements: 200,
  debug: true,
});

// Keyboard controls
window.addEventListener('keydown', (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowUp':
      camera.position = vec2.sub(camera.position, vec2(0, 10));
      break;
    case 'ArrowDown':
      camera.position = vec2.add(camera.position, vec2(0, 10));
      break;
    case 'ArrowLeft':
      camera.position = vec2.sub(camera.position, vec2(10, 0));
      break;
    case 'ArrowRight':
      camera.position = vec2.add(camera.position, vec2(10, 0));
      break;
    case '[':
      camera.scale += 0.1;
      break;
    case ']':
      camera.scale -= 0.1;
      break;
  }
});

// Game loop
function update(): void {
  camera.update(SCREEN);
  viewPort.update(1 / 60, SCREEN, camera);
}

function draw(): void {
  context.clearRect(0, 0, 800, 800);
  context.save();

  camera.setTransforms(context);
  viewPort.draw(context, SCREEN, camera);

  context.restore();

  // UI overlay
  context.fillStyle = 'white';
  context.font = '20px sans-serif';
  context.fillText(`Chunks: ${viewPort.countChunks}`, 10, 30);
}

function loop(): void {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
```

## Key Points from the Example

1. **Grid to World Conversion**: The generator receives grid coordinates and must convert them to world coordinates by multiplying by grid size:
   ```ts
   const worldPosition = vec2.mul(gridPosition, gridSize);
   ```

2. **Camera Integration**: The example uses `@basementuniverse/camera` which provides the required camera interface.

3. **Simple Chunk Class**: Chunks only need `draw()` and optionally `update()` methods. Both are optional.

4. **Debug Mode**: Enables visual overlays showing chunk boundaries, labels, and world origin.

5. **Transform Management**: Camera transforms are applied before drawing the viewport, then restored for UI rendering.

6. **Chunk Count**: Use `viewPort.countChunks` to monitor cache usage and performance.

## Controls

- **Arrow Keys**: Move camera up/down/left/right
- **[ Key**: Zoom in (increase scale)
- **] Key**: Zoom out (decrease scale)

## Visual Feedback

With `debug: true`, you'll see:
- Yellow grid lines showing chunk boundaries
- Coordinate labels in each chunk
- Cyan cross at world origin (0, 0)
- Randomly colored semi-transparent chunks

## Performance Notes

This example:
- Uses 150x150 pixel chunks
- Limits cache to 200 chunks
- Generates colored squares (very cheap generation)
- Runs at 60 FPS with smooth camera movement

For production use:
- Increase `maxElementsToGenerate` if chunks are cheap to create
- Increase `bufferAmount` and `spatialHashMaxElements` for larger worlds
- Increase `border` if you want more aggressive preloading
- Disable debug mode for better performance

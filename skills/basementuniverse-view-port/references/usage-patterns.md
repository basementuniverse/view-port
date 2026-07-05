# Usage Patterns

## Basic Setup Pattern

### Minimal Implementation

```ts
import { ViewPort } from '@basementuniverse/view-port';
import { vec2 } from '@basementuniverse/vec';

class SimpleChunk {
  constructor(gridCell: vec2) {
    this.gridPosition = gridCell;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw something
  }
}

const viewPort = new ViewPort<SimpleChunk>({
  gridSize: vec2(100, 100),
  generator: (cell) => new SimpleChunk(cell),
});

// Game loop
function update(dt: number) {
  viewPort.update(dt, screen, camera);
}

function draw(ctx: CanvasRenderingContext2D) {
  viewPort.draw(ctx, screen, camera);
}
```

## Chunk Initialization Pattern

### Converting Grid to World Coordinates

```ts
class WorldChunk {
  private worldPosition: vec2;
  private gridPosition: vec2;

  constructor(gridCell: vec2, gridSize: vec2) {
    this.gridPosition = gridCell;
    // Convert grid coordinates to world coordinates
    this.worldPosition = vec2.mul(gridCell, gridSize);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillRect(
      this.worldPosition.x,
      this.worldPosition.y,
      150, // width
      150  // height
    );
  }
}

const viewPort = new ViewPort<WorldChunk>({
  gridSize: vec2(150, 150),
  generator: (cell) => new WorldChunk(cell, vec2(150, 150)),
});
```

### Procedural Generation

```ts
class ProceduralChunk {
  private terrain: number[][];

  constructor(gridCell: vec2, seed: number) {
    // Generate terrain based on grid position and seed
    this.terrain = this.generateTerrain(gridCell, seed);
  }

  private generateTerrain(cell: vec2, seed: number): number[][] {
    // Use cell coordinates as input to noise function
    const terrain = [];
    for (let y = 0; y < 10; y++) {
      terrain[y] = [];
      for (let x = 0; x < 10; x++) {
        const worldX = cell.x * 10 + x;
        const worldY = cell.y * 10 + y;
        terrain[y][x] = noise(worldX, worldY, seed);
      }
    }
    return terrain;
  }
}

const seed = Math.random() * 10000;
const viewPort = new ViewPort<ProceduralChunk>({
  generator: (cell) => new ProceduralChunk(cell, seed),
});
```

## Shared Systems Pattern

### Passing Game Systems to Chunks

```ts
interface GameSystems {
  entityManager: EntityManager;
  assetLoader: AssetLoader;
  physics: PhysicsEngine;
}

class SystemAwareChunk {
  private entities: Entity[] = [];

  update(
    dt: number,
    screen: vec2,
    camera: Camera,
    systems: GameSystems
  ) {
    // Update entities using shared systems
    this.entities.forEach(entity => {
      systems.entityManager.update(entity, dt);
      systems.physics.applyForces(entity, dt);
    });
  }

  draw(
    ctx: CanvasRenderingContext2D,
    screen: vec2,
    camera: Camera,
    systems: GameSystems
  ) {
    // Draw using asset loader
    this.entities.forEach(entity => {
      const sprite = systems.assetLoader.get(entity.spriteId);
      ctx.drawImage(sprite, entity.position.x, entity.position.y);
    });
  }
}

// Usage in game loop
function update(dt: number) {
  viewPort.update(dt, screen, camera, gameSystems);
}

function draw(ctx: CanvasRenderingContext2D) {
  viewPort.draw(ctx, screen, camera, gameSystems);
}
```

## Performance Optimization Patterns

### Tuning for Large Worlds

```ts
const viewPort = new ViewPort({
  gridSize: vec2(200, 200), // Larger chunks = fewer chunks
  border: 2, // Preload 2 chunks beyond visible area
  maxElementsToGenerate: 20, // Generate up to 20 chunks per frame
  bufferAmount: 200, // Large buffer to prevent eviction
  spatialHashMaxElements: 2000, // High cache capacity
});
```

### Tuning for Slow Chunk Generation

```ts
const viewPort = new ViewPort({
  gridSize: vec2(100, 100),
  border: 3, // Larger preload zone
  maxElementsToGenerate: 2, // Only 2 per frame (expensive generation)
  bufferAmount: 150,
});
```

### Tuning for Fast Camera Movement

```ts
const viewPort = new ViewPort({
  border: 4, // Large preload zone
  maxElementsToGenerate: 50, // Generate many chunks quickly
  bufferAmount: 300, // Keep more chunks cached
});
```

## Debug Visualization Patterns

### Development Mode

```ts
const isDevelopment = process.env.NODE_ENV === 'development';

const viewPort = new ViewPort({
  debug: isDevelopment ? {
    showOrigin: true,
    showChunkBorders: true,
    showChunkLabels: true,
  } : false,
});
```

### Selective Debug Options

```ts
const viewPort = new ViewPort({
  debug: {
    showChunkBorders: true,  // Show grid
    showChunkLabels: false,  // Labels clutter the view
    showOrigin: false,       // Don't need origin marker
  },
});
```

## Chunk State Management Patterns

### Stateful Chunks with Lifecycle

```ts
class StatefulChunk {
  private isInitialized = false;
  private lastUpdateTime = 0;

  update(dt: number, screen: vec2, camera: Camera) {
    // Lazy initialization on first update
    if (!this.isInitialized) {
      this.initialize();
      this.isInitialized = true;
    }

    this.lastUpdateTime += dt;

    // Periodic updates
    if (this.lastUpdateTime > 1.0) {
      this.periodicUpdate();
      this.lastUpdateTime = 0;
    }
  }

  private initialize() {
    // Heavy initialization that should only happen once
  }

  private periodicUpdate() {
    // Updates that don't need to happen every frame
  }
}
```

### Neighbor-Aware Chunks

```ts
class NeighborAwareChunk {
  private gridPosition: vec2;

  constructor(gridCell: vec2) {
    this.gridPosition = gridCell;
  }

  update(dt: number, screen: vec2, camera: Camera, viewPort: ViewPort) {
    // Get neighboring chunks
    const neighbors = {
      north: this.getNeighbor(viewPort, vec2(0, -1)),
      south: this.getNeighbor(viewPort, vec2(0, 1)),
      east: this.getNeighbor(viewPort, vec2(1, 0)),
      west: this.getNeighbor(viewPort, vec2(-1, 0)),
    };

    // Interact with neighbors
    if (neighbors.north) {
      // Do something with north neighbor
    }
  }

  private getNeighbor(viewPort: ViewPort, offset: vec2) {
    const neighborPos = vec2.add(this.gridPosition, offset);
    return viewPort.getVisibleChunks(camera).find(
      chunk => vec2.eq(chunk.gridPosition, neighborPos)
    );
  }
}
```

## Entity Management Patterns

### Chunk-Local Entities

```ts
class EntityChunk {
  private entities: Entity[] = [];
  private worldBounds: Bounds;

  constructor(gridCell: vec2, gridSize: vec2) {
    const worldPos = vec2.mul(gridCell, gridSize);
    this.worldBounds = {
      topLeft: worldPos,
      bottomRight: vec2.add(worldPos, gridSize),
    };
  }

  addEntity(entity: Entity) {
    // Only add if entity is within chunk bounds
    if (this.contains(entity.position)) {
      this.entities.push(entity);
    }
  }

  update(dt: number) {
    // Update entities and remove those that left the chunk
    this.entities = this.entities.filter(entity => {
      entity.update(dt);
      return this.contains(entity.position);
    });
  }

  private contains(position: vec2): boolean {
    return (
      position.x >= this.worldBounds.topLeft.x &&
      position.y >= this.worldBounds.topLeft.y &&
      position.x < this.worldBounds.bottomRight.x &&
      position.y < this.worldBounds.bottomRight.y
    );
  }
}
```

## Collision Detection Pattern

### Query Visible Chunks for Collisions

```ts
function checkCollisions(player: Entity, camera: Camera, viewPort: ViewPort) {
  const visibleChunks = viewPort.getVisibleChunks(camera);

  for (const chunk of visibleChunks) {
    const entities = chunk.getEntities();

    for (const entity of entities) {
      if (entity !== player && intersects(player, entity)) {
        handleCollision(player, entity);
      }
    }
  }
}
```

## Save/Load Pattern

### Persistent Chunk Data

```ts
class PersistentChunk {
  private data: ChunkData;
  private isDirty = false;

  constructor(gridCell: vec2, savedData?: ChunkData) {
    if (savedData) {
      this.data = savedData;
    } else {
      this.data = this.generateNew(gridCell);
    }
  }

  update(dt: number) {
    // Mark dirty when modified
    if (this.hasChanges()) {
      this.isDirty = true;
    }
  }

  serialize(): ChunkData {
    this.isDirty = false;
    return this.data;
  }

  private hasChanges(): boolean {
    // Check if chunk has been modified
    return false;
  }

  private generateNew(gridCell: vec2): ChunkData {
    // Generate fresh chunk data
    return {};
  }
}

// Usage with save system
function saveWorld(viewPort: ViewPort) {
  const chunks = viewPort.getVisibleChunks(camera);
  const saveData = chunks
    .filter(chunk => chunk.isDirty)
    .map(chunk => ({
      position: chunk.gridPosition,
      data: chunk.serialize(),
    }));

  saveToStorage(saveData);
}
```

## Custom Draw Order Pattern

### Layered Rendering

```ts
class LayeredChunk {
  draw(ctx: CanvasRenderingContext2D, screen: vec2, camera: Camera) {
    // Draw in layers
    this.drawTerrain(ctx);
    this.drawObjects(ctx);
    this.drawOverlay(ctx);
  }

  private drawTerrain(ctx: CanvasRenderingContext2D) {
    // Bottom layer
  }

  private drawObjects(ctx: CanvasRenderingContext2D) {
    // Middle layer
  }

  private drawOverlay(ctx: CanvasRenderingContext2D) {
    // Top layer
  }
}
```

### Separate Draw Passes

```ts
// Don't use ViewPort.draw() directly, do custom passes
function customDraw(ctx: CanvasRenderingContext2D) {
  const chunks = viewPort.getVisibleChunks(camera);

  // First pass: terrain
  chunks.forEach(chunk => chunk.drawTerrain(ctx));

  // Second pass: entities
  chunks.forEach(chunk => chunk.drawEntities(ctx));

  // Third pass: effects
  chunks.forEach(chunk => chunk.drawEffects(ctx));
}
```

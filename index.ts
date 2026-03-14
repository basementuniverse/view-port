import { vec2 } from '@basementuniverse/vec';

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

type ViewPortDebugOptions = {
  showOrigin: boolean;
  showChunkBorders: boolean;
  showChunkLabels: boolean;
};

interface ViewPortChunk {
  update?(dt: number, screen: vec2, camera: Camera, ...args: any[]): void;
  draw?(
    context: CanvasRenderingContext2D,
    screen: vec2,
    camera: Camera,
    ...args: any[]
  ): void;
}

type SpatialHashElement<T> = [vec2, T];

export type Bounds = {
  /**
   * The top-left corner of a chunk
   */
  topLeft: vec2;

  /**
   * The bottom-right corner of a chunk
   */
  bottomRight: vec2;
};

/**
 * Simplified interface for the camera component
 *
 * @see https://www.npmjs.com/package/@basementuniverse/camera
 */
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

function hashVec(v: vec2): string {
  return vec2.str(v);
}

function drawLine(
  context: CanvasRenderingContext2D,
  start: vec2,
  end: vec2,
  colour: string,
  lineWidth: number
) {
  context.save();

  context.lineWidth = lineWidth;
  context.strokeStyle = colour;

  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();

  context.restore();
}

function drawCross(
  context: CanvasRenderingContext2D,
  position: vec2,
  colour: string,
  lineWidth: number,
  size: number
) {
  context.save();

  context.lineWidth = lineWidth;

  const halfSize = Math.ceil(size / 2);
  context.strokeStyle = colour;
  context.beginPath();
  context.moveTo(position.x - halfSize, position.y - halfSize);
  context.lineTo(position.x + halfSize, position.y + halfSize);
  context.moveTo(position.x - halfSize, position.y + halfSize);
  context.lineTo(position.x + halfSize, position.y - halfSize);
  context.stroke();

  context.restore();
}

function pointInRectangle(
  point: vec2,
  topLeft: vec2,
  bottomRight: vec2
): boolean {
  return (
    point.x >= topLeft.x &&
    point.y >= topLeft.y &&
    point.x < bottomRight.x &&
    point.y < bottomRight.y
  );
}

export class ViewPort<T extends ViewPortChunk> {
  private static readonly DEFAULT_OPTIONS: ViewPortOptions = {
    gridSize: vec2(100, 100),
    generator: () => ({}) as ViewPortChunk,
    border: 1,
    bufferAmount: 100,
    maxElementsToGenerate: 10,
    spatialHashMaxElements: 1000,
    spatialHashMaxElementsToRemove: 100,
  };

  private static readonly DEBUG_ORIGIN_COLOUR = 'cyan';
  private static readonly DEBUG_ORIGIN_LINE_WIDTH = 2;
  private static readonly DEBUG_ORIGIN_SIZE = 10;

  private static readonly DEBUG_CHUNK_BORDER_COLOUR = 'yellow';
  private static readonly DEBUG_CHUNK_BORDER_LINE_WIDTH = 2;

  private static readonly DEBUG_CHUNK_LABEL_COLOUR = 'white';
  private static readonly DEBUG_CHUNK_LABEL_FONT = '12px monospace';

  private options: ViewPortOptions<T> & {
    debug: Required<ViewPortDebugOptions>;
  };

  private spatialHash: SpatialHash<T>;

  public constructor(options?: Partial<ViewPortOptions<T>>) {
    const actualOptions = Object.assign(
      {},
      ViewPort.DEFAULT_OPTIONS,
      options ?? {}
    );

    if (!actualOptions.debug || actualOptions.debug === true) {
      actualOptions.debug = {
        showOrigin: !!actualOptions.debug,
        showChunkBorders: !!actualOptions.debug,
        showChunkLabels: !!actualOptions.debug,
      };
    }

    this.options = actualOptions as typeof this.options;

    this.spatialHash = new SpatialHash(
      this.options.spatialHashMaxElements,
      this.options.spatialHashMaxElementsToRemove
    );
  }

  public get countChunks(): number {
    return this.spatialHash.count;
  }

  public update(dt: number, screen: vec2, camera: Camera, ...args: any[]) {
    const bounds = camera.bounds;
    const topLeft = vec2.sub(
      vec2.map(
        vec2.div(vec2(bounds.left, bounds.top), this.options.gridSize),
        Math.floor
      ),
      this.options.border
    );
    const bottomRight = vec2.add(
      vec2.map(
        vec2.div(vec2(bounds.right, bounds.bottom), this.options.gridSize),
        Math.ceil
      ),
      this.options.border
    );
    const size = vec2.sub(bottomRight, topLeft);
    const perimeter = 2 * size.x + 2 * size.y;
    const visibleGridCells =
      size.x * size.y + perimeter + this.options.bufferAmount;
    if (this.spatialHash.maxElements < visibleGridCells) {
      this.spatialHash.maxElements = visibleGridCells;
    }

    this.addChunks(topLeft, bottomRight);

    this.spatialHash.fetch(topLeft, bottomRight).forEach(chunk => {
      chunk.update?.(dt, screen, camera, ...args);
    });
  }

  private addChunks(topLeft: vec2, bottomRight: vec2) {
    let i = 0;
    for (let x = topLeft.x; x < bottomRight.x; x++) {
      for (let y = topLeft.y; y < bottomRight.y; y++) {
        const v = vec2(x, y);
        if (!this.spatialHash.has(v)) {
          this.spatialHash.add(v, this.options.generator(v));

          if (i++ > this.options.maxElementsToGenerate) {
            return;
          }
        }
      }
    }
  }

  public draw(
    context: CanvasRenderingContext2D,
    screen: vec2,
    camera: Camera,
    ...args: any[]
  ) {
    const bounds = camera.bounds;
    const topLeft = vec2.sub(
      vec2.map(
        vec2.div(vec2(bounds.left, bounds.top), this.options.gridSize),
        Math.floor
      ),
      this.options.border
    );
    const bottomRight = vec2.add(
      vec2.map(
        vec2.div(vec2(bounds.right, bounds.bottom), this.options.gridSize),
        Math.ceil
      ),
      this.options.border
    );
    this.spatialHash.fetch(topLeft, bottomRight).forEach(chunk => {
      chunk.draw?.(context, screen, camera, ...args);
    });

    // Render debug helpers
    if (this.options.debug.showChunkBorders) {
      for (let y = topLeft.y; y < bottomRight.y; y++) {
        drawLine(
          context,
          vec2(
            topLeft.x * this.options.gridSize.x,
            y * this.options.gridSize.y
          ),
          vec2(
            bottomRight.x * this.options.gridSize.x,
            y * this.options.gridSize.y
          ),
          ViewPort.DEBUG_CHUNK_BORDER_COLOUR,
          ViewPort.DEBUG_CHUNK_BORDER_LINE_WIDTH
        );
      }
      for (let x = topLeft.x; x < bottomRight.x; x++) {
        drawLine(
          context,
          vec2(
            x * this.options.gridSize.x,
            topLeft.y * this.options.gridSize.y
          ),
          vec2(
            x * this.options.gridSize.x,
            bottomRight.y * this.options.gridSize.y
          ),
          ViewPort.DEBUG_CHUNK_BORDER_COLOUR,
          ViewPort.DEBUG_CHUNK_BORDER_LINE_WIDTH
        );
      }
    }

    if (this.options.debug.showChunkLabels) {
      context.save();
      context.fillStyle = ViewPort.DEBUG_CHUNK_LABEL_COLOUR;
      context.font = ViewPort.DEBUG_CHUNK_LABEL_FONT;
      context.textBaseline = 'middle';
      context.textAlign = 'center';

      for (let y = topLeft.y; y < bottomRight.y; y++) {
        for (let x = topLeft.x; x < bottomRight.x; x++) {
          context.fillText(
            `${x}, ${y}`,
            x * this.options.gridSize.x + this.options.gridSize.x / 2,
            y * this.options.gridSize.y + this.options.gridSize.y / 2
          );
        }
      }

      context.restore();
    }

    if (
      this.options.debug.showOrigin &&
      pointInRectangle(vec2(0, 0), topLeft, bottomRight)
    ) {
      drawCross(
        context,
        vec2(0, 0),
        ViewPort.DEBUG_ORIGIN_COLOUR,
        ViewPort.DEBUG_ORIGIN_LINE_WIDTH,
        ViewPort.DEBUG_ORIGIN_SIZE
      );
    }
  }
}

class SpatialHash<T = any> {
  private elements: SpatialHashElement<T>[] = [];
  private grid: Map<string, T> = new Map();

  public constructor(
    public maxElements: number,
    private maxElementsToRemove: number
  ) {}

  public get count(): number {
    return this.elements.length;
  }

  public add(v: vec2, element: T) {
    this.elements.push([v, element]);
    this.grid.set(hashVec(v), element);

    let i = 0;
    while (
      this.elements.length > this.maxElements &&
      i++ < this.maxElementsToRemove
    ) {
      const [oldV] = this.elements.shift()!;
      this.grid.delete(hashVec(oldV));
    }
  }

  public remove(v: vec2) {
    this.elements = this.elements.filter(([v2]) => !vec2.eq(v, v2));
    this.grid.delete(hashVec(v));
  }

  public has(v: vec2): boolean {
    return this.grid.has(hashVec(v));
  }

  public get(v: vec2): T | undefined {
    return this.grid.get(hashVec(v));
  }

  public fetch(tl?: vec2, br?: vec2): T[] {
    if (tl === undefined && br === undefined) {
      return this.elements.map(([_, element]) => element);
    }

    return this.elements
      .filter(([v]) => {
        if (tl && (v.x < tl.x || v.y < tl.y)) {
          return false;
        }
        if (br && (v.x >= br.x || v.y >= br.y)) {
          return false;
        }
        return true;
      })
      .map(([_, element]) => element);
  }
}

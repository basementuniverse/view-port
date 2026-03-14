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
    draw?(context: CanvasRenderingContext2D, screen: vec2, camera: Camera, ...args: any[]): void;
}
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
export declare class ViewPort<T extends ViewPortChunk> {
    private static readonly DEFAULT_OPTIONS;
    private static readonly DEBUG_ORIGIN_COLOUR;
    private static readonly DEBUG_ORIGIN_LINE_WIDTH;
    private static readonly DEBUG_ORIGIN_SIZE;
    private static readonly DEBUG_CHUNK_BORDER_COLOUR;
    private static readonly DEBUG_CHUNK_BORDER_LINE_WIDTH;
    private static readonly DEBUG_CHUNK_LABEL_COLOUR;
    private static readonly DEBUG_CHUNK_LABEL_FONT;
    private options;
    private spatialHash;
    constructor(options?: Partial<ViewPortOptions<T>>);
    get countChunks(): number;
    update(dt: number, screen: vec2, camera: Camera, ...args: any[]): void;
    private addChunks;
    draw(context: CanvasRenderingContext2D, screen: vec2, camera: Camera, ...args: any[]): void;
}
export {};

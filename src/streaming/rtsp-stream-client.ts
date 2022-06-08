export interface RTSPStreamClient {
    onSegment(segment: Buffer): Promise<void>;
    onExit(code: number): void;
}
export interface RTSPStreamClient {
    onMimeType(mimeType: string): Promise<void>;
    onInitialisation(initialisation: Buffer): Promise<void>;
    onSegment(segment: Buffer): Promise<void>;
}
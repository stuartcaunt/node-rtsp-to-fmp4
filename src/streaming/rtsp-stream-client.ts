export interface RTSPStreamClient {
    onHeader(header: Buffer): Promise<void>;
    onData(header: Buffer): Promise<void>;
}
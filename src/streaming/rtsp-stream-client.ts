export interface RTSPStreamClient {
    onHeader(header: Buffer): void;
    onData(header: Buffer): void;
}
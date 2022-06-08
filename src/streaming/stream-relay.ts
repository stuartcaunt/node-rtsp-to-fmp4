import { StreamInfo } from "../models/stream-info.model";
import { StreamPublisher } from "./stream-publisher";
import { RTSPWorker } from "./rtsp-worker";
import { RTSPStreamClient } from "./rtsp-stream-client";
import { errMsg, logger } from "../utils";
import { StreamInit } from "../models";

export class StreamRelay implements RTSPStreamClient {
    private _clients: string[] = [];

    get streamId(): string {
        return this._streamInfo.id;
    }

    constructor(private _streamInfo: StreamInfo, private _rtspWorker: RTSPWorker, private _streamPublisher: StreamPublisher, private _onError: (streamInfo: StreamInfo, error: string) => void) {
    }

    addClient(clientId: string):void {
        if (!this.hasClient(clientId)) {
            this._clients.push(clientId);

            logger.info(`Client '${clientId}' added to stream '${this._streamInfo.name}'. ${this._clients.length} client(s) are now attached.`);

            if (this._clients.length == 1) {
                this._rtspWorker.start(this);
            }
        } else {
            logger.debug(`Client '${clientId}' is already attached to stream '${this._streamInfo.name}'`);
        }
    }

    removeClient(clientId: string):void {
        if (this.hasClient(clientId)) {
            this._clients = this._clients.filter((id: string) => id !== clientId);

            logger.info(`Client '${clientId}' removed from stream '${this._streamInfo.name}'. ${this._clients.length} client(s) are now attached.`);

            if (this._clients.length == 0) {
                this._rtspWorker.stop();
            }
        } else {
            logger.debug(`Client '${clientId}' is not attached to stream '${this._streamInfo.name}'`);
        }
    }

    hasClients(): boolean {
        return this._clients.length > 0;
    }

    hasClient(clientId: string): boolean {
        return this._clients.includes(clientId );
    }

    stop() {
        this._rtspWorker.stop();
        this._clients = [];
    }

    async getInitData(): Promise<StreamInit> {
        if (!this._rtspWorker) {
            throw new Error(`Failed to get stream init data as relay has not been started`);
        }

        try {
            const mime = await this._rtspWorker.getMime();
            logger.debug(`Got mime '${mime}' from ffmpeg for stream '${this._streamInfo.name}'`);

            const initialization = await this._rtspWorker.getInitialization();
            logger.debug(`Got initialisation of length ${initialization.length} from ffmpeg for stream '${this._streamInfo.name}':`);

            const initSegment = initialization.toString('base64');

            return { mime , initSegment }
        
        } catch (error) {
            throw new Error(`Failed to get stream init data: ${errMsg(error)}`);
        }
    }

    async onSegment(segment: Buffer): Promise<void> {
        logger.debug(`Got segment of length ${segment.length} from ffmpeg for stream '${this._streamInfo.name}'`);
        try {
            await this._streamPublisher.publish(this._streamInfo.id, segment);

        } catch (error) {
            this._onError(this._streamInfo, `Failed to publish segment: ${errMsg(error)}`);
        }
    }

    onExit(code: number): void {
        if (code == 1) {;
            this._onError(this._streamInfo, `ffmpeg crashed for stream '${this._streamInfo.name}'`);
        }
    }
}

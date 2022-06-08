import { singleton } from "tsyringe";
import { APPLICATION_CONFIG } from "../application-config";
import { StreamInfo, StreamInit } from "../models";
import { RTSPStreamManager, StreamPublisher, StreamRelay } from "../streaming";
import { logger } from "../utils";

@singleton()
export class StreamService {
    private _streamInfos: StreamInfo[] = [];
    private _streamRelays: StreamRelay[] = [];

    constructor(private _rtspStreamManager: RTSPStreamManager, private _streamPublisher: StreamPublisher) {
        const streamConfigs = APPLICATION_CONFIG().streams;

        for (const [name, config] of Object.entries(streamConfigs)) {
            const {url, id} = config;
            this._streamInfos.push(new StreamInfo({name, url, id}));
        }
    }

    getAllStreamInfos(): StreamInfo[] {
        return this._streamInfos;
    }

    getStreamInfo(streamId: string): StreamInfo {
        return this._streamInfos.find(streamInfo => streamInfo.id === streamId);
    }

    async connect(streamId: string, clientId: string): Promise<StreamInit> {
        const streamInfo = this.getStreamInfo(streamId);
        if (!streamInfo) {
            throw new Error(`Could not find stream details for stream with id ${streamId}`);
        }

        let streamRelay = this._getStreamRelay(streamId);
        if (!streamRelay) {
            logger.info(`Creating new Stream Relay for stream '${streamInfo.name}'`);
            // Get the RTSP Stream Worker
            const worker = this._rtspStreamManager.connectToStream(streamInfo);

            streamRelay = new StreamRelay(streamInfo, worker, this._streamPublisher, this._onStreamRelayError.bind(this));

            this._streamRelays.push(streamRelay);
        }

        // Add the client to the stream relay (if first one it'll start ffmpeg)
        streamRelay.addClient(clientId);

        // Get the init data
        try {
            const initData = await streamRelay.getInitData();
            return initData;

        } catch (error) {
            throw error;
        }        
    }

    disconnect(streamId: string, clientId: string) {
        const streamInfo = this.getStreamInfo(streamId);
        if (!streamInfo) {
            throw new Error(`Could not find stream details for stream with id ${streamId}`);
        }
        
        const streamRelay = this._getStreamRelay(streamId);
        if (streamRelay) {
            streamRelay.removeClient(clientId);

            if (!streamRelay.hasClients()) {
                logger.info(`Removing Stream Relay for stream '${streamInfo.name}'`);
                this._removeStreamRelay(streamId);
            }
        } else {
            logger.debug(`Stream Relay for stream '${streamId}' does not exist`);
        }
    }

    private _getStreamRelay(streamId: string): StreamRelay {
        return this._streamRelays.find((streamRelay: StreamRelay) => streamRelay.streamId === streamId);
    }

    private _removeStreamRelay(streamId: string): void {
        this._streamRelays = this._streamRelays.filter((streamRelay: StreamRelay) => streamRelay.streamId !== streamId);
    }

    private _onStreamRelayError(streamInfo: StreamInfo, error: string) {
        logger.error(`Removing stream '${streamInfo.name}' due to errors: ${error}`);

        const streamRelay = this._getStreamRelay(streamInfo.id);
        if (streamRelay) {
            streamRelay.stop();
            this._removeStreamRelay(streamInfo.id);
        }
    }


}
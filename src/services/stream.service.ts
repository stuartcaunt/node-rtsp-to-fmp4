import { singleton } from "tsyringe";
import { APPLICATION_CONFIG } from "../application-config";
import { StreamInfo } from "../models";
import { RTSPStreamManager, StreamConnection } from "../streaming";
import { logger } from "../utils";

@singleton()
export class StreamService {
    private _streamInfos: StreamInfo[] = [];
    private _streamConnections: StreamConnection[] = [];

    constructor(private _rtspStreamManager: RTSPStreamManager) {
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

    getRelayId(streamId: string, connectionURL: string): string {
        const streamConnection = this._getStreamConnection(streamId);
        if (streamConnection) {
            const relay = streamConnection.getStreamRelay(connectionURL);
            if (relay) {
                return relay.id;
            }
        }

        return null;
    }

    connect(streamId: string, connectionURL: string): string {
        const streamInfo = this.getStreamInfo(streamId);
        if (!streamInfo) {
            throw new Error(`Could not find stream details for stream with id ${streamId}`);
        }

        let streamConnection = this._getStreamConnection(streamId);
        if (!streamConnection) {
            streamConnection = new StreamConnection(streamInfo);
            this._streamConnections.push(streamConnection);
        }
        const streamRelay = streamConnection.createStreamRelay(connectionURL);
        if (streamRelay) {
            // Get the RTSP Stream Worker
            const worker = this._rtspStreamManager.connectToStream(streamInfo);

            // Start the relay
            streamRelay.start(worker);

            logger.info(`Conection URL ${connectionURL} added to stream ${streamId}`);
            return streamRelay.id;

        } else {
            logger.info(`Conection URL ${connectionURL} is already connected to stream ${streamId}`);
        }
        return null;
    }

    disconnect(streamId: string, connectionURL: string): boolean {
        const streamInfo = this.getStreamInfo(streamId);
        if (!streamInfo) {
            throw new Error(`Could not find stream details for stream with id ${streamId}`);
        }
        
        const streamConnection = this._getStreamConnection(streamId);
        if (streamConnection) {
            const streamRelay = streamConnection.getStreamRelay(connectionURL);
            if (streamRelay) {
                // Stop relaying data
                streamRelay.stop();

                // Remove the relay
                streamConnection.removeStreamRelay(streamRelay);
                logger.info(`Conection URL ${connectionURL} disconnected from stream ${streamId}`);

                return true;
            }
        }

        return false;
    }

    private _getStreamConnection(streamId: string): StreamConnection {
        return this._streamConnections.find((streamConnection: StreamConnection) => streamConnection.streamId === streamId);
    }


}
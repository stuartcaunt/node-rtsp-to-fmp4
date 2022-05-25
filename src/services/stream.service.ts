import { singleton } from "tsyringe";
import { stream } from "winston";
import { APPLICATION_CONFIG } from "../application-config";
import { StreamInfo } from "../models";
import { RTSPStreamManager, StreamConnection, StreamRelay } from "../streaming";
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
        const streamRelay = streamConnection.createStreamRelay(connectionURL, this._onStreamRelayError.bind(this));
        if (streamRelay) {
            logger.info(`Conection URL ${connectionURL} added to stream '${streamInfo.name}'`);

            // Get the RTSP Stream Worker
            const worker = this._rtspStreamManager.connectToStream(streamInfo);

            // Start the relay
            streamRelay.start(worker);
            return streamRelay.id;

        } else {
            logger.info(`Conection URL ${connectionURL} is already connected to stream '${streamInfo.name}'`);
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
                logger.info(`Conection URL ${connectionURL} disconnected from stream '${streamInfo.name}'`);

                // Stop relaying data
                if (streamRelay.running) {
                    streamRelay.stop();
                }

                // Remove the relay
                streamConnection.removeStreamRelay(streamRelay);

                return true;
            }
        }

        return false;
    }

    private _getStreamConnection(streamId: string): StreamConnection {
        return this._streamConnections.find((streamConnection: StreamConnection) => streamConnection.streamId === streamId);
    }

    private _onStreamRelayError(streamRelay: StreamRelay, error: string) {
        logger.info(`Removing URL ${streamRelay.connectionURL} from stream '${streamRelay.streamInfo.name}' due to errors: ${error}`);
        this.disconnect(streamRelay.streamInfo.id, streamRelay.connectionURL);
    }


}
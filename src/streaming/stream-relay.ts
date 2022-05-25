import Axios, { AxiosInstance } from 'axios';
import crypo from 'crypto'
import { StreamInfo } from '../models';
import { logger } from '../utils';
import { RTSPWorker } from './rtsp-worker';
import { RTSPStreamClient } from './rtsp-stream-client';

export class StreamRelay implements RTSPStreamClient {

    private _id: string;
    private _rtspWorker: RTSPWorker;
    private _axiosClient: AxiosInstance;
    private _baseURL: string;

    get id(): string {
        return this._id;
    }

    get connectionURL(): string {
        return this._connectionURL;
    }

    get streamInfo(): StreamInfo {
        return this._streamInfo;
    }

    constructor(private _connectionURL: string, private _streamInfo: StreamInfo, private _onStopped: (streamRelay: StreamRelay) => void) {
        this._id = crypo.randomUUID();

        this._baseURL = `${this._connectionURL}/${this.streamInfo.id}`;
        this._axiosClient = Axios.create({
            baseURL: this._baseURL,
            headers: {
                'Content-Type': 'application/octet-stream'
            },
        });
    }
    start(rtspWorker: RTSPWorker) {
        if (!this._rtspWorker) {
            rtspWorker.addClient(this);

            this._rtspWorker = rtspWorker;
        }
    }

    stop() {
        if (this._rtspWorker) {
            this._rtspWorker.removeClient(this);

            this._rtspWorker = null;
        }
        this._onStopped(this);
    }

    async onHeader(header: Buffer): Promise<void> {
        logger.debug(`Got fMP4 header from ffmpeg for stream ${this._streamInfo.name}:`);
        logger.debug(header.toString('hex', 0, Math.min(header.length, 32)));

        await this._sendData(header, '');
    }

    async onData(data: Buffer): Promise<void> {
        await this._sendData(data, '');
    }

    private async _sendData(data: Buffer, path: string): Promise<void> {
        await this._axiosClient.post(path, data)
            .catch (error => {
                logger.error(`Failed to post data to connection URL ${this._baseURL}: ${error.message}`);

                this.stop();
            });
    }

}
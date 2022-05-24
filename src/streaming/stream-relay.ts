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

    constructor(private _connectionURL: string, private _streamInfo: StreamInfo) {
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
    }

    onHeader(header: Buffer) {
        logger.debug(`Got fMP4 header from ffmpeg for stream ${this._streamInfo.name}:`);
        logger.debug(header.toString('hex'));

        this._sendData(header, '');
    }

    async onData(data: Buffer) {
        this._sendData(data, '');
    }

    private _sendData(data: Buffer, path: string) {
        this._axiosClient.post(path, data)
            .catch (error => {
                logger.error(`Failed to post data to connection URL ${this._baseURL}: ${error.message}`);

                this.stop();
            });
    }

}
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
    private _initialised = false;

    get id(): string {
        return this._id;
    }

    get connectionURL(): string {
        return this._connectionURL;
    }

    get streamInfo(): StreamInfo {
        return this._streamInfo;
    }

    get running(): boolean {
        return this._rtspWorker != null;
    }

    constructor(private _connectionURL: string, private _streamInfo: StreamInfo, private _onError: (streamRelay: StreamRelay, error: string) => void) {
        this._id = crypo.randomUUID();

        this._baseURL = `${this._connectionURL}/${this.streamInfo.id}`;
        this._axiosClient = Axios.create({
            baseURL: this._baseURL,
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

    async onMimeType(mimeType: string): Promise<void> {
        logger.debug(`Got mimetype '${mimeType}' from ffmpeg for stream '${this._streamInfo.name}'`);
        await this._sendData(mimeType, '/mime', 'text/plain');
    }

    async onInitialisation(initialisation: Buffer): Promise<void> {
        logger.debug(`Got initialisation of length ${initialisation.length} from ffmpeg for stream '${this._streamInfo.name}':`);

        await this._sendData(initialisation, '/initialization', 'application/octet-stream');

        this._initialised = true;
    }

    async onSegment(segment: Buffer): Promise<void> {
        if (this._initialised) {
            logger.debug(`Got segment of length ${segment.length} from ffmpeg for stream '${this._streamInfo.name}':`);
            await this._sendData(segment, '/segment', 'application/octet-stream');
        }
    }

    onExit(code: number): void {
        if (code == 1) {;
            this._onError(this, `ffmpeg crashed for stream '${this._streamInfo.name}'`);
        }
    }

    private async _sendData(data: Buffer | string, path: string, contentType: string): Promise<void> {
        await this._axiosClient.post(path, data, {
                headers: {
                    'Content-Type': contentType
                }, 
            })
            .catch (error => {
                logger.error(`Stream ${this._streamInfo.name} failed to post data to connection URL ${this._baseURL}: ${error.message}`);

                this._onError(this, 'Failed to post data');
            });
    }


}
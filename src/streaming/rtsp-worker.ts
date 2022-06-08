import { StreamInfo } from "../models";
import { spawn, ChildProcessWithoutNullStreams} from 'child_process';
import { logger } from "../utils";
import { RTSPStreamClient } from "./rtsp-stream-client";
import MP4Frag from 'mp4frag';

export class RTSPWorker {

    private _client: RTSPStreamClient;
    private _ffmpeg: ChildProcessWithoutNullStreams;
    private _mp4Frag: MP4Frag;

    get streamId(): string {
        return this._streamInfo.id;
    }

    constructor(private _streamInfo: StreamInfo) {
    }

    start(client: RTSPStreamClient) {
        if (this._ffmpeg) {
            return;
        }

        this._client = client;
        logger.info(`Starting ffmpeg for stream '${this._streamInfo.name}'`);

        const params = [
            '-re',  
            '-rtsp_transport',
            'tcp',
            '-i',
            this._streamInfo.url,
            '-reset_timestamps',
            '1',
            '-an',
            '-c:v',
            'copy',
            '-f',
            'mp4',
            '-movflags',
            '+frag_every_frame+empty_moov+default_base_moof',
            'pipe:1'
        ];

        logger.info(`Spawning ffmpeg for RTSP stream '${this._streamInfo.name}' at ${this._streamInfo.url}`);
        this._ffmpeg = spawn('ffmpeg', params,  { stdio: ['ignore', 'pipe', 'ignore'] });

        this._ffmpeg.on('exit', (code) => {
            if (code === 1) {
                logger.error(`ffmpeg for RTSP stream '${this._streamInfo.name}' exited with error`);	  

                // TODO do we respawn ffmpeg or report the crash higher up?
            } else {
                logger.info(`ffmpeg for RTSP stream '${this._streamInfo.name}' exited`);
            }

            this._ffmpeg = null;
            this.stop();

            // Notify clients of exit
            this._client.onExit(code);
        });

        // Create mp4Frag
        this._mp4Frag = new MP4Frag({});
        this._ffmpeg.stdio[1].pipe(this._mp4Frag);

        this._mp4Frag.on('segment', data => {
            this._client.onSegment(data.segment);
        })
    }

    stop() {
        if (this._mp4Frag) {
            this._mp4Frag = null;
        }

        if (this._ffmpeg) {
            logger.info(`Killing ffmpeg for RTSP stream '${this._streamInfo.name}'`);
            this._ffmpeg.kill(9);
            this._ffmpeg = null;
        }
    }

    async getMime(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this._mp4Frag) {
                reject(`ffmpeg process for RTSP stream '${this._streamInfo.name}' does not exist`)
            }

            if (this._mp4Frag.mime) {
                resolve(this._mp4Frag.mime);
            
            } else {
                const exitListener = () => {
                    reject(`ffmpeg process for RTSP stream '${this._streamInfo.name}' exited`)
                };
                this._ffmpeg.on('exit', exitListener);

                this._mp4Frag.once('initialized', () => {
                    this._ffmpeg.removeListener('exit', exitListener);
                    resolve(this._mp4Frag.mime);
                });
            }
    
        });
    }

    async getInitialization(): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            if (!this._mp4Frag) {
                reject(`ffmpeg process for RTSP stream '${this._streamInfo.name}' does not exist`)
            }

            if (this._mp4Frag.initialization) {
                resolve(this._mp4Frag.initialization);
            
            } else {
                const exitListener = () => {
                    reject(`ffmpeg process for RTSP stream '${this._streamInfo.name}' exited`)
                };
                this._ffmpeg.on('exit', exitListener);

                this._mp4Frag.once('initialized', () => {
                    this._ffmpeg.removeListener('exit', exitListener);
                    resolve(this._mp4Frag.initialization);
                });
            }
    
        });
    }
}
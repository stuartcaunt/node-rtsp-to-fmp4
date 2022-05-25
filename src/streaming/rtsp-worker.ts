import { StreamInfo } from "../models";
import { spawn, ChildProcessWithoutNullStreams} from 'child_process';
import { logger } from "../utils";
import { RTSPStreamClient } from "./rtsp-stream-client";
import MP4Frag from 'mp4frag';
import { PassThrough, Writable } from 'stream';

export class RTSPWorker {

    private _clients: RTSPStreamClient[] = [];
    private _ffmpeg: ChildProcessWithoutNullStreams;
    private _mp4Frag: MP4Frag;

    get streamId(): string {
        return this._streamInfo.id;
    }

    constructor(private _streamInfo: StreamInfo) {
    }

    hasClients(): boolean {
        return this._clients.length > 0;
    }

    addClient(client: RTSPStreamClient) {
        this._clients.push(client);
        if (this._clients.length == 1) {
            logger.info(`First client listening to RTSP stream '${this._streamInfo.name}': starting ffmpeg`);
            this.start();
        }

        if (this._mp4Frag.initialization) {
            client.onMimeType(this._mp4Frag.mime).then(() => {
                client.onInitialisation(this._mp4Frag.initialization);
            });
        
        } else {
            this._mp4Frag.once('initialized', () => {
                client.onMimeType(this._mp4Frag.mime).then(() => {
                    // Check we're still running
                    if (this._mp4Frag) {
                        client.onInitialisation(this._mp4Frag.initialization);
                    }
                });
            });
        }
    }

    removeClient(client: RTSPStreamClient) {
        this._clients = this._clients.filter(aClient => aClient != client);
        if (this._clients.length == 0) {
            logger.info(`No more clients listening to RTSP stream '${this._streamInfo.name}': stopping ffmpeg`);
            this.stop();
        }
    }

    start() {
        if (this._ffmpeg) {
            return;
        }

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

        this._ffmpeg.on('exit', (code, signal) => {
            if (code === 1) {
                logger.info(`ffmpeg for RTSP stream '${this._streamInfo.name}' exited with error`);	  

                // TODO do we respawn ffmpeg or report the crash higher up?
            } else {
                logger.info(`ffmpeg for RTSP stream '${this._streamInfo.name}' exited`);	  
            }
        });

        // Create mp4Frag
        this._mp4Frag = new MP4Frag({});
        this._ffmpeg.stdio[1].pipe(this._mp4Frag);

        this._mp4Frag.on('segment', data => {
            this._clients.forEach(client => client.onSegment(data.segment));
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
}
import { StreamInfo } from "../models";
import * as child from 'child_process';
import { logger } from "../utils";
import { RTSPStreamClient } from "./rtsp-stream-client";

export class RTSPWorker {

    private _clients: RTSPStreamClient[] = [];
    private _process: child.ChildProcessWithoutNullStreams;
    private _header: Buffer;

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
            this.start();
        
        } else if (this._header) {
            client.onHeader(this._header);
        }
    }

    removeClient(client: RTSPStreamClient) {
        this._clients = this._clients.filter(aClient => aClient != client);
        if (this._clients.length == 0) {
            this.stop();
        }
    }

    start() {
        if (this._process) {
            return;
        }

        const params = [
            '-re',  
            '-rtsp_transport',
            'tcp',
            '-i',
            this._streamInfo.url,
            '-an',
            '-c:v',
            'copy',
            '-f',
            'mp4',
            '-movflags',
            'frag_keyframe+empty_moov',
            'pipe:1'
        ];

        this._process = child.spawn('ffmpeg', params, { detached: false });

        this._process.stdout.on('data', (data) => {
            // Check for header
            if (!this._header) {
                this._header = data;

                this._clients.forEach(client => client.onHeader(data));
            
            } else {
                this._clients.forEach(client => client.onData(data));
            }
            // logger.info(`[stdout] Received ${data.length} data from ffmpeg on stdout`);
        });

        this._process.stderr.on('data', (data) => {	
            // logger.debug(`[stderr] ${data}`);
        });

        this._process.on('exit', (code, signal) => {
            if (code === 1) {
              logger.info('RTSP stream exited with error');	  
            } else {
                logger.info('RTSP stream exited')
            }
        });
    }

    stop() {
        if (this._process) {
            this._process.kill(9);
            this._process = null;
            this._header = null;
        }
    }
}
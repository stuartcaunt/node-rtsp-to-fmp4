import { singleton } from "tsyringe";
import { StreamInfo } from "../models";
import { logger, sleep } from "../utils";
import { RTSPWorker } from "./rtsp-worker";

@singleton()
export class RTSPStreamManager {

    private _rtspWorkers: RTSPWorker[] = [];

    constructor() {
    }

    connectToStream(streamInfo: StreamInfo): RTSPWorker {
        // Check if worker exists
        let worker = this._getWorker(streamInfo);
        if (worker == null) {
            worker = new RTSPWorker(streamInfo);
            logger.info(`Created new RTSP Worker for stream '${streamInfo.name}'`);
            this._rtspWorkers.push(worker);
        }

        return worker;
    }

    private _getWorker(streamInfo: StreamInfo): RTSPWorker {
        return this._rtspWorkers.find(worker => worker.streamId === streamInfo.id);
    }

}
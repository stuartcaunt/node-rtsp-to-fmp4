import { singleton } from "tsyringe";
import { APPLICATION_CONFIG, StreamConfig } from "../application-config";
import { StreamInfo } from "../models";

@singleton()
export class StreamService {
    private _streamInfos: StreamInfo[] = [];

    constructor() {
        const streamConfigs = APPLICATION_CONFIG().streams;

        for (const [name, config] of Object.entries(streamConfigs)) {
            const url = config.url;
            const uuid = config.uuid;
            this._streamInfos.push(new StreamInfo({name, url, uuid}));
        }
    }

    getStreams(): {uuid: string; name: string}[] {
        // Use axios to call the stream server
        return this._streamInfos.map((streamInfo: StreamInfo) => ({uuid: streamInfo.uuid, name: streamInfo.name}));
    }

    async connect(streamId: string, connectionURL: string): Promise<string> {
        return new Promise((resolve, reject) => {
            resolve('yey');
        })
    }

    async disconnect(streamId: string, connectionURL: string): Promise<string> {
        return new Promise((resolve, reject) => {
            resolve('yey');
        })
    }


}
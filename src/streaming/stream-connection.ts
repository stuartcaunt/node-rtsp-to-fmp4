import { StreamRelay } from "./stream-relay";
import { StreamInfo } from "../models/stream-info.model";

export class StreamConnection {
    private _streamRelays: StreamRelay[] = [];

    get streamId(): string {
        return this._streamInfo.id;
    }

    constructor(private _streamInfo: StreamInfo) {
    }

    public hasConnectionURL(connectionURL: string): boolean {
        return this.getStreamRelay(connectionURL) != null;
    }

    public getStreamRelay(connectionURL: string): StreamRelay {
        return this._streamRelays.find(streamRelay => streamRelay.connectionURL === connectionURL);
    }

    public createStreamRelay(connectionURL: string): StreamRelay {
        if (!this.hasConnectionURL(connectionURL)) {
            const streamRelay = new StreamRelay(connectionURL, this._streamInfo);
            streamRelay.start();

            this._streamRelays.push(streamRelay);
            return streamRelay;
        }
        return null;
    }

    public removeStreamRelay(connectionURL: string): boolean {
        if (this.hasConnectionURL(connectionURL)) {
            const streamRelay = this.getStreamRelay(connectionURL);
            streamRelay.stop();

            this._streamRelays = this._streamRelays.filter(aStreamRelay => aStreamRelay.connectionURL !== streamRelay.connectionURL);
            return true;
        }
        return false;
    }
}

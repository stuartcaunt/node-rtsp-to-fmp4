import crypo from 'crypto'
import { StreamInfo } from '../models';

export class StreamRelay {

    private _id: string;

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
    }

    start() {
        
    }

    stop() {

    }
}
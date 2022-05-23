export class StreamInfo {
    private _uuid: string;
    private _name: string;
    private _url: string;

    get uuid(): string {
        return this._uuid;
    }

    set uuid(value: string) {
        this._uuid = value;
    }

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
    }

    get url(): string {
        return this._url;
    }

    set url(value: string) {
        this._url = value;
    }

    constructor(data?: Partial<StreamInfo>) {
        Object.assign(this, data);
    }

}
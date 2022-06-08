import { Publisher } from 'zeromq'
import { APPLICATION_CONFIG } from '../application-config';
import { errMsg, logger } from '../utils';

export class StreamPublisher {

    private _socket: Publisher;

    constructor() {
    }

    async init(): Promise<void> {
        try {
            if (!this._socket) {
                this._socket = await this.createPublisherSocket(APPLICATION_CONFIG().publisher.port);
            }

        } catch (error) {
            throw (error);
        }
    }

    async close(): Promise<void> {
        if (this._socket) {
            this._socket.close();
            this._socket = null;
            logger.debug(`Stream Publisher closed`);
        }
    }

    async publish(streamId: string, buffer: ArrayBuffer): Promise<void> {
        if (this._socket && !this._socket.closed) {
            try {
                await this._socket.send([streamId, buffer]);

            } catch (error) {
                throw new Error(`Failed to publish data for stream ${streamId}: ${errMsg(error)}`);
            }

        } else {
            throw new Error(`Failed to publish data for stream ${streamId}: socket unavailable`);
        }
    }

    private async createPublisherSocket(port: number): Promise<Publisher> {
        const address = `tcp://*:${port}`;
        try {
            const socket = new Publisher();
            socket.linger = 0;
    
            await socket.bind(address);
            logger.debug(`Stream Publisher bound to ${address}`);

            return socket;
        
        } catch (error) {
            throw new Error(`Failed to bind PUB socket to ${address}: ${errMsg(error)}`);
        }
    }

}
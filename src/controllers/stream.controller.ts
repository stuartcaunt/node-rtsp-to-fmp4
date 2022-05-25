import {Request, Response} from "express";
import { singleton } from "tsyringe";
import { StreamService } from "../services";
import { logger,  } from "../utils";

interface StreamConnectionRequest {
    url: string;
}

@singleton()
export class StreamController {

    constructor(private _service: StreamService) {
    }

    getStreams(req: Request, res: Response) {
        try {
            const streams = this._service.getAllStreamInfos();
            res.status(200).json(streams);

        } catch (error) {
            if (error instanceof Error) {
                logger.error(`An error occurred getting list of streams: ${error.message}`);
                res.status(500).send(`Server error: ${error.message}`);
            
            } else {
                logger.error(`An error occurred getting list of streams: ${error}`);
                res.status(500).send(`Server error: ${error}`);
            }
        }
    }

    connect(req: Request, res: Response) {
        const streamId = req.params.streamId;
        const streamConnectionRequest = req.body as StreamConnectionRequest;

        if (!streamConnectionRequest || !streamConnectionRequest.url) {
            res.status(400).send('Stream connection request body does not have a client URL')
            return;
        }

        try {
            const relayId = this._service.connect(streamId, streamConnectionRequest.url);
            if (relayId) {
                res.status(201).send(relayId);
            
            } else {
                const relayId = this._service.getRelayId(streamId, streamConnectionRequest.url);
                res.status(200).send(relayId);
            }

        } catch (error) {
            this._service.disconnect(streamId, streamConnectionRequest.url);

            if (error instanceof Error) {
                logger.error(`An error occurred connecting to stream ${streamId}: ${error.message}`);
                res.status(500).send(`Server error: ${error.message}`);
            
            } else {
                logger.error(`An error occurred connecting to stream ${streamId}`);
                res.status(500).send(`Server error: ${error}`);
            }
        }
    }

    disconnect(req: Request, res: Response) {
        const streamId = req.params.streamId;
        const streamConnectionRequest = req.body as StreamConnectionRequest;

        if (!streamConnectionRequest || !streamConnectionRequest.url) {
            res.status(400).send('Stream disconnection request body does not have a client URL')
            return;
        }

        try {
            const removed = this._service.disconnect(streamId, streamConnectionRequest.url);
            res.status(200).send(removed);

        } catch (error) {
            if (error instanceof Error) {
                logger.error(`An error occurred disconnecting from stream ${streamId}: ${error.message}`);
                res.status(500).send(`Server error: ${error.message}`);
            
            } else {
                logger.error(`An error occurred disconnecting from stream ${streamId}`);
                res.status(500).send(`Server error: ${error}`);
            }
        }
    }
}

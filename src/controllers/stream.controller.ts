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
            const streams = this._service.getStreams();
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

    async connect(req: Request, res: Response) {
        const streamId = req.params.streamId;
        const streamConnectionRequest = req.body as StreamConnectionRequest;

        if (!streamConnectionRequest || !streamConnectionRequest.url) {
            res.status(400).send('Steam connection request body does not have a client URL')
            return;
        }

        try {
            const connection = await this._service.connect(streamId, streamConnectionRequest.url);
            res.status(200).json(connection);

        } catch (error) {
            if (error instanceof Error) {
                logger.error(`An error occurred connecting to stream ${streamId}: ${error.message}`);
                res.status(500).send(`Server error: ${error.message}`);
            
            } else {
                logger.error(`An error occurred connecting to stream ${streamId}`);
                res.status(500).send(`Server error: ${error}`);
            }
        }
    }

    async disconnect(req: Request, res: Response) {
        const streamId = req.params.streamId;
        const streamConnectionRequest = req.body as StreamConnectionRequest;

        if (!streamConnectionRequest || !streamConnectionRequest.url) {
            res.status(400).send('Steam disconnection request body does not have a client URL')
            return;
        }

        try {
            const connection = await this._service.disconnect(streamId, streamConnectionRequest.url);
            res.status(200).json(connection);

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

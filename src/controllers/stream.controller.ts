import {Request, Response} from "express";
import { singleton } from "tsyringe";
import { StreamService } from "../services";
import { errMsg, logger,  } from "../utils";

interface StreamConnectionRequest {
    clientId: string;
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

    async connect(req: Request, res: Response): Promise<void> {
        const streamId = req.params.streamId;
        const streamConnectionRequest = req.body as StreamConnectionRequest;

        if (!streamConnectionRequest || !streamConnectionRequest.clientId) {
            res.status(400).send('Stream connection request body does not have a clientId')
            return;
        }

        try {
            const initData = await this._service.connect(streamId, streamConnectionRequest.clientId);
            res.status(200).json(initData);

        } catch (error) {
            logger.error(`An error occurred connecting to stream ${streamId}: ${errMsg(error)}`);

            this._service.disconnect(streamId, streamConnectionRequest.clientId);

            res.status(500).send(`Server error: ${errMsg(error)}`);
        }
    }

    disconnect(req: Request, res: Response) {
        const streamId = req.params.streamId;
        const streamConnectionRequest = req.body as StreamConnectionRequest;

        if (!streamConnectionRequest || !streamConnectionRequest.clientId) {
            res.status(400).send('Stream disconnection request body does not have a clientId')
            return;
        }

        try {
            this._service.disconnect(streamId, streamConnectionRequest.clientId);
            res.sendStatus(200);

        } catch (error) {
            logger.error(`An error occurred disconnecting from stream ${streamId}: ${errMsg(error)}`);
            res.status(500).send(`Server error: ${errMsg(error)}`);
        }
    }
}

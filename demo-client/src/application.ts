import "reflect-metadata";
import { logger } from './utils';
import express from 'express'
import * as http from 'http';
import { APPLICATION_CONFIG } from './application-config';
import bodyParser from "body-parser";

export class Application {

  private _server: http.Server;

  constructor() {
  }

  async start(): Promise<null> {
    if (!this._server) {
      // Start the application
      logger.info('Starting application');

      const app = express();
      app.use(express.json());

      app.post('/api/streams/:streamId/segment', bodyParser.raw({ type: 'application/octet-stream', limit: '1mb' }), (req, res) => {
        const streamId = req.params.streamId;
        const data = req.body;

        logger.info(`Got segment of ${data.length} bytes sent from stream ${streamId}`);
        logger.debug(data.toString('hex', 0, Math.min(data.length, 40)));

        res.sendStatus(200);
      });

      app.post('/api/streams/:streamId/mime', bodyParser.text(), (req, res) => {
        const streamId = req.params.streamId;
        const mime = req.body;

        logger.info(`Got mime '${mime}' from stream ${streamId}`);

        res.sendStatus(200);
      });

      app.post('/api/streams/:streamId/initialization', bodyParser.raw({ type: 'application/octet-stream' }), (req, res) => {
        const streamId = req.params.streamId;
        const data = req.body;

        logger.info(`Got intialization of ${data.length} bytes sent from stream ${streamId}`);
        logger.debug(data.toString('hex', 0, Math.min(data.length, 40)));

        res.sendStatus(200);
      });

      const port = APPLICATION_CONFIG().server.port;
      const host = APPLICATION_CONFIG().server.host;
      this._server = app.listen(port, host);

      logger.info(`Application started (listening on ${host}:${port})`);
    }

    return null;
  }

  async stop(): Promise<null> {
    if (this._server) {
      logger.info('Stopping http server...');
      this._server.close();

      logger.info('... http server stopped');
      this._server = null;
    }

    return null;
  }
}


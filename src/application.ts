import "reflect-metadata";
import { logger } from './utils';
import express from 'express'
import * as http from 'http';
import { APPLICATION_CONFIG } from './application-config';
import { container } from "tsyringe";
import { StreamController } from "./controllers";

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

      app.get('/api/streams', (req, res) => container.resolve(StreamController).getStreams(req, res));
      app.post('/api/streams/:streamId/connect', (req, res) => container.resolve(StreamController).connect(req, res));

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


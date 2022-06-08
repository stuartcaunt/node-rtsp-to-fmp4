import "reflect-metadata";
import { logger } from './utils';
import express from 'express'
import * as http from 'http';
import { APPLICATION_CONFIG } from './application-config';
import { container } from "tsyringe";
import { StreamController } from "./controllers";
import { StreamPublisher } from "./streaming";

export class Application {

  private _server: http.Server;
  private _streamPublisher: StreamPublisher = new StreamPublisher();

  constructor() {
    this._init();
  }

  async start(): Promise<null> {
    if (!this._server) {
      // Start the application
      logger.info('Starting application');

      const app = express();
      app.use(express.json());

      await this._streamPublisher.init();

      app.get('/api/streams', (req, res) => container.resolve(StreamController).getStreams(req, res));
      app.post('/api/streams/:streamId/connect', (req, res) => container.resolve(StreamController).connect(req, res));
      app.post('/api/streams/:streamId/disconnect', (req, res) => container.resolve(StreamController).disconnect(req, res));

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

    if (this._streamPublisher) {
      this._streamPublisher.close();
    }

    return null;
  }

  private _init() {
    container.register<StreamPublisher>(StreamPublisher, {
      useValue: this._streamPublisher
    });
  }
}


import "reflect-metadata";
import { logger } from './utils';
import express from 'express'
import * as http from 'http';
import { APPLICATION_CONFIG } from './application-config';
import bodyParser from "body-parser";

export class Application {

  private _server: http.Server;
  private _statsArray = [];
  private _statsLength = 10;
  private _statsIndex = 0;
  private _statsTotal = 0;
  private _startTime: Date;

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

        // logger.info(`Got segment of ${data.length} bytes sent from stream ${streamId}`);
        // logger.debug(data.toString('hex', 0, Math.min(data.length, 40)));

        this._statsArray[this._statsIndex] = {
          time: Date.now(),
          data: data.length,
        }
        if (this._startTime == null) {
          this._startTime = new Date();
        }
        this._statsTotal += data.length;
        this._statsIndex++;
        if (this._statsIndex >= this._statsLength) {
          this._statsIndex = 0;
        }
        this._calcDataRate();

        res.sendStatus(200);
      });

      app.post('/api/streams/:streamId/mime', bodyParser.text(), (req, res) => {
        const streamId = req.params.streamId;
        const mime = req.body;

        this._statsArray = [];
        this._startTime = null;
        this._statsIndex = 0;

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

  private _calcDataRate(): void {
    if (this._statsArray.length < 2) {
      return;
    }
    const initRes = {
      timeMin: undefined,
      timeMax: undefined,
      dataSum :0,
    }

    const res = this._statsArray.reduce((curRes: any, actual: any) => {
      curRes.timeMin = curRes.timeMin == null ? actual.time : Math.min(curRes.timeMin, actual.time);
      curRes.timeMax = curRes.timeMax == null ? actual.time : Math.max(curRes.timeMax, actual.time);
      curRes.dataSum += actual.data;
      return curRes;
    }, initRes);

    const rate = 1000 / 1024 * res.dataSum / (res.timeMax - res.timeMin);
    const time = (Date.now() - this._startTime.getTime()) / 1000;
    const avgRate = (this._statsTotal / 1024) / time ;
    console.log(`${(this._statsTotal / 1024).toFixed(1)}KB in ${(time).toFixed(1)}s @ ${(avgRate).toFixed(1)}KB/s (current = ${(rate).toFixed(1)}KB/s)`);

  }
}


import "reflect-metadata";
import { Subscriber } from 'zeromq'
import { errMsg, logger } from './utils';
import { APPLICATION_CONFIG } from './application-config';

export class Application {

  private _socket: Subscriber;
  private _statsArray = [];
  private _statsLength = 10;
  private _statsIndex = 0;
  private _statsTotal = 0;
  private _startTime: Date;

  constructor() {
  }

  async start(): Promise<null> {
    if (!this._socket) {
      try {
        this._socket = await this.createSubscriberSocket(APPLICATION_CONFIG().publisher.port);

      } catch (error) {
        throw error;
      }
    }

    this._loop();

    return null;
  }

  async stop(): Promise<null> {
    if (this._socket) {
      logger.info('Disconnecting subscriber ...');
      this._socket.close();

      logger.info('... subscriber stopped');
      this._socket = null;
    }

    return null;
  }

  private async _loop(): Promise<void> {
    try {
      for await (const [streamId, data] of this._socket) {

        // logger.info(`Got segment of ${data.length} bytes sent from stream ${streamId}`);

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
      }

    } catch(error) {
      logger.error(`Error while receiving data: ${errMsg(error)}`);
    }
  }

  private async createSubscriberSocket(port: number) {
    const address = `tcp://localhost:${port}`;
    try {
        const socket = new Subscriber();

        socket.connect(address);
        socket.subscribe();

        logger.debug(`Stream Publisher connected to ${address}`);

        return socket;
    
    } catch (error) {
        throw new Error(`Failed to connect SUB socket to ${address}: ${errMsg(error)}`);
    }    
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


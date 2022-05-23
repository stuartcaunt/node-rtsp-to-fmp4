export interface StreamConfig {
  uuid: string;
  url: string;
}

export class ApplicationConfig {

  server: {
    port: number,
    host: string
  }

  logging: {
    level: string;
    timezone: string;
  };

  streams: {
    [key: string]: StreamConfig;
  }

  constructor(data?: Partial<ApplicationConfig>) {
    Object.assign(this, data);
  }
}

let applicationConfig: ApplicationConfig;

export function APPLICATION_CONFIG(): ApplicationConfig {
  if (applicationConfig == null) {
    applicationConfig = require('../config.json') as ApplicationConfig;
  }

  return applicationConfig;
}

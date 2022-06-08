export class ApplicationConfig {

  publisher: {
    port: number,
  }

  logging: {
    level: string;
  };

  constructor(data?: Partial<ApplicationConfig>) {
    Object.assign(this, data);
  }
}

let applicationConfig: ApplicationConfig;

export function APPLICATION_CONFIG(): ApplicationConfig {
  if (applicationConfig == null) {
    applicationConfig = {
      publisher: {
        port: 8084,
      },
      logging: {
        level: 'debug',
      }
    };
  }

  return applicationConfig;
}

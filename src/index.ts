import errorParser from "error-stack-parser";

import moment from "moment";
import winston from "winston";
import Sentry from "winston-transport-sentry-node";
const colorizer = winston.format.colorize({
  colors: {
    info: "white",
    warn: "yellow",
    error: "red",
    debug: "blue",
  },
});

const consoleLogFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.simple(),
  winston.format.splat(),
  winston.format.printf((msg) =>
    colorizer.colorize(
      msg.level,
      `${moment
        .utc(msg.timestamp)
        .utcOffset(7)
        .format("DD/MM/YYYY hh:mm:ss")} - ${msg.level}: ${msg.message}`
    )
  )
);

const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.simple(),
  winston.format.splat(),
  winston.format.printf(
    (msg) =>
      `${moment
        .utc(msg.timestamp)
        .utcOffset(7)
        .format("DD/MM/YYYY hh:mm:ss")} - ${msg.level}: ${msg.message}`
  )
);
export enum TransportType {
  FILE = "FILE",
  CONSOLE = "CONSOLE",
  SENTRY = "SENTRY",
}

export type GetTransportContext = {
  sentryOpts: {
    sentry: {
      dsn: string;
    };
    level: string;
  };
};
const getTransports = (
  supportedTransports: TransportType[],
  context: GetTransportContext
) => {
  const transports = [];
  supportedTransports.forEach((transportType) => {
    switch (transportType) {
      case TransportType.FILE: {
        transports.push(
          new winston.transports.File({
            level: "error",
            filename: "logs/errors.log",
            format: productionFormat,
          })
        );
        break;
      }
      case TransportType.CONSOLE: {
        transports.push(
          new winston.transports.Console({
            format: consoleLogFormat,
          })
        );
      }
      case TransportType.SENTRY: {
        const sentry = new Sentry(context.sentryOpts);
        transports.push(sentry);
      }
    }
  });
  return transports;
};

const _parserError = (err: Error) => {
  const errors = errorParser.parse(err);
  const firstStack = errors[0];
  return {
    message: err.message,
    errorAt: `${firstStack.fileName}:${firstStack.lineNumber}:${firstStack.columnNumber}`,
  };
};

export const createLogger = ({
  transports,
  context,
}: {
  transports: TransportType[];
  context?: GetTransportContext;
}) => {
  return winston.createLogger({
    transports: getTransports(transports, context),
  });
};

// Register function
export const registerErrorHandling = ({
  logger,
  isForceQuitWhenErrorOccur,
}: {
  logger: winston.Logger;
  isForceQuitWhenErrorOccur: boolean;
}) => {
  logger.exitOnError = false;
  process.on("unhandledRejection", async (err: Error) => {
    const error = _parserError(err);
    logger.error(
      "UN_HANDLED_ERROR: message: %s, Error At: %s \n",
      error.message,
      error.errorAt
    );
    if (isForceQuitWhenErrorOccur) {
      console.log("error detected ! graceful exit in 7 seconds");
      setTimeout(() => {
        process.exit(1);
      }, 7000);
    } else {
      return;
    }
  });
  process.on("uncaughtException", async (err) => {
    const error = _parserError(err);
    logger.error(
      "UN_CAUGHT_ERROR: message: %s, Error At: %s",
      error.message,
      error.errorAt
    );
    if (isForceQuitWhenErrorOccur) {
      console.log("error detected ! graceful exit in 7 seconds");
      setTimeout(() => {
        process.exit(1);
      }, 7000);
    } else {
      return;
    }
  });
};

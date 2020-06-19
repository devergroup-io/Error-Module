const { createLogger, registerErrorHandling } = require("../dist");
const logger = createLogger({
  transports: ["SENTRY", "CONSOLE"],
  context: {
    sentryOpts: {
      sentry: {
        dsn:
          "https://0c04cd22fada47e580ebd9f5c3556d57@o394239.ingest.sentry.io/5256035",
      },
      level: "info",
    },
  },
});

registerErrorHandling({
  logger,
  isForceQuitWhenErrorOccur: true,
});

(() => {
  logger.info("hello");
  // throw new Error("it should exit in 10 seconds");
})();

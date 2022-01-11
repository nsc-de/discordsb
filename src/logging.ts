import winston, { loggers } from "winston";
import path from "path";
import fs from "fs";

const logsdir = "logs";
const logfile = path.join(
  logsdir,
  new Date().toJSON().replace(/\:/g, "-") + ".log"
);
const latestLog = path.join(logsdir, "latest.log");
if (fs.existsSync(latestLog)) fs.unlinkSync(latestLog);

const format = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.timestamp(),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `[${timestamp}] [${level}] Error occured: - ${stack}`;
    }
    return `[${timestamp}] [${level}] ${message}`;
  })
);

const Logger = winston.createLogger({
  format: format,
  transports: [
    new winston.transports.File({
      filename: logfile,
      handleExceptions: true,
      handleRejections: true,
    }),
    new winston.transports.File({
      filename: latestLog,
      handleExceptions: true,
      handleRejections: true,
    }),
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        format
      ),
    }),
  ],
  handleExceptions: true,
  exitOnError: false,
});

Logger.info('Writing logs into file "%s"', path.resolve(logfile));

export default Logger;

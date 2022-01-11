import express from "express";
import logger from "../logging";

const webserver = express();
webserver.on("APP_STARTED", () => {});
webserver.listen(3000, () => {
  logger.info("App started");
});

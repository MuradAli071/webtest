import express from "express";
import app from "./server/src/app.js";

const vercelApp = express();
vercelApp.use(app);

export default vercelApp;

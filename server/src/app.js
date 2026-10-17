import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import { registerFrontend } from "./frontend.js";
import { initializeServer } from "./startup.js";
import discoveryRouter from "./routes/discovery.js";
import adminRouter from "./routes/admin.js";
import adminAboutRouter from "./routes/adminAbout.js";
import adminEnquiriesRouter from "./routes/adminEnquiries.js";
import adminProjectsRouter from "./routes/adminProjects.js";
import adminSiteRouter from "./routes/adminSite.js";
import aboutRouter from "./routes/about.js";
import enquiriesRouter from "./routes/enquiries.js";
import projectsRouter from "./routes/projects.js";
import servicesRouter from "./routes/services.js";
import siteRouter from "./routes/site.js";

const app = express();

if (process.env.VERCEL) {
  app.use(async (_request, _response, next) => {
    try {
      await initializeServer();
      next();
    } catch (error) {
      next(error);
    }
  });
}

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use(discoveryRouter);

app.use("/api/admin", (_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

app.use("/api/services", servicesRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/about", aboutRouter);
app.use("/api/site", siteRouter);
app.use("/api/enquiries", enquiriesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/admin/about", adminAboutRouter);
app.use("/api/admin/site", adminSiteRouter);
app.use("/api/admin/enquiries", adminEnquiriesRouter);
app.use("/api/admin/projects", adminProjectsRouter);

app.use("/api", (_request, response) => {
  response.status(404).json({ error: "API endpoint not found." });
});

registerFrontend(app);

app.use((error, _request, response, _next) => {
  if (error?.code === 11000) {
    return response.status(409).json({ error: "A record with a unique value already exists." });
  }
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return response.status(400).json({ error: error.message });
  }
  if (error?.type === "entity.parse.failed") {
    return response.status(400).json({ error: "Request body must contain valid JSON." });
  }
  if (error?.name === "MulterError") {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return response.status(status).json({ error: error.message });
  }
  if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 600) {
    return response.status(error.status).json({ error: error.message });
  }

  console.error("API request failed:", error);
  return response.status(500).json({ error: "The request could not be completed." });
});

export default app;

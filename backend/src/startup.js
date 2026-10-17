import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { seedAboutContentOnce } from "./services/seedAboutContent.js";
import { seedSiteContentOnce } from "./services/seedSiteContent.js";
import { seedServicesOnce } from "./services/seedServices.js";

let initialization;

function validateEnvironment() {
  const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET } = process.env;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI must be set in the server environment.");
  }
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in the server environment.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL.trim())) {
    throw new Error("ADMIN_EMAIL must be a valid email address.");
  }
  if (ADMIN_PASSWORD.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters long.");
  }
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  return { MONGODB_URI, ADMIN_PASSWORD };
}

async function initialize(app) {
  const { MONGODB_URI, ADMIN_PASSWORD } = validateEnvironment();

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  }
  await seedServicesOnce();
  await seedSiteContentOnce();
  await seedAboutContentOnce();
  app.locals.adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
}

export function initializeServer(app) {
  if (!initialization) initialization = initialize(app);

  const currentInitialization = initialization;
  return currentInitialization.catch((error) => {
    if (initialization === currentInitialization) initialization = undefined;
    throw error;
  });
}

import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import app from "./app.js";
import { seedAboutContentOnce } from "./services/seedAboutContent.js";
import { seedSiteContentOnce } from "./services/seedSiteContent.js";
import { seedServicesOnce } from "./services/seedServices.js";

const port = Number(process.env.PORT ?? 5000);
const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;

if (!mongoUri) {
  throw new Error("MONGODB_URI must be set in the server environment.");
}
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in the server environment.");
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.ADMIN_EMAIL.trim())) {
  throw new Error("ADMIN_EMAIL must be a valid email address.");
}
if (process.env.ADMIN_PASSWORD.length < 12) {
  throw new Error("ADMIN_PASSWORD must be at least 12 characters long.");
}
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters.");
}

await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
await seedServicesOnce();
await seedSiteContentOnce();
await seedAboutContentOnce();
app.locals.adminPasswordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

app.listen(port, () => {
  console.log(`SUPERX API listening on port ${port}`);
});

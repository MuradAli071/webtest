import ContentSetting from "../models/ContentSetting.js";
import Service from "../models/Service.js";
import { defaultServices } from "./defaultServices.js";

const seedMarker = "initial-services-v1";

export async function seedServicesOnce() {
  const seeded = await ContentSetting.exists({ key: seedMarker });
  if (seeded) return;

  const serviceCount = await Service.countDocuments();
  if (serviceCount === 0) {
    await Service.insertMany(defaultServices);
  }

  await ContentSetting.create({ key: seedMarker, value: new Date().toISOString() });
}

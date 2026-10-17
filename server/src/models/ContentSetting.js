import mongoose from "mongoose";

const contentSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
});

export default mongoose.model("ContentSetting", contentSettingSchema);

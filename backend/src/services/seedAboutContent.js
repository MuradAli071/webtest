import AboutContent from "../models/AboutContent.js";
import ContentSetting from "../models/ContentSetting.js";
import { defaultAboutSections } from "./defaultAboutContent.js";

const seedMarker = "initial-about-content-v1";

function hasAboutCopy(sections = []) {
  return sections.some((section) => (
    section.title ||
    section.body ||
    section.missionBody ||
    section.visionBody ||
    section.steps?.some((step) => step.title || step.description) ||
    section.members?.length ||
    section.achievements?.length
  ));
}

export async function seedAboutContentOnce() {
  if (await ContentSetting.exists({ key: seedMarker })) return;

  const content = await AboutContent.findOne({ key: "about" });
  if (!content) {
    await AboutContent.create({ key: "about", sections: defaultAboutSections });
  } else if (!hasAboutCopy(content.sections)) {
    content.sections = defaultAboutSections;
    await content.save();
  }

  await ContentSetting.create({ key: seedMarker, value: new Date().toISOString() });
}

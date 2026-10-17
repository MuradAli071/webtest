import test from "node:test";
import assert from "node:assert/strict";
import { validateSiteContent } from "../src/routes/adminSite.js";
import { toPublicSiteContent } from "../src/routes/site.js";
import { defaultSiteContent } from "../src/services/defaultSiteContent.js";

const validContent = {
  brand: { name: "SUPERX", tagline: "", logoUrl: "" },
  navigation: [{ label: "Services", href: "/services", visible: true }],
  homepage: {
    hero: {
      visible: true,
      title: "Heading",
      primaryAction: "Contact",
      primaryHref: "/#contact",
    },
  },
  testimonials: [{
    quote: "Approved quotation.",
    name: "Approved person",
    role: "",
    company: "",
    published: false,
    order: 0,
  }],
  faqs: [{
    question: "Question?",
    answer: "Approved answer.",
    published: false,
    order: 0,
  }],
  contact: {
    email: "contact@example.com",
    phone: "",
    whatsapp: "",
    address: "",
    socialLinks: [{ label: "Professional network", url: "https://example.com/profile" }],
  },
  legal: { privacyPolicy: "", terms: "" },
  seo: {
    title: "",
    description: "",
    imageUrl: "",
    imagePublicId: "",
    pages: {
      home: { title: "SUPERX | Digital technology", description: "Configured homepage description." },
    },
  },
};

test("site content accepts editable sections and returns validated data", () => {
  const result = validateSiteContent(validContent);
  assert.equal(result.error, undefined);
  assert.equal(result.value.homepage.hero.primaryHref, "/#contact");
  assert.equal(result.value.testimonials[0].published, false);
});

test("starter site content validates and uses private contact blanks and an unpublished testimonial draft", () => {
  const { key: _key, ...editableContent } = defaultSiteContent;
  const result = validateSiteContent(editableContent);
  assert.equal(result.error, undefined);
  assert.deepEqual(result.value.contact, {
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
    socialLinks: [],
  });
  assert.ok(result.value.faqs.length > 0);
  assert.equal(result.value.testimonials[0].published, false);
});

test("site content rejects unsupported fields and unsafe links", () => {
  assert.match(validateSiteContent({ ...validContent, adminPassword: "secret" }).error, /Unsupported site content field/);
  assert.match(validateSiteContent({
    ...validContent,
    homepage: { hero: { primaryHref: "javascript:alert(1)" } },
  }).error, /safe internal path/);
  assert.match(validateSiteContent({
    ...validContent,
    contact: { ...validContent.contact, socialLinks: [{ label: "Profile", url: "javascript:alert(1)" }] },
  }).error, /safe internal path/);
});

test("FAQs and testimonials require explicit publication and unique ordering", () => {
  assert.match(validateSiteContent({
    ...validContent,
    faqs: [{ question: "Question?", answer: "Answer.", order: 0 }],
  }).error, /publication status/);
  assert.match(validateSiteContent({
    ...validContent,
    faqs: [
      { question: "One?", answer: "One.", published: true, order: 0 },
      { question: "Two?", answer: "Two.", published: true, order: 0 },
    ],
  }).error, /order values must be unique/);
});

test("contact email and policy size are validated", () => {
  assert.match(validateSiteContent({
    ...validContent,
    contact: { ...validContent.contact, email: "not-an-email" },
  }).error, /valid email/);
  assert.match(validateSiteContent({
    ...validContent,
    legal: { privacyPolicy: "x".repeat(30001), terms: "" },
  }).error, /30000 characters/);
});

test("site image references, WhatsApp number and SEO fields are validated", () => {
  const media = validateSiteContent({
    ...validContent,
    brand: {
      name: "SUPERX",
      logoUrl: "https://res.cloudinary.com/example/image/upload/logo.png",
      logoPublicId: "superx/site/brand/logo",
      faviconUrl: "",
      faviconPublicId: "",
    },
    homepage: {
      hero: {
        visible: true,
        imageUrl: "https://res.cloudinary.com/example/image/upload/hero.png",
        imagePublicId: "superx/site/homepage/hero",
        imageAlt: "Digital workspace",
      },
    },
    contact: { ...validContent.contact, whatsapp: "+1 (234) 567-8901" },
    seo: {
      title: "SUPERX | Digital products",
      description: "Design and technology services.",
      imageUrl: "https://res.cloudinary.com/example/image/upload/social.png",
      imagePublicId: "superx/site/homepage/social",
    },
  });
  assert.equal(media.error, undefined);
  assert.equal(media.value.homepage.hero.imageAlt, "Digital workspace");
  assert.equal(media.value.contact.whatsapp, "+1 (234) 567-8901");
  assert.match(validateSiteContent({
    ...validContent,
    brand: { name: "SUPERX", logoUrl: "javascript:alert(1)" },
  }).error, /safe internal path or HTTP\(S\) URL/);
  assert.match(validateSiteContent({
    ...validContent,
    brand: { name: "SUPERX", logoUrl: "https://example.com/logo.png", logoPublicId: "superx/portfolio/logo" },
  }).error, /uploaded for this setting/);
  assert.match(validateSiteContent({
    ...validContent,
    seo: { description: "x".repeat(321) },
  }).error, /320 characters/);
  assert.match(validateSiteContent({
    ...validContent,
    seo: { pages: { about: { title: "x".repeat(181) } } },
  }).error, /180 characters/);
  assert.match(validateSiteContent({
    ...validContent,
    seo: { pages: { custom: { title: "Invalid page" } } },
  }).error, /unsupported page/);
});

test("public website content omits drafts and private or unknown fields", () => {
  const result = toPublicSiteContent({
    brand: { name: "SUPERX", adminPassword: "must-not-leak" },
    homepage: { hero: { visible: false, title: "Public title", hiddenDraftField: "must-not-leak" } },
    navigation: [
      { label: "Visible", href: "/visible", visible: true },
      { label: "Hidden", href: "/hidden", visible: false },
    ],
    testimonials: [
      { quote: "Draft", name: "Draft person", published: false, order: 0 },
      { quote: "Approved", name: "Approved person", published: true, order: 1 },
    ],
    faqs: [
      { question: "Draft?", answer: "Hidden.", published: false, order: 0 },
      { question: "Public?", answer: "Visible.", published: true, order: 1 },
    ],
    contact: { email: "public@example.com" },
    legal: { privacyPolicy: "Public policy", terms: "" },
    seo: {
      title: "Homepage title",
      description: "Homepage description",
      imageUrl: "https://cdn.example/share.png",
      pages: { about: { title: "About title", description: "About description" } },
      hidden: "must-not-leak",
    },
    adminPassword: "must-not-leak",
    secret: "must-not-leak",
  });
  assert.deepEqual(result.navigation.map((item) => item.label), ["Visible"]);
  assert.deepEqual(result.testimonials.map((item) => item.name), ["Approved person"]);
  assert.deepEqual(result.faqs.map((item) => item.question), ["Public?"]);
  assert.equal(result.legalAvailable.privacyPolicy, true);
  assert.deepEqual(result.seo.pages.about, { title: "About title", description: "About description" });
  assert.equal("hidden" in result.seo, false);
  assert.equal("legal" in result, false);
  assert.equal("adminPassword" in result, false);
  assert.equal("adminPassword" in result.brand, false);
  assert.equal("hiddenDraftField" in result.homepage.hero, false);
  assert.equal(result.homepage.hero.visible, false);
});

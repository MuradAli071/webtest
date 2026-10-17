import mongoose from "mongoose";

const navigationItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 60 },
    href: { type: String, required: true, trim: true, maxlength: 300 },
    visible: { type: Boolean, default: true },
  },
  { _id: false },
);

const qaSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 240 },
    answer: { type: String, required: true, trim: true, maxlength: 2400 },
    published: { type: Boolean, default: false },
    order: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const testimonialSchema = new mongoose.Schema(
  {
    quote: { type: String, required: true, trim: true, maxlength: 2000 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, trim: true, default: "", maxlength: 120 },
    company: { type: String, trim: true, default: "", maxlength: 140 },
    published: { type: Boolean, default: false },
    order: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const pageSeoSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "", maxlength: 180 },
    description: { type: String, trim: true, default: "", maxlength: 320 },
  },
  { _id: false },
);

const socialLinkSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 60 },
    url: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { _id: false },
);

const homepageSchema = new mongoose.Schema(
  {
    hero: {
      visible: { type: Boolean, default: true },
      eyebrow: { type: String, trim: true, default: "", maxlength: 100 },
      title: { type: String, trim: true, default: "", maxlength: 180 },
      titleAccent: { type: String, trim: true, default: "", maxlength: 180 },
      description: { type: String, trim: true, default: "", maxlength: 1500 },
      primaryAction: { type: String, trim: true, default: "", maxlength: 80 },
      primaryHref: { type: String, trim: true, default: "", maxlength: 1000 },
      secondaryAction: { type: String, trim: true, default: "", maxlength: 80 },
      secondaryHref: { type: String, trim: true, default: "", maxlength: 1000 },
      footnote: { type: String, trim: true, default: "", maxlength: 200 },
      imageUrl: { type: String, trim: true, default: "", maxlength: 1000 },
      imagePublicId: { type: String, trim: true, default: "", maxlength: 255 },
      imageAlt: { type: String, trim: true, default: "", maxlength: 240 },
    },
    services: {
      visible: { type: Boolean, default: true },
      eyebrow: { type: String, trim: true, default: "", maxlength: 100 },
      title: { type: String, trim: true, default: "", maxlength: 180 },
      titleAccent: { type: String, trim: true, default: "", maxlength: 180 },
      description: { type: String, trim: true, default: "", maxlength: 1000 },
      viewAllLabel: { type: String, trim: true, default: "", maxlength: 80 },
    },
    work: {
      visible: { type: Boolean, default: true },
      eyebrow: { type: String, trim: true, default: "", maxlength: 100 },
      title: { type: String, trim: true, default: "", maxlength: 180 },
      titleAccent: { type: String, trim: true, default: "", maxlength: 180 },
      description: { type: String, trim: true, default: "", maxlength: 1000 },
      viewAllLabel: { type: String, trim: true, default: "", maxlength: 80 },
    },
    about: {
      visible: { type: Boolean, default: true },
    },
    testimonials: {
      visible: { type: Boolean, default: true },
      eyebrow: { type: String, trim: true, default: "", maxlength: 100 },
      title: { type: String, trim: true, default: "", maxlength: 180 },
      titleAccent: { type: String, trim: true, default: "", maxlength: 180 },
    },
    faqs: {
      visible: { type: Boolean, default: true },
      eyebrow: { type: String, trim: true, default: "", maxlength: 100 },
      title: { type: String, trim: true, default: "", maxlength: 180 },
      titleAccent: { type: String, trim: true, default: "", maxlength: 180 },
      description: { type: String, trim: true, default: "", maxlength: 1000 },
    },
    contact: {
      visible: { type: Boolean, default: true },
      eyebrow: { type: String, trim: true, default: "", maxlength: 100 },
      title: { type: String, trim: true, default: "", maxlength: 180 },
      titleAccent: { type: String, trim: true, default: "", maxlength: 180 },
      description: { type: String, trim: true, default: "", maxlength: 1000 },
      buttonLabel: { type: String, trim: true, default: "", maxlength: 80 },
    },
  },
  { _id: false },
);

const siteContentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "site" },
    brand: {
      name: { type: String, trim: true, default: "SUPERX", maxlength: 80 },
      tagline: { type: String, trim: true, default: "", maxlength: 240 },
      logoUrl: { type: String, trim: true, default: "", maxlength: 1000 },
      logoPublicId: { type: String, trim: true, default: "", maxlength: 255 },
      faviconUrl: { type: String, trim: true, default: "", maxlength: 1000 },
      faviconPublicId: { type: String, trim: true, default: "", maxlength: 255 },
    },
    navigation: {
      type: [navigationItemSchema],
      default: [],
      validate: [(items) => items.length <= 12, "At most 12 navigation items are allowed."],
    },
    homepage: { type: homepageSchema, default: () => ({}) },
    testimonials: {
      type: [testimonialSchema],
      default: [],
      validate: [(items) => items.length <= 60, "At most 60 testimonials are allowed."],
    },
    faqs: {
      type: [qaSchema],
      default: [],
      validate: [(items) => items.length <= 60, "At most 60 FAQs are allowed."],
    },
    contact: {
      email: { type: String, trim: true, default: "", maxlength: 254 },
      phone: { type: String, trim: true, default: "", maxlength: 40 },
      whatsapp: { type: String, trim: true, default: "", maxlength: 24 },
      address: { type: String, trim: true, default: "", maxlength: 500 },
      socialLinks: {
        type: [socialLinkSchema],
        default: [],
        validate: [(items) => items.length <= 20, "At most 20 social links are allowed."],
      },
    },
    legal: {
      privacyPolicy: { type: String, trim: true, default: "", maxlength: 30000 },
      terms: { type: String, trim: true, default: "", maxlength: 30000 },
    },
    seo: {
      title: { type: String, trim: true, default: "", maxlength: 180 },
      description: { type: String, trim: true, default: "", maxlength: 320 },
      imageUrl: { type: String, trim: true, default: "", maxlength: 1000 },
      imagePublicId: { type: String, trim: true, default: "", maxlength: 255 },
      pages: {
        home: { type: pageSeoSchema, default: () => ({}) },
        about: { type: pageSeoSchema, default: () => ({}) },
        contact: { type: pageSeoSchema, default: () => ({}) },
        services: { type: pageSeoSchema, default: () => ({}) },
        work: { type: pageSeoSchema, default: () => ({}) },
        privacy: { type: pageSeoSchema, default: () => ({}) },
        terms: { type: pageSeoSchema, default: () => ({}) },
      },
    },
  },
  { timestamps: true },
);

export default mongoose.model("SiteContent", siteContentSchema);

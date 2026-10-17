import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import Enquiry from "../models/Enquiry.js";
import { sendEnquiryNotification } from "../services/emailNotifications.js";

const router = Router();
const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many enquiries from this network. Please try again later." },
});

function cleanText(value, field, maxLength, required = false) {
  if (typeof value !== "string" || (required && !value.trim())) {
    return { error: `${field} must be ${required ? "a non-empty " : "a "}string.` };
  }
  const clean = value.trim();
  if (clean.length > maxLength) return { error: `${field} must be ${maxLength} characters or fewer.` };
  return { value: clean };
}

export function validateEnquiryInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "An enquiry object is required." };
  const allowed = new Set(["type", "name", "email", "company", "phone", "service", "message", "website"]);
  const unknown = Object.keys(input).filter((key) => !allowed.has(key));
  if (unknown.length) return { error: `Unsupported enquiry field: ${unknown.join(", ")}.` };
  if (input.website !== undefined && (typeof input.website !== "string" || input.website.trim())) {
    return { error: "The enquiry could not be accepted. Please try again." };
  }
  const type = input.type ?? "contact";
  if (!["contact", "project"].includes(type)) return { error: "type must be contact or project." };
  const name = cleanText(input.name, "name", 120, true);
  const email = cleanText(input.email, "email", 254, true);
  const company = cleanText(input.company ?? "", "company", 160);
  const phone = cleanText(input.phone ?? "", "phone", 40);
  const service = cleanText(input.service ?? "", "service", 120);
  const message = cleanText(input.message, "message", 6000, true);
  for (const field of [name, email, company, phone, service, message]) if (field.error) return field;
  if (message.value.length < 10) return { error: "message must be at least 10 characters." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) return { error: "email must be a valid email address." };
  if (phone.value && !/^\+?[0-9 ()-]{7,40}$/.test(phone.value)) return { error: "phone must contain a valid phone number." };
  return {
    value: {
      type,
      name: name.value,
      email: email.value.toLowerCase(),
      company: company.value,
      phone: phone.value,
      service: service.value,
      message: message.value,
    },
  };
}

router.post("/", enquiryLimiter, async (request, response) => {
  const result = validateEnquiryInput(request.body);
  if (result.error) return response.status(400).json({ error: result.error });
  const enquiry = await Enquiry.create(result.value);
  let notification = "not_configured";
  try {
    const result = await sendEnquiryNotification(enquiry);
    if (result.sent) notification = "sent";
  } catch (error) {
    notification = "failed";
    console.error("Enquiry was stored, but email notification failed:", error.message);
  }
  return response.status(201).json({ received: true, notification });
});

export default router;

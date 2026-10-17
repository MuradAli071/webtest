import test from "node:test";
import assert from "node:assert/strict";
import { validateEnquiryInput } from "../src/routes/enquiries.js";

test("contact and project enquiries accept bounded public fields only", () => {
  const result = validateEnquiryInput({
    name: "  Example Person ",
    email: "PERSON@example.com",
    type: "project",
    company: "Example Company",
    phone: "",
    service: "Website development",
    message: "Please contact me about a project.",
  });
  assert.equal(result.error, undefined);
  assert.equal(result.value.name, "Example Person");
  assert.equal(result.value.email, "person@example.com");
  assert.equal(result.value.type, "project");
});

test("enquiries reject invalid addresses, oversized content, and private status fields", () => {
  assert.match(validateEnquiryInput({
    name: "Person", email: "invalid", message: "A long enough message",
  }).error, /valid email/);
  assert.match(validateEnquiryInput({
    name: "Person", email: "person@example.com", message: "x".repeat(6001),
  }).error, /6000 characters/);
  assert.match(validateEnquiryInput({
    name: "Person", email: "person@example.com", message: "A long enough message", status: "archived",
  }).error, /Unsupported enquiry field/);
  assert.match(validateEnquiryInput({
    name: "Person", email: "person@example.com", message: "A long enough message", type: "spam",
  }).error, /type must be contact or project/);
});

test("enquiries validate message length, optional phone, and honeypot", () => {
  const base = { name: "Person", email: "person@example.com", message: "A valid project request." };
  assert.match(validateEnquiryInput({ ...base, message: "Too short" }).error, /at least 10 characters/);
  assert.match(validateEnquiryInput({ ...base, phone: "call me maybe" }).error, /valid phone number/);
  assert.match(validateEnquiryInput({ ...base, website: "https://spam.example" }).error, /could not be accepted/);
  assert.equal(validateEnquiryInput({ ...base, website: "" }).error, undefined);
});

import test from "node:test";
import assert from "node:assert/strict";
import { sendEnquiryNotification } from "../src/services/emailNotifications.js";

const smtpKeys = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_FROM_EMAIL",
  "ENQUIRY_NOTIFICATION_EMAIL",
  "SMTP_USER",
  "SMTP_PASSWORD",
];

function isolateSmtpEnvironment(t) {
  const previous = Object.fromEntries(smtpKeys.map((key) => [key, process.env[key]]));
  for (const key of smtpKeys) delete process.env[key];
  t.after(() => {
    for (const key of smtpKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
}

test("email notifications remain disabled when SMTP is not configured", async (t) => {
  isolateSmtpEnvironment(t);
  assert.deepEqual(await sendEnquiryNotification({}), { configured: false, sent: false });
});

test("partial SMTP configuration returns an explicit error", async (t) => {
  isolateSmtpEnvironment(t);
  process.env.SMTP_HOST = "smtp.example.com";
  await assert.rejects(
    sendEnquiryNotification({}),
    /Email notifications are partially configured/,
  );
});

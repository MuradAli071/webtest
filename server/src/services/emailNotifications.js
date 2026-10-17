import nodemailer from "nodemailer";

function getSmtpConfiguration() {
  const keys = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_FROM_EMAIL",
    "ENQUIRY_NOTIFICATION_EMAIL",
  ];
  const configuredCount = keys.filter((key) => Boolean(process.env[key]?.trim())).length;
  if (configuredCount === 0) return null;
  if (configuredCount !== keys.length) {
    throw new Error("Email notifications are partially configured. Set SMTP_HOST, SMTP_PORT, SMTP_FROM_EMAIL and ENQUIRY_NOTIFICATION_EMAIL.");
  }

  const port = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port.");
  }
  if (Boolean(process.env.SMTP_USER) !== Boolean(process.env.SMTP_PASSWORD)) {
    throw new Error("SMTP_USER and SMTP_PASSWORD must either both be set or both be empty.");
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(process.env.SMTP_FROM_EMAIL) || !emailPattern.test(process.env.ENQUIRY_NOTIFICATION_EMAIL)) {
    throw new Error("SMTP_FROM_EMAIL and ENQUIRY_NOTIFICATION_EMAIL must be valid email addresses.");
  }

  return {
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    from: process.env.SMTP_FROM_EMAIL,
    to: process.env.ENQUIRY_NOTIFICATION_EMAIL,
  };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export async function sendEnquiryNotification(enquiry) {
  const config = getSmtpConfiguration();
  if (!config) return { configured: false, sent: false };

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
  const text = [
    `New ${enquiry.type} enquiry for SUPERX Technology`,
    "",
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Phone: ${enquiry.phone || "Not provided"}`,
    `Service of interest: ${enquiry.service || "Not provided"}`,
    "",
    "Project message:",
    enquiry.message,
  ].join("\n");
  const html = [
    `<h1>New ${escapeHtml(enquiry.type)} enquiry for SUPERX Technology</h1>`,
    `<p><strong>Name:</strong> ${escapeHtml(enquiry.name)}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(enquiry.email)}</p>`,
    `<p><strong>Phone:</strong> ${escapeHtml(enquiry.phone || "Not provided")}</p>`,
    `<p><strong>Service of interest:</strong> ${escapeHtml(enquiry.service || "Not provided")}</p>`,
    `<h2>Project message</h2>`,
    `<p>${escapeHtml(enquiry.message).replace(/\r?\n/g, "<br>")}</p>`,
  ].join("");
  const result = await transport.sendMail({
    from: config.from,
    to: config.to,
    replyTo: enquiry.email,
    subject: `New SUPERX ${enquiry.type} enquiry`,
    text,
    html,
  });
  if (!result.accepted?.length) throw new Error("The email provider did not confirm acceptance of the enquiry notification.");
  return { configured: true, sent: true };
}

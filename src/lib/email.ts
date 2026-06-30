// src/lib/email.ts
// Sends emails via Gmail SMTP using Nodemailer.
// Requires a Gmail "App Password" (not your regular password) —
// Google blocks plain password auth for SMTP.
//
// Setup: Gmail account → Manage Google Account → Security →
// 2-Step Verification (must be ON) → App Passwords → generate one for "Mail"

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

interface SendOtpEmailParams {
  to: string;
  code: string;
  eventName: string;
  tenantName: string;
}

export async function sendOtpEmail({ to, code, eventName, tenantName }: SendOtpEmailParams) {
  await transporter.sendMail({
    from: `"${tenantName}" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Your verification code: ${code}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <p style="font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px;">
          ${tenantName}
        </p>
        <h2 style="font-size: 20px; color: #111827; margin: 0 0 16px;">
          Join "${eventName}"
        </h2>
        <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 24px;">
          Enter this code to verify your email and join the event:
        </p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #6366f1;">
            ${code}
          </span>
        </div>
        <p style="font-size: 12.5px; color: #9ca3af; line-height: 1.6;">
          This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

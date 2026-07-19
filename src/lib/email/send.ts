import nodemailer from 'nodemailer';

const globalMailer = globalThis as typeof globalThis & {
  ilmMailer?: ReturnType<typeof nodemailer.createTransport>;
};

export function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      process.env.EMAIL_FROM
  );
}

function getTransporter() {
  if (!isEmailConfigured()) throw new Error('SMTP email service is not configured');
  if (globalMailer.ilmMailer) return globalMailer.ilmMailer;

  const port = Number(process.env.SMTP_PORT || 587);
  globalMailer.ilmMailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    requireTLS: port !== 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  return globalMailer.ilmMailer;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error('EMAIL_FROM is not configured');
  const result = await getTransporter().sendMail({ from, ...params });
  return { messageId: result.messageId };
}

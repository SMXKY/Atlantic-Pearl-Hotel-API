import * as nodemailer from "nodemailer";

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html: string
) => {
  const transporter = nodemailer.createTransport({
    service: String(process.env.EMAIL_SERVICE),
    auth: {
      user: String(process.env.EMAIL_AUTH_USER),
      pass: String(process.env.EMAIL_AUTH_PASSWORD),
    },
  });

  const mailOptions = {
    from: `"Atlantic Pearl Hotel and Resort" <${process.env.EMAIL_AUTH_USER}>`,
    to,
    subject,
    text,
    html,
  };

  await transporter.sendMail(mailOptions);
};

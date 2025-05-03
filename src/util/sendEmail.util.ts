import * as nodemailer from "nodemailer";

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html: string
) => {
  if (process.env.NODE_ENV == "production") {
    const transporter = nodemailer.createTransport({
      service: String(process.env.EMAIL_SERVICE),
      auth: {
        user: String(process.env.EMAIL_AUTH_USER),
        pass: String(process.env.EMAIL_AUTH_PASSWORD),
      },
      tls: {
        rejectUnauthorized: false, // Disable certificate validation (insecure)
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_AUTH_USER,
      to,
      subject,
      text,
      html,
    };

    await transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log("Error:", error);
      }
      console.log("Email sent successfully!");
      console.log("Message ID:", info.messageId);
      console.log("Full info:", info);
    });

    console.log(`Email sent to ${to} successfully.`);
  } else {
    const transporter = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 587,
      auth: {
        user: process.env.MAILTRAP_USERNAME,
        pass: process.env.MAILTRAP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // 👈 Allow self-signed certs
      },
    });

    const sendEmail = async () => {
      const sender = '"Atlantic Pearl" <no-reply@atlanticpearl.com>';
      const recipients = ["smookeymykomhr@gmail.com"];

      const info = await transporter.sendMail({
        from: sender,
        to: recipients,
        subject,
        text,
        html,
      });

      console.log("Message sent: %s", info.messageId);
    };

    sendEmail().catch(console.error);
  }
};

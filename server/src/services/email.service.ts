import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export const resend = new Resend(RESEND_API_KEY);

export const sendPremiumConfirmationEmail = async (
  userEmail: string,
  userName: string
) => {
  try {
    await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: userEmail,
      subject: "Bem-vindo ao Premium",
      html: `<p>Olá ${userName},</p><p>Bem-vindo ao Premium. Você agora é um usuário Premium!</p>`,
    });
  } catch (error) {
    console.error(error);
  }
};

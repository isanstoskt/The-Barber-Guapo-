require("dotenv").config();

const nodemailer = require("nodemailer");

const emailUsuario = process.env.EMAIL_USER;
const emailSenhaApp = process.env.EMAIL_APP_PASSWORD;
const nomeRemetente =
  process.env.EMAIL_FROM_NAME || "Guapo The Barber";

if (!emailUsuario || !emailSenhaApp) {
  console.error(
    "Erro: EMAIL_USER ou EMAIL_APP_PASSWORD não estão configurados no arquivo .env."
  );

  process.exit(1);
}

const transportador = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: emailUsuario,
    pass: emailSenhaApp
  }
});

async function testarEmail() {
  try {
    console.log("Verificando conexão com o Gmail...");

    await transportador.verify();

    console.log("Conexão com o Gmail aprovada!");

    const resultado = await transportador.sendMail({
      from: `"${nomeRemetente}" <${emailUsuario}>`,

      // Envia para o próprio e-mail neste primeiro teste
      to: emailUsuario,

      subject: "Teste de e-mail - Guapo The Barber",

      text: `
Olá!

Este é um teste de envio de e-mail do sistema Guapo The Barber.

A integração com o Gmail e o Nodemailer está funcionando.
      `.trim(),

      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Guapo The Barber</h2>

          <p>Olá!</p>

          <p>
            Este é um teste de envio de e-mail do sistema
            <strong>Guapo The Barber</strong>.
          </p>

          <p>
            A integração com o Gmail e o Nodemailer está funcionando.
          </p>
        </div>
      `
    });

    console.log("E-mail de teste enviado com sucesso!");
    console.log("ID da mensagem:", resultado.messageId);

    process.exit(0);

  } catch (erro) {
    console.error("Erro ao enviar o e-mail:");

    console.error(
      erro.response ||
      erro.message ||
      erro
    );

    process.exit(1);
  }
}

testarEmail();
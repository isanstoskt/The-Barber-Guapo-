require("dotenv").config();

const nodemailer = require("nodemailer");

const emailUsuario =
  process.env.EMAIL_USER;

const emailSenhaApp =
  process.env.EMAIL_APP_PASSWORD;

const nomeRemetente =
  process.env.EMAIL_FROM_NAME ||
  "Guapo The Barber";

const transportador =
  nodemailer.createTransport({
    service: "gmail",

    auth: {
      user: emailUsuario,
      pass: emailSenhaApp
    }
  });

function escaparHTML(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatarData(data) {
  if (!data) {
    return "Data não informada";
  }

  const dataISO =
    String(data).split("T")[0];

  const partes =
    dataISO.split("-");

  if (partes.length !== 3) {
    return dataISO;
  }

  return (
    `${partes[2]}/` +
    `${partes[1]}/` +
    `${partes[0]}`
  );
}

async function enviarEmail({
  para,
  assunto,
  texto,
  html
}) {
  if (
    !emailUsuario ||
    !emailSenhaApp
  ) {
    console.warn(
      "E-mail não enviado: EMAIL_USER ou EMAIL_APP_PASSWORD não configurados."
    );

    return false;
  }

  if (!para) {
    console.warn(
      "E-mail não enviado: cliente sem endereço de e-mail."
    );

    return false;
  }

  try {
    const resultado =
      await transportador.sendMail({
        from:
          `"${nomeRemetente}" <${emailUsuario}>`,

        to: para,
        subject: assunto,
        text: texto,
        html: html
      });

    console.log(
      `E-mail enviado para ${para}:`,
      resultado.messageId
    );

    return true;

  } catch (erro) {
    /*
      O erro de e-mail não derruba o agendamento
      nem o chat. Ele apenas aparece no terminal.
    */
    console.error(
      `Erro ao enviar e-mail para ${para}:`,
      erro.response ||
      erro.message ||
      erro
    );

    return false;
  }
}

async function enviarEmailAgendamento({
  para,
  nome,
  status,
  data,
  horario,
  servicos
}) {
  const dataFormatada =
    formatarData(data);

  let assunto =
    "Atualização do seu agendamento";

  let mensagemPrincipal =
    `O status do seu agendamento foi atualizado para ${status}.`;

  if (
    status ===
    "Aguardando confirmação"
  ) {
    assunto =
      "Recebemos seu agendamento";

    mensagemPrincipal =
      "Recebemos sua solicitação de agendamento. Agora aguarde a confirmação do Guapo.";
  }

  if (status === "Confirmado") {
    assunto =
      "Seu agendamento foi confirmado";

    mensagemPrincipal =
      "Boa notícia! Seu agendamento foi confirmado.";
  }

  if (status === "Cancelado") {
    assunto =
      "Seu agendamento foi cancelado";

    mensagemPrincipal =
      "Seu agendamento foi cancelado.";
  }

  if (status === "Removido") {
    assunto =
      "Seu agendamento foi removido";

    mensagemPrincipal =
      "Seu agendamento foi removido do sistema.";
  }

  const nomeSeguro =
    escaparHTML(nome || "cliente");

  const servicosSeguros =
    escaparHTML(
      servicos || "Serviço não informado"
    );

  const mensagemSegura =
    escaparHTML(mensagemPrincipal);

  return enviarEmail({
    para: para,

    assunto:
      `${assunto} - Guapo The Barber`,

    texto: `
Olá, ${nome || "cliente"}!

${mensagemPrincipal}

Serviço: ${servicos || "Não informado"}
Data: ${dataFormatada}
Horário: ${horario || "Não informado"}
Status: ${status}

Guapo The Barber
    `.trim(),

    html: `
      <div
        style="
          max-width: 600px;
          margin: 0 auto;
          padding: 30px;
          background: #111111;
          color: #ffffff;
          font-family: Arial, sans-serif;
          border-radius: 16px;
        "
      >
        <div
          style="
            text-align: center;
            margin-bottom: 28px;
          "
        >
          <h1
            style="
              margin: 0;
              color: #d4af37;
            "
          >
            Guapo
          </h1>

          <p
            style="
              margin: 5px 0 0;
              color: #cccccc;
            "
          >
            The Barber
          </p>
        </div>

        <p>
          Olá,
          <strong>${nomeSeguro}</strong>!
        </p>

        <p
          style="
            font-size: 17px;
            line-height: 1.6;
          "
        >
          ${mensagemSegura}
        </p>

        <div
          style="
            margin-top: 24px;
            padding: 20px;
            background: #222222;
            border-radius: 12px;
            border-left: 4px solid #d4af37;
          "
        >
          <p>
            <strong>Serviço:</strong>
            ${servicosSeguros}
          </p>

          <p>
            <strong>Data:</strong>
            ${dataFormatada}
          </p>

          <p>
            <strong>Horário:</strong>
            ${escaparHTML(
              horario || "Não informado"
            )}
          </p>

          <p>
            <strong>Status:</strong>
            ${escaparHTML(status)}
          </p>
        </div>

        <p
          style="
            margin-top: 28px;
            color: #bbbbbb;
            font-size: 13px;
          "
        >
          Esta é uma mensagem automática do
          Guapo The Barber.
        </p>
      </div>
    `
  });
}

async function enviarEmailNovaMensagem({
  para,
  nome,
  mensagem
}) {
  const previa =
    String(mensagem || "").length > 180
      ? `${String(mensagem).slice(0, 177)}...`
      : String(mensagem || "");

  return enviarEmail({
    para: para,

    assunto:
      "Você recebeu uma nova mensagem do Guapo",

    texto: `
Olá, ${nome || "cliente"}!

O Guapo respondeu sua mensagem:

${previa}

Entre na sua área do cliente para abrir a conversa.

Guapo The Barber
    `.trim(),

    html: `
      <div
        style="
          max-width: 600px;
          margin: 0 auto;
          padding: 30px;
          background: #111111;
          color: #ffffff;
          font-family: Arial, sans-serif;
          border-radius: 16px;
        "
      >
        <div
          style="
            text-align: center;
            margin-bottom: 28px;
          "
        >
          <h1
            style="
              margin: 0;
              color: #d4af37;
            "
          >
            Guapo
          </h1>

          <p
            style="
              margin: 5px 0 0;
              color: #cccccc;
            "
          >
            The Barber
          </p>
        </div>

        <p>
          Olá,
          <strong>
            ${escaparHTML(nome || "cliente")}
          </strong>!
        </p>

        <p>
          O Guapo respondeu sua mensagem:
        </p>

        <div
          style="
            margin: 22px 0;
            padding: 18px;
            background: #222222;
            border-radius: 12px;
            border-left: 4px solid #d4af37;
            line-height: 1.6;
          "
        >
          ${escaparHTML(previa)}
        </div>

        <p>
          Entre na sua área do cliente para
          abrir a conversa completa.
        </p>

        <p
          style="
            margin-top: 28px;
            color: #bbbbbb;
            font-size: 13px;
          "
        >
          Esta é uma mensagem automática do
          Guapo The Barber.
        </p>
      </div>
    `
  });
}

module.exports = {
  enviarEmailAgendamento,
  enviarEmailNovaMensagem
};
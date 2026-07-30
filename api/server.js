require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const conexao = require("./db");

const {
  enviarEmailAgendamento,
  enviarEmailNovaMensagem
} = require("./emailService");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BCRYPT_ROUNDS = 10;

const STATUS_PERMITIDOS = [
  "Aguardando confirmação",
  "Confirmado",
  "Cancelado"
];

const transportadorRecuperacao =
  nodemailer.createTransport({
    service: "gmail",

    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  });

// =========================
// FUNÇÕES AUXILIARES
// =========================

function normalizarEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function senhaEstaCriptografada(senha) {
  return /^\$2[aby]\$\d{2}\$/.test(
    String(senha || "")
  );
}

function gerarCodigoRecuperacao() {
  return String(
    crypto.randomInt(100000, 1000000)
  );
}

function escaparHTMLServidor(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatarDataBR(data) {
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

function resumirTexto(
  texto,
  limite = 140
) {
  const conteudo =
    String(texto || "").trim();

  if (conteudo.length <= limite) {
    return conteudo;
  }

  return `${conteudo.slice(0, limite - 3)}...`;
}

async function criarNotificacao({
  usuarioId,
  tipo,
  titulo,
  mensagem,
  referenciaId = null
}) {
  if (!usuarioId) {
    return;
  }

  await conexao.query(
    `
      INSERT INTO notificacoes (
        usuario_id,
        tipo,
        titulo,
        mensagem,
        referencia_id,
        lida
      )
      VALUES (?, ?, ?, ?, ?, false)
    `,
    [
      usuarioId,
      tipo,
      titulo,
      mensagem,
      referenciaId
    ]
  );
}

async function enviarCodigoRecuperacao({
  para,
  nome,
  codigo
}) {
  if (
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_APP_PASSWORD
  ) {
    throw new Error(
      "Credenciais de e-mail não configuradas."
    );
  }

  const nomeRemetente =
    process.env.EMAIL_FROM_NAME ||
    "Guapo The Barber";

  const nomeSeguro =
    escaparHTMLServidor(
      nome || "cliente"
    );

  const codigoSeguro =
    escaparHTMLServidor(codigo);

  await transportadorRecuperacao.sendMail({
    from:
      `"${nomeRemetente}" <${process.env.EMAIL_USER}>`,

    to: para,

    subject:
      "Código para redefinir sua senha - Guapo The Barber",

    text: `
Olá, ${nome || "cliente"}!

Seu código para redefinir a senha é:

${codigo}

Esse código é válido por 15 minutos.

Caso você não tenha solicitado a recuperação, ignore este e-mail.

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
        <div style="text-align: center;">
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
              margin: 5px 0 30px;
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

        <p>
          Use o código abaixo para
          redefinir sua senha:
        </p>

        <div
          style="
            margin: 25px 0;
            padding: 20px;
            background: #222222;
            border: 1px solid #d4af37;
            border-radius: 12px;
            text-align: center;
          "
        >
          <strong
            style="
              color: #d4af37;
              font-size: 32px;
              letter-spacing: 8px;
            "
          >
            ${codigoSeguro}
          </strong>
        </div>

        <p>
          Esse código é válido por
          <strong>15 minutos</strong>.
        </p>

        <p
          style="
            margin-top: 30px;
            color: #bbbbbb;
            font-size: 13px;
          "
        >
          Caso você não tenha solicitado
          a recuperação, ignore este e-mail.
        </p>
      </div>
    `
  });
}

// =========================
// TESTE DA API
// =========================

app.get("/", function (req, res) {
  res.json({
    mensagem:
      "API Guapo The Barber funcionando!"
  });
});

// =========================
// LOGIN COM BCRYPT
// =========================

app.post(
  "/api/auth/login",
  async function (req, res) {
    try {
      const email =
        normalizarEmail(
          req.body.email
        );

      const senhaInformada =
        String(
          req.body.senha || ""
        );

      if (!email || !senhaInformada) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "E-mail e senha são obrigatórios."
        });
      }

      const [usuarios] =
        await conexao.query(
          `
            SELECT
              id,
              nome,
              email,
              telefone,
              tipo,
              senha
            FROM usuarios
            WHERE LOWER(email) = ?
            LIMIT 1
          `,
          [email]
        );

      if (usuarios.length === 0) {
        return res.status(401).json({
          sucesso: false,
          mensagem:
            "E-mail ou senha inválidos."
        });
      }

      const usuario =
        usuarios[0];

      let senhaValida = false;

      if (
        senhaEstaCriptografada(
          usuario.senha
        )
      ) {
        senhaValida =
          await bcrypt.compare(
            senhaInformada,
            usuario.senha
          );

      } else {
        senhaValida =
          senhaInformada ===
          String(usuario.senha);

        if (senhaValida) {
          const novaSenhaHash =
            await bcrypt.hash(
              senhaInformada,
              BCRYPT_ROUNDS
            );

          await conexao.query(
            `
              UPDATE usuarios
              SET senha = ?
              WHERE id = ?
            `,
            [
              novaSenhaHash,
              usuario.id
            ]
          );

          console.log(
            `Senha convertida para bcrypt: ${usuario.email}`
          );
        }
      }

      if (!senhaValida) {
        return res.status(401).json({
          sucesso: false,
          mensagem:
            "E-mail ou senha inválidos."
        });
      }

      return res.json({
        sucesso: true,

        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          telefone: usuario.telefone,
          tipo: usuario.tipo
        }
      });

    } catch (erro) {
      console.error(
        "Erro no login:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro interno no login."
      });
    }
  }
);

// =========================
// CADASTRO COM BCRYPT
// =========================

app.post(
  "/api/auth/cadastro",
  async function (req, res) {
    try {
      const nome =
        String(
          req.body.nome || ""
        ).trim();

      const email =
        normalizarEmail(
          req.body.email
        );

      const telefone =
        String(
          req.body.telefone || ""
        ).trim();

      const senha =
        String(
          req.body.senha || ""
        );

      if (!nome || !email || !senha) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "Nome, e-mail e senha são obrigatórios."
        });
      }

      if (senha.length < 6) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "A senha precisa ter pelo menos 6 caracteres."
        });
      }

      const [usuarioExistente] =
        await conexao.query(
          `
            SELECT id
            FROM usuarios
            WHERE LOWER(email) = ?
            LIMIT 1
          `,
          [email]
        );

      if (
        usuarioExistente.length > 0
      ) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "Já existe uma conta com esse e-mail."
        });
      }

      const senhaHash =
        await bcrypt.hash(
          senha,
          BCRYPT_ROUNDS
        );

      const [resultado] =
        await conexao.query(
          `
            INSERT INTO usuarios (
              nome,
              email,
              telefone,
              senha,
              tipo
            )
            VALUES (?, ?, ?, ?, 'cliente')
          `,
          [
            nome,
            email,
            telefone,
            senhaHash
          ]
        );

      return res.status(201).json({
        sucesso: true,
        mensagem:
          "Cliente cadastrado com sucesso.",

        usuario: {
          id: resultado.insertId,
          nome,
          email,
          telefone,
          tipo: "cliente"
        }
      });

    } catch (erro) {
      console.error(
        "Erro no cadastro:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro interno no cadastro."
      });
    }
  }
);

// =========================
// SOLICITAR CÓDIGO
// =========================

app.post(
  "/api/auth/recuperacao/solicitar",
  async function (req, res) {
    try {
      const email =
        normalizarEmail(
          req.body.email
        );

      if (!email) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "Informe o e-mail cadastrado."
        });
      }

      const [usuarios] =
        await conexao.query(
          `
            SELECT
              id,
              nome,
              email
            FROM usuarios
            WHERE LOWER(email) = ?
            LIMIT 1
          `,
          [email]
        );

      if (usuarios.length === 0) {
        return res.json({
          sucesso: true,
          mensagem:
            "Caso o e-mail esteja cadastrado, você receberá um código."
        });
      }

      const usuario =
        usuarios[0];

      const codigo =
        gerarCodigoRecuperacao();

      const codigoHash =
        await bcrypt.hash(
          codigo,
          BCRYPT_ROUNDS
        );

      await conexao.query(
        `
          DELETE FROM recuperacoes_senha
          WHERE usuario_id = ?
        `,
        [usuario.id]
      );

      const [resultado] =
        await conexao.query(
          `
            INSERT INTO recuperacoes_senha (
              usuario_id,
              codigo_hash,
              expira_em,
              tentativas,
              utilizado
            )
            VALUES (
              ?,
              ?,
              DATE_ADD(
                NOW(),
                INTERVAL 15 MINUTE
              ),
              0,
              false
            )
          `,
          [
            usuario.id,
            codigoHash
          ]
        );

      try {
        await enviarCodigoRecuperacao({
          para: usuario.email,
          nome: usuario.nome,
          codigo
        });

      } catch (erroEmail) {
        await conexao.query(
          `
            DELETE FROM recuperacoes_senha
            WHERE id = ?
          `,
          [resultado.insertId]
        );

        console.error(
          "Erro ao enviar código:",
          erroEmail
        );

        return res.status(500).json({
          sucesso: false,
          mensagem:
            "Não foi possível enviar o código por e-mail."
        });
      }

      return res.json({
        sucesso: true,
        mensagem:
          "Enviamos um código de 6 dígitos para seu e-mail."
      });

    } catch (erro) {
      console.error(
        "Erro ao solicitar recuperação:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao solicitar recuperação de senha."
      });
    }
  }
);

// =========================
// VERIFICAR CÓDIGO
// =========================

app.post(
  "/api/auth/recuperacao/verificar",
  async function (req, res) {
    try {
      const email =
        normalizarEmail(
          req.body.email
        );

      const codigo =
        String(
          req.body.codigo || ""
        ).trim();

      if (!email || !codigo) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "E-mail e código são obrigatórios."
        });
      }

      if (!/^\d{6}$/.test(codigo)) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "O código precisa ter 6 números."
        });
      }

      const [usuarios] =
        await conexao.query(
          `
            SELECT id
            FROM usuarios
            WHERE LOWER(email) = ?
            LIMIT 1
          `,
          [email]
        );

      if (usuarios.length === 0) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "Código inválido ou expirado."
        });
      }

      const usuario =
        usuarios[0];

      const [recuperacoes] =
        await conexao.query(
          `
            SELECT
              id,
              codigo_hash AS codigoHash,
              tentativas

            FROM recuperacoes_senha

            WHERE usuario_id = ?
              AND utilizado = false
              AND expira_em >= NOW()

            ORDER BY criado_em DESC
            LIMIT 1
          `,
          [usuario.id]
        );

      if (
        recuperacoes.length === 0
      ) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "Código inválido ou expirado. Solicite um novo código."
        });
      }

      const recuperacao =
        recuperacoes[0];

      if (
        recuperacao.tentativas >= 5
      ) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "Número máximo de tentativas atingido. Solicite outro código."
        });
      }

      const codigoValido =
        await bcrypt.compare(
          codigo,
          recuperacao.codigoHash
        );

      if (!codigoValido) {
        await conexao.query(
          `
            UPDATE recuperacoes_senha
            SET tentativas =
              tentativas + 1
            WHERE id = ?
          `,
          [recuperacao.id]
        );

        return res.status(400).json({
          sucesso: false,
          mensagem:
            "Código incorreto."
        });
      }

      return res.json({
        sucesso: true,
        mensagem:
          "Código confirmado com sucesso."
      });

    } catch (erro) {
      console.error(
        "Erro ao verificar código:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao verificar o código."
      });
    }
  }
);

// =========================
// REDEFINIR SENHA
// =========================

app.post(
  "/api/auth/recuperacao/redefinir",
  async function (req, res) {
    try {
      const email =
        normalizarEmail(
          req.body.email
        );

      const codigo =
        String(
          req.body.codigo || ""
        ).trim();

      const novaSenha =
        String(
          req.body.novaSenha || ""
        );

      if (
        !email ||
        !codigo ||
        !novaSenha
      ) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "E-mail, código e nova senha são obrigatórios."
        });
      }

      if (!/^\d{6}$/.test(codigo)) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "O código precisa ter 6 números."
        });
      }

      if (novaSenha.length < 6) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "A nova senha precisa ter pelo menos 6 caracteres."
        });
      }

      const [usuarios] =
        await conexao.query(
          `
            SELECT id
            FROM usuarios
            WHERE LOWER(email) = ?
            LIMIT 1
          `,
          [email]
        );

      if (usuarios.length === 0) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "Código inválido ou expirado."
        });
      }

      const usuario =
        usuarios[0];

      const [recuperacoes] =
        await conexao.query(
          `
            SELECT
              id,
              codigo_hash AS codigoHash,
              tentativas

            FROM recuperacoes_senha

            WHERE usuario_id = ?
              AND utilizado = false
              AND expira_em >= NOW()

            ORDER BY criado_em DESC
            LIMIT 1
          `,
          [usuario.id]
        );

      if (
        recuperacoes.length === 0
      ) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "Código inválido ou expirado. Solicite outro código."
        });
      }

      const recuperacao =
        recuperacoes[0];

      const codigoValido =
        await bcrypt.compare(
          codigo,
          recuperacao.codigoHash
        );

      if (!codigoValido) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "Código inválido ou expirado."
        });
      }

      const novaSenhaHash =
        await bcrypt.hash(
          novaSenha,
          BCRYPT_ROUNDS
        );

      await conexao.query(
        `
          UPDATE usuarios
          SET senha = ?
          WHERE id = ?
        `,
        [
          novaSenhaHash,
          usuario.id
        ]
      );

      await conexao.query(
        `
          UPDATE recuperacoes_senha
          SET utilizado = true
          WHERE usuario_id = ?
        `,
        [usuario.id]
      );

      return res.json({
        sucesso: true,
        mensagem:
          "Senha redefinida com sucesso."
      });

    } catch (erro) {
      console.error(
        "Erro ao redefinir senha:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao redefinir senha."
      });
    }
  }
);

// =========================
// LISTAR AGENDAMENTOS
// =========================

app.get(
  "/api/agendamentos",
  async function (req, res) {
    try {
      const {
        data,
        inicio,
        fim,
        clienteId
      } = req.query;

      let sql = `
        SELECT
          id,
          usuario_id AS clienteId,
          nome,
          email,
          telefone,
          servicos,
          data,
          horario,
          total_estimado AS totalEstimado,
          observacao,
          status,
          criado_em AS criadoEm
        FROM agendamentos
        WHERE 1 = 1
      `;

      const parametros = [];

      if (data) {
        sql += " AND data = ?";
        parametros.push(data);
      }

      if (inicio && fim) {
        sql +=
          " AND data BETWEEN ? AND ?";

        parametros.push(
          inicio,
          fim
        );
      }

      if (clienteId) {
        sql +=
          " AND usuario_id = ?";

        parametros.push(clienteId);
      }

      sql +=
        " ORDER BY data ASC, horario ASC";

      const [agendamentos] =
        await conexao.query(
          sql,
          parametros
        );

      return res.json(
        agendamentos
      );

    } catch (erro) {
      console.error(
        "Erro ao listar agendamentos:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao listar agendamentos."
      });
    }
  }
);

// =========================
// CRIAR AGENDAMENTO
// =========================

app.post(
  "/api/agendamentos",
  async function (req, res) {
    try {
      const {
        clienteId,
        usuario_id,
        nome,
        email,
        telefone,
        servicos,
        servico,
        data,
        horario,
        totalEstimado,
        total_estimado,
        observacao
      } = req.body;

      if (!nome || !data || !horario) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "Nome, data e horário são obrigatórios."
        });
      }

      const idCliente =
        clienteId ||
        usuario_id ||
        null;

      const servicosTexto =
        servicos ||
        servico ||
        "";

      const totalTexto =
        totalEstimado ||
        total_estimado ||
        "";

      const [resultado] =
        await conexao.query(
          `
            INSERT INTO agendamentos (
              usuario_id,
              nome,
              email,
              telefone,
              servicos,
              data,
              horario,
              total_estimado,
              observacao,
              status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            idCliente,
            nome,
            email || "",
            telefone || "",
            servicosTexto,
            data,
            horario,
            totalTexto,
            observacao || "",
            "Aguardando confirmação"
          ]
        );

      if (idCliente) {
        await criarNotificacao({
          usuarioId: idCliente,
          tipo: "agendamento",

          titulo:
            "Solicitação de agendamento recebida",

          mensagem:
            `Recebemos sua solicitação para ` +
            `${formatarDataBR(data)} ` +
            `às ${horario}. ` +
            "Aguarde a confirmação do Guapo.",

          referenciaId:
            resultado.insertId
        });
      }

      if (email) {
        await enviarEmailAgendamento({
          para: email,
          nome,

          status:
            "Aguardando confirmação",

          data,
          horario,

          servicos:
            servicosTexto
        });
      }

      return res.status(201).json({
        sucesso: true,
        mensagem:
          "Agendamento criado com sucesso.",

        agendamento: {
          id: resultado.insertId,
          clienteId: idCliente,
          nome,
          email: email || "",
          telefone: telefone || "",
          servicos: servicosTexto,
          data,
          horario,
          totalEstimado: totalTexto,
          observacao:
            observacao || "",

          status:
            "Aguardando confirmação"
        }
      });

    } catch (erro) {
      console.error(
        "Erro ao criar agendamento:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao criar agendamento."
      });
    }
  }
);

// =========================
// ALTERAR STATUS
// =========================

app.patch(
  "/api/agendamentos/:id/status",
  async function (req, res) {
    try {
      const { id } =
        req.params;

      const { status } =
        req.body;

      if (!status) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "Status é obrigatório."
        });
      }

      if (
        !STATUS_PERMITIDOS.includes(
          status
        )
      ) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "Status inválido."
        });
      }

      const [agendamentos] =
        await conexao.query(
          `
            SELECT
              agendamentos.id,

              agendamentos.usuario_id
                AS clienteId,

              agendamentos.servicos,

              DATE_FORMAT(
                agendamentos.data,
                '%Y-%m-%d'
              ) AS dataEmail,

              DATE_FORMAT(
                agendamentos.data,
                '%d/%m/%Y'
              ) AS dataFormatada,

              agendamentos.horario,
              agendamentos.status,

              usuarios.nome
                AS clienteNome,

              usuarios.email
                AS clienteEmail

            FROM agendamentos

            LEFT JOIN usuarios
              ON usuarios.id =
                 agendamentos.usuario_id

            WHERE agendamentos.id = ?

            LIMIT 1
          `,
          [id]
        );

      if (
        agendamentos.length === 0
      ) {
        return res.status(404).json({
          sucesso: false,
          mensagem:
            "Agendamento não encontrado."
        });
      }

      const agendamento =
        agendamentos[0];

      if (
        agendamento.status === status
      ) {
        return res.json({
          sucesso: true,
          mensagem:
            "O agendamento já está com esse status."
        });
      }

      await conexao.query(
        `
          UPDATE agendamentos
          SET status = ?
          WHERE id = ?
        `,
        [status, id]
      );

      if (agendamento.clienteId) {
        let titulo =
          "Agendamento atualizado";

        let mensagem =
          `O status do seu agendamento de ` +
          `${agendamento.dataFormatada} ` +
          `às ${agendamento.horario} ` +
          `foi alterado para ${status}.`;

        if (status === "Confirmado") {
          titulo =
            "Agendamento confirmado";

          mensagem =
            `Seu agendamento foi confirmado para ` +
            `${agendamento.dataFormatada} ` +
            `às ${agendamento.horario}.`;
        }

        if (status === "Cancelado") {
          titulo =
            "Agendamento cancelado";

          mensagem =
            `Seu agendamento de ` +
            `${agendamento.dataFormatada} ` +
            `às ${agendamento.horario} ` +
            "foi cancelado.";
        }

        if (
          status ===
          "Aguardando confirmação"
        ) {
          titulo =
            "Agendamento aguardando confirmação";

          mensagem =
            `Seu agendamento de ` +
            `${agendamento.dataFormatada} ` +
            `às ${agendamento.horario} ` +
            "está aguardando confirmação.";
        }

        await criarNotificacao({
          usuarioId:
            agendamento.clienteId,

          tipo:
            "agendamento",

          titulo,
          mensagem,

          referenciaId:
            Number(id)
        });
      }

      if (
        agendamento.clienteEmail
      ) {
        await enviarEmailAgendamento({
          para:
            agendamento.clienteEmail,

          nome:
            agendamento.clienteNome,

          status,

          data:
            agendamento.dataEmail,

          horario:
            agendamento.horario,

          servicos:
            agendamento.servicos
        });
      }

      return res.json({
        sucesso: true,
        mensagem:
          "Status atualizado com sucesso."
      });

    } catch (erro) {
      console.error(
        "Erro ao alterar status:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao alterar status."
      });
    }
  }
);

// =========================
// EXCLUIR AGENDAMENTO
// =========================

app.delete(
  "/api/agendamentos/:id",
  async function (req, res) {
    try {
      const { id } =
        req.params;

      const [agendamentos] =
        await conexao.query(
          `
            SELECT
              agendamentos.usuario_id
                AS clienteId,

              agendamentos.servicos,

              DATE_FORMAT(
                agendamentos.data,
                '%Y-%m-%d'
              ) AS dataEmail,

              DATE_FORMAT(
                agendamentos.data,
                '%d/%m/%Y'
              ) AS dataFormatada,

              agendamentos.horario,

              usuarios.nome
                AS clienteNome,

              usuarios.email
                AS clienteEmail

            FROM agendamentos

            LEFT JOIN usuarios
              ON usuarios.id =
                 agendamentos.usuario_id

            WHERE agendamentos.id = ?

            LIMIT 1
          `,
          [id]
        );

      if (
        agendamentos.length === 0
      ) {
        return res.status(404).json({
          sucesso: false,
          mensagem:
            "Agendamento não encontrado."
        });
      }

      const agendamento =
        agendamentos[0];

      await conexao.query(
        `
          DELETE FROM agendamentos
          WHERE id = ?
        `,
        [id]
      );

      if (agendamento.clienteId) {
        await criarNotificacao({
          usuarioId:
            agendamento.clienteId,

          tipo:
            "agendamento",

          titulo:
            "Agendamento removido",

          mensagem:
            `O agendamento de ` +
            `${agendamento.dataFormatada} ` +
            `às ${agendamento.horario} ` +
            "foi removido.",

          referenciaId:
            Number(id)
        });
      }

      if (
        agendamento.clienteEmail
      ) {
        await enviarEmailAgendamento({
          para:
            agendamento.clienteEmail,

          nome:
            agendamento.clienteNome,

          status:
            "Removido",

          data:
            agendamento.dataEmail,

          horario:
            agendamento.horario,

          servicos:
            agendamento.servicos
        });
      }

      return res.json({
        sucesso: true,
        mensagem:
          "Agendamento excluído com sucesso."
      });

    } catch (erro) {
      console.error(
        "Erro ao excluir agendamento:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao excluir agendamento."
      });
    }
  }
);

// =========================
// LISTAR MENSAGENS
// =========================

app.get(
  "/api/mensagens",
  async function (req, res) {
    try {
      const [mensagens] =
        await conexao.query(
          `
            SELECT
              mensagens.id,

              mensagens.cliente_id
                AS clienteId,

              usuarios.nome
                AS clienteNome,

              usuarios.email
                AS clienteEmail,

              usuarios.telefone
                AS clienteTelefone,

              mensagens.autor,
              mensagens.texto,

              mensagens.lida_cliente
                AS lidaCliente,

              mensagens.lida_barbeiro
                AS lidaBarbeiro,

              mensagens.criada_em
                AS dataHora

            FROM mensagens

            INNER JOIN usuarios
              ON usuarios.id =
                 mensagens.cliente_id

            ORDER BY mensagens.criada_em ASC
          `
        );

      return res.json(
        mensagens
      );

    } catch (erro) {
      console.error(
        "Erro ao listar mensagens:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao listar mensagens."
      });
    }
  }
);

// =========================
// MENSAGENS DO CLIENTE
// =========================

app.get(
  "/api/mensagens/:clienteId",
  async function (req, res) {
    try {
      const { clienteId } =
        req.params;

      const [mensagens] =
        await conexao.query(
          `
            SELECT
              mensagens.id,

              mensagens.cliente_id
                AS clienteId,

              usuarios.nome
                AS clienteNome,

              usuarios.email
                AS clienteEmail,

              usuarios.telefone
                AS clienteTelefone,

              mensagens.autor,
              mensagens.texto,

              mensagens.lida_cliente
                AS lidaCliente,

              mensagens.lida_barbeiro
                AS lidaBarbeiro,

              mensagens.criada_em
                AS dataHora

            FROM mensagens

            INNER JOIN usuarios
              ON usuarios.id =
                 mensagens.cliente_id

            WHERE mensagens.cliente_id = ?

            ORDER BY mensagens.criada_em ASC
          `,
          [clienteId]
        );

      return res.json(
        mensagens
      );

    } catch (erro) {
      console.error(
        "Erro ao listar mensagens:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao listar mensagens."
      });
    }
  }
);

// =========================
// ENVIAR MENSAGEM
// =========================

app.post(
  "/api/mensagens",
  async function (req, res) {
    try {
      const {
        clienteId,
        autor,
        texto
      } = req.body;

      if (
        !clienteId ||
        !autor ||
        !texto
      ) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "Cliente, autor e texto são obrigatórios."
        });
      }

      if (
        !["cliente", "barbeiro"]
          .includes(autor)
      ) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "Autor inválido."
        });
      }

      const textoLimpo =
        String(texto).trim();

      if (!textoLimpo) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "A mensagem não pode estar vazia."
        });
      }

      const lidaCliente =
        autor === "cliente";

      const lidaBarbeiro =
        autor === "barbeiro";

      const [resultado] =
        await conexao.query(
          `
            INSERT INTO mensagens (
              cliente_id,
              autor,
              texto,
              lida_cliente,
              lida_barbeiro
            )
            VALUES (?, ?, ?, ?, ?)
          `,
          [
            clienteId,
            autor,
            textoLimpo,
            lidaCliente,
            lidaBarbeiro
          ]
        );

      if (autor === "barbeiro") {
        await criarNotificacao({
          usuarioId:
            clienteId,

          tipo:
            "mensagem",

          titulo:
            "Nova mensagem do Guapo",

          mensagem:
            resumirTexto(textoLimpo),

          referenciaId:
            resultado.insertId
        });

        const [clientes] =
          await conexao.query(
            `
              SELECT
                nome,
                email
              FROM usuarios
              WHERE id = ?
              LIMIT 1
            `,
            [clienteId]
          );

        const cliente =
          clientes[0];

        if (
          cliente &&
          cliente.email
        ) {
          await enviarEmailNovaMensagem({
            para:
              cliente.email,

            nome:
              cliente.nome,

            mensagem:
              textoLimpo
          });
        }
      }

      return res.status(201).json({
        sucesso: true,
        mensagem:
          "Mensagem enviada com sucesso.",

        novaMensagem: {
          id:
            resultado.insertId,

          clienteId,
          autor,

          texto:
            textoLimpo,

          lidaCliente,
          lidaBarbeiro,

          dataHora:
            new Date().toISOString()
        }
      });

    } catch (erro) {
      console.error(
        "Erro ao enviar mensagem:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao enviar mensagem."
      });
    }
  }
);

// =========================
// LIDAS PELO CLIENTE
// =========================

app.patch(
  "/api/mensagens/:clienteId/lidas-cliente",
  async function (req, res) {
    try {
      const { clienteId } =
        req.params;

      await conexao.query(
        `
          UPDATE mensagens
          SET lida_cliente = true
          WHERE cliente_id = ?
            AND autor = 'barbeiro'
        `,
        [clienteId]
      );

      return res.json({
        sucesso: true,
        mensagem:
          "Mensagens marcadas como lidas."
      });

    } catch (erro) {
      console.error(
        "Erro ao marcar mensagens:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao marcar mensagens."
      });
    }
  }
);

// =========================
// LIDAS PELO BARBEIRO
// =========================

app.patch(
  "/api/mensagens/:clienteId/lidas-barbeiro",
  async function (req, res) {
    try {
      const { clienteId } =
        req.params;

      await conexao.query(
        `
          UPDATE mensagens
          SET lida_barbeiro = true
          WHERE cliente_id = ?
            AND autor = 'cliente'
        `,
        [clienteId]
      );

      return res.json({
        sucesso: true,
        mensagem:
          "Mensagens marcadas como lidas."
      });

    } catch (erro) {
      console.error(
        "Erro ao marcar mensagens:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao marcar mensagens."
      });
    }
  }
);

// =========================
// LISTAR NOTIFICAÇÕES
// =========================

app.get(
  "/api/notificacoes/:usuarioId",
  async function (req, res) {
    try {
      const { usuarioId } =
        req.params;

      const [notificacoes] =
        await conexao.query(
          `
            SELECT
              id,

              usuario_id
                AS usuarioId,

              tipo,
              titulo,
              mensagem,

              referencia_id
                AS referenciaId,

              lida,

              criada_em
                AS criadaEm

            FROM notificacoes

            WHERE usuario_id = ?

            ORDER BY criada_em DESC

            LIMIT 100
          `,
          [usuarioId]
        );

      return res.json(
        notificacoes
      );

    } catch (erro) {
      console.error(
        "Erro ao listar notificações:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao listar notificações."
      });
    }
  }
);

// =========================
// MARCAR UMA COMO LIDA
// =========================

app.patch(
  "/api/notificacoes/:id/lida",
  async function (req, res) {
    try {
      const { id } =
        req.params;

      const [resultado] =
        await conexao.query(
          `
            UPDATE notificacoes
            SET lida = true
            WHERE id = ?
          `,
          [id]
        );

      if (
        resultado.affectedRows === 0
      ) {
        return res.status(404).json({
          sucesso: false,
          mensagem:
            "Notificação não encontrada."
        });
      }

      return res.json({
        sucesso: true,
        mensagem:
          "Notificação marcada como lida."
      });

    } catch (erro) {
      console.error(
        "Erro ao marcar notificação:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao marcar notificação."
      });
    }
  }
);

// =========================
// MARCAR TODAS COMO LIDAS
// =========================

app.patch(
  "/api/notificacoes/:usuarioId/lidas",
  async function (req, res) {
    try {
      const { usuarioId } =
        req.params;

      await conexao.query(
        `
          UPDATE notificacoes
          SET lida = true
          WHERE usuario_id = ?
        `,
        [usuarioId]
      );

      return res.json({
        sucesso: true,
        mensagem:
          "Todas as notificações foram marcadas como lidas."
      });

    } catch (erro) {
      console.error(
        "Erro ao marcar notificações:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao marcar notificações."
      });
    }
  }
);

// =========================
// INICIAR SERVIDOR
// =========================

app.listen(
  PORT,
  function () {
    console.log(
      `API rodando na porta ${PORT}`
    );
  }
);
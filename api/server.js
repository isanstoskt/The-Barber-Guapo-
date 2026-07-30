require("dotenv").config();

const express = require("express");
const cors = require("cors");
const conexao = require("./db");

const {
  enviarEmailAgendamento,
  enviarEmailNovaMensagem
} = require("./emailService");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const STATUS_PERMITIDOS = [
  "Aguardando confirmação",
  "Confirmado",
  "Cancelado"
];

// =========================
// FUNÇÕES AUXILIARES
// =========================

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

function resumirTexto(texto, limite = 140) {
  const conteudo = String(texto || "").trim();

  if (conteudo.length <= limite) {
    return conteudo;
  }

  return `${conteudo.slice(0, limite - 3)}...`;
}

function formatarDataBR(data) {
  if (!data) {
    return "Data não informada";
  }

  const dataISO = String(data).split("T")[0];
  const partes = dataISO.split("-");

  if (partes.length !== 3) {
    return dataISO;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// =========================
// ROTA DE TESTE
// =========================

app.get("/", function (req, res) {
  res.json({
    mensagem: "API Guapo The Barber funcionando com MySQL e e-mail!"
  });
});

// =========================
// LOGIN
// =========================

app.post("/api/auth/login", async function (req, res) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "E-mail e senha são obrigatórios."
      });
    }

    const [usuarios] = await conexao.query(
      `
        SELECT
          id,
          nome,
          email,
          telefone,
          tipo
        FROM usuarios
        WHERE email = ?
          AND senha = ?
        LIMIT 1
      `,
      [email, senha]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "E-mail ou senha inválidos."
      });
    }

    return res.json({
      sucesso: true,
      usuario: usuarios[0]
    });

  } catch (erro) {
    console.error("Erro no login:", erro);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no login."
    });
  }
});

// =========================
// CADASTRO DE CLIENTE
// =========================

app.post("/api/auth/cadastro", async function (req, res) {
  try {
    const {
      nome,
      email,
      telefone,
      senha
    } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Nome, e-mail e senha são obrigatórios."
      });
    }

    const [usuarioExistente] = await conexao.query(
      `
        SELECT id
        FROM usuarios
        WHERE email = ?
        LIMIT 1
      `,
      [email]
    );

    if (usuarioExistente.length > 0) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Já existe uma conta com esse e-mail."
      });
    }

    const [resultado] = await conexao.query(
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
        telefone || "",
        senha
      ]
    );

    return res.status(201).json({
      sucesso: true,
      mensagem: "Cliente cadastrado com sucesso.",

      usuario: {
        id: resultado.insertId,
        nome,
        email,
        telefone: telefone || "",
        tipo: "cliente"
      }
    });

  } catch (erro) {
    console.error("Erro no cadastro:", erro);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no cadastro."
    });
  }
});

// =========================
// LISTAR AGENDAMENTOS
// =========================

app.get("/api/agendamentos", async function (req, res) {
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
      sql += " AND data BETWEEN ? AND ?";
      parametros.push(inicio, fim);
    }

    if (clienteId) {
      sql += " AND usuario_id = ?";
      parametros.push(clienteId);
    }

    sql += " ORDER BY data ASC, horario ASC";

    const [agendamentos] = await conexao.query(
      sql,
      parametros
    );

    return res.json(agendamentos);

  } catch (erro) {
    console.error("Erro ao listar agendamentos:", erro);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao listar agendamentos."
    });
  }
});

// =========================
// CRIAR AGENDAMENTO
// =========================

app.post("/api/agendamentos", async function (req, res) {
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
        mensagem: "Nome, data e horário são obrigatórios."
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

    const [resultado] = await conexao.query(
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
        titulo: "Solicitação de agendamento recebida",

        mensagem:
          `Recebemos sua solicitação para ` +
          `${formatarDataBR(data)} às ${horario}. ` +
          "Aguarde a confirmação do Guapo.",

        referenciaId: resultado.insertId
      });
    }

    if (email) {
      await enviarEmailAgendamento({
        para: email,
        nome,
        status: "Aguardando confirmação",
        data,
        horario,
        servicos: servicosTexto
      });
    }

    return res.status(201).json({
      sucesso: true,
      mensagem: "Agendamento criado com sucesso.",

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
        observacao: observacao || "",
        status: "Aguardando confirmação"
      }
    });

  } catch (erro) {
    console.error("Erro ao criar agendamento:", erro);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao criar agendamento."
    });
  }
});

// =========================
// ALTERAR STATUS
// =========================

app.patch(
  "/api/agendamentos/:id/status",
  async function (req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          sucesso: false,
          mensagem: "Status é obrigatório."
        });
      }

      if (!STATUS_PERMITIDOS.includes(status)) {
        return res.status(400).json({
          sucesso: false,
          mensagem: "Status inválido."
        });
      }

      const [agendamentos] = await conexao.query(
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

      if (agendamentos.length === 0) {
        return res.status(404).json({
          sucesso: false,
          mensagem: "Agendamento não encontrado."
        });
      }

      const agendamento = agendamentos[0];

      if (agendamento.status === status) {
        return res.json({
          sucesso: true,
          mensagem: "O agendamento já está com esse status."
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
        let titulo = "Agendamento atualizado";

        let mensagem =
          `O status do seu agendamento de ` +
          `${agendamento.dataFormatada} ` +
          `às ${agendamento.horario} ` +
          `foi alterado para ${status}.`;

        if (status === "Confirmado") {
          titulo = "Agendamento confirmado";

          mensagem =
            `Seu agendamento foi confirmado para ` +
            `${agendamento.dataFormatada} ` +
            `às ${agendamento.horario}.`;
        }

        if (status === "Cancelado") {
          titulo = "Agendamento cancelado";

          mensagem =
            `Seu agendamento de ` +
            `${agendamento.dataFormatada} ` +
            `às ${agendamento.horario} ` +
            "foi cancelado.";
        }

        if (status === "Aguardando confirmação") {
          titulo =
            "Agendamento aguardando confirmação";

          mensagem =
            `Seu agendamento de ` +
            `${agendamento.dataFormatada} ` +
            `às ${agendamento.horario} ` +
            "está aguardando confirmação.";
        }

        await criarNotificacao({
          usuarioId: agendamento.clienteId,
          tipo: "agendamento",
          titulo,
          mensagem,
          referenciaId: Number(id)
        });
      }

      if (agendamento.clienteEmail) {
        await enviarEmailAgendamento({
          para: agendamento.clienteEmail,
          nome: agendamento.clienteNome,
          status,
          data: agendamento.dataEmail,
          horario: agendamento.horario,
          servicos: agendamento.servicos
        });
      }

      return res.json({
        sucesso: true,
        mensagem: "Status atualizado com sucesso."
      });

    } catch (erro) {
      console.error("Erro ao alterar status:", erro);

      return res.status(500).json({
        sucesso: false,
        mensagem: "Erro ao alterar status."
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
      const { id } = req.params;

      const [agendamentos] = await conexao.query(
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

      if (agendamentos.length === 0) {
        return res.status(404).json({
          sucesso: false,
          mensagem: "Agendamento não encontrado."
        });
      }

      const agendamento = agendamentos[0];

      await conexao.query(
        `
          DELETE FROM agendamentos
          WHERE id = ?
        `,
        [id]
      );

      if (agendamento.clienteId) {
        await criarNotificacao({
          usuarioId: agendamento.clienteId,
          tipo: "agendamento",
          titulo: "Agendamento removido",

          mensagem:
            `O agendamento de ` +
            `${agendamento.dataFormatada} ` +
            `às ${agendamento.horario} ` +
            "foi removido.",

          referenciaId: Number(id)
        });
      }

      if (agendamento.clienteEmail) {
        await enviarEmailAgendamento({
          para: agendamento.clienteEmail,
          nome: agendamento.clienteNome,
          status: "Removido",
          data: agendamento.dataEmail,
          horario: agendamento.horario,
          servicos: agendamento.servicos
        });
      }

      return res.json({
        sucesso: true,
        mensagem: "Agendamento excluído com sucesso."
      });

    } catch (erro) {
      console.error("Erro ao excluir agendamento:", erro);

      return res.status(500).json({
        sucesso: false,
        mensagem: "Erro ao excluir agendamento."
      });
    }
  }
);

// =========================
// LISTAR CONVERSAS DO PAINEL
// =========================

app.get("/api/mensagens", async function (req, res) {
  try {
    const [mensagens] = await conexao.query(
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

    return res.json(mensagens);

  } catch (erro) {
    console.error("Erro ao listar mensagens:", erro);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao listar mensagens."
    });
  }
});

// =========================
// MENSAGENS DE UM CLIENTE
// =========================

app.get(
  "/api/mensagens/:clienteId",
  async function (req, res) {
    try {
      const { clienteId } = req.params;

      const [mensagens] = await conexao.query(
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

      return res.json(mensagens);

    } catch (erro) {
      console.error(
        "Erro ao listar mensagens do cliente:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem: "Erro ao listar mensagens do cliente."
      });
    }
  }
);

// =========================
// ENVIAR MENSAGEM
// =========================

app.post("/api/mensagens", async function (req, res) {
  try {
    const {
      clienteId,
      autor,
      texto
    } = req.body;

    if (!clienteId || !autor || !texto) {
      return res.status(400).json({
        sucesso: false,
        mensagem:
          "Cliente, autor e texto são obrigatórios."
      });
    }

    if (!["cliente", "barbeiro"].includes(autor)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Autor da mensagem inválido."
      });
    }

    const textoLimpo = String(texto).trim();

    if (!textoLimpo) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "A mensagem não pode estar vazia."
      });
    }

    const lidaCliente =
      autor === "cliente";

    const lidaBarbeiro =
      autor === "barbeiro";

    const [resultado] = await conexao.query(
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
        usuarioId: clienteId,
        tipo: "mensagem",
        titulo: "Nova mensagem do Guapo",
        mensagem: resumirTexto(textoLimpo),
        referenciaId: resultado.insertId
      });

      const [clientes] = await conexao.query(
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

      const cliente = clientes[0];

      if (cliente && cliente.email) {
        await enviarEmailNovaMensagem({
          para: cliente.email,
          nome: cliente.nome,
          mensagem: textoLimpo
        });
      }
    }

    return res.status(201).json({
      sucesso: true,
      mensagem: "Mensagem enviada com sucesso.",

      novaMensagem: {
        id: resultado.insertId,
        clienteId,
        autor,
        texto: textoLimpo,
        lidaCliente,
        lidaBarbeiro,
        dataHora: new Date().toISOString()
      }
    });

  } catch (erro) {
    console.error("Erro ao enviar mensagem:", erro);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao enviar mensagem."
    });
  }
});

// =========================
// MENSAGENS LIDAS PELO CLIENTE
// =========================

app.patch(
  "/api/mensagens/:clienteId/lidas-cliente",
  async function (req, res) {
    try {
      const { clienteId } = req.params;

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
          "Mensagens marcadas como lidas pelo cliente."
      });

    } catch (erro) {
      console.error(
        "Erro ao marcar lidas pelo cliente:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao marcar mensagens como lidas pelo cliente."
      });
    }
  }
);

// =========================
// MENSAGENS LIDAS PELO BARBEIRO
// =========================

app.patch(
  "/api/mensagens/:clienteId/lidas-barbeiro",
  async function (req, res) {
    try {
      const { clienteId } = req.params;

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
          "Mensagens marcadas como lidas pelo barbeiro."
      });

    } catch (erro) {
      console.error(
        "Erro ao marcar lidas pelo barbeiro:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao marcar mensagens como lidas pelo barbeiro."
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
      const { usuarioId } = req.params;

      const [notificacoes] = await conexao.query(
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

      return res.json(notificacoes);

    } catch (erro) {
      console.error(
        "Erro ao listar notificações:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem: "Erro ao listar notificações."
      });
    }
  }
);

// =========================
// MARCAR UMA NOTIFICAÇÃO COMO LIDA
// =========================

app.patch(
  "/api/notificacoes/:id/lida",
  async function (req, res) {
    try {
      const { id } = req.params;

      const [resultado] = await conexao.query(
        `
          UPDATE notificacoes
          SET lida = true
          WHERE id = ?
        `,
        [id]
      );

      if (resultado.affectedRows === 0) {
        return res.status(404).json({
          sucesso: false,
          mensagem: "Notificação não encontrada."
        });
      }

      return res.json({
        sucesso: true,
        mensagem: "Notificação marcada como lida."
      });

    } catch (erro) {
      console.error(
        "Erro ao marcar notificação como lida:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao marcar notificação como lida."
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
      const { usuarioId } = req.params;

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
        "Erro ao marcar todas as notificações como lidas:",
        erro
      );

      return res.status(500).json({
        sucesso: false,
        mensagem:
          "Erro ao marcar todas as notificações como lidas."
      });
    }
  }
);

// =========================
// INICIAR SERVIDOR
// =========================

app.listen(PORT, function () {
  console.log(`API rodando na porta ${PORT}`);
});
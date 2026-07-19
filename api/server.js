require("dotenv").config();

const express = require("express");
const cors = require("cors");
const conexao = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =========================
// ROTA DE TESTE
// =========================

app.get("/", function (req, res) {
  res.json({
    mensagem: "API Guapo The Barber funcionando com MySQL!"
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
      "SELECT id, nome, email, telefone, tipo FROM usuarios WHERE email = ? AND senha = ? LIMIT 1",
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
    const { nome, email, telefone, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Nome, e-mail e senha são obrigatórios."
      });
    }

    const [usuarioExistente] = await conexao.query(
      "SELECT id FROM usuarios WHERE email = ? LIMIT 1",
      [email]
    );

    if (usuarioExistente.length > 0) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Já existe uma conta com esse e-mail."
      });
    }

    const [resultado] = await conexao.query(
      `INSERT INTO usuarios (nome, email, telefone, senha, tipo)
       VALUES (?, ?, ?, ?, 'cliente')`,
      [nome, email, telefone || "", senha]
    );

    return res.status(201).json({
      sucesso: true,
      mensagem: "Cliente cadastrado com sucesso.",
      usuario: {
        id: resultado.insertId,
        nome,
        email,
        telefone,
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
    const { data, inicio, fim, clienteId } = req.query;

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

    const [agendamentos] = await conexao.query(sql, parametros);

    res.json(agendamentos);

  } catch (erro) {
    console.error("Erro ao listar agendamentos:", erro);

    res.status(500).json({
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

    const idCliente = clienteId || usuario_id || null;
    const servicosTexto = servicos || servico || "";
    const totalTexto = totalEstimado || total_estimado || "";

    const [resultado] = await conexao.query(
      `INSERT INTO agendamentos 
      (usuario_id, nome, email, telefone, servicos, data, horario, total_estimado, observacao, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    res.status(201).json({
      sucesso: true,
      mensagem: "Agendamento criado com sucesso.",
      agendamento: {
        id: resultado.insertId,
        clienteId: idCliente,
        nome,
        email,
        telefone,
        servicos: servicosTexto,
        data,
        horario,
        totalEstimado: totalTexto,
        observacao,
        status: "Aguardando confirmação"
      }
    });

  } catch (erro) {
    console.error("Erro ao criar agendamento:", erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao criar agendamento."
    });
  }
});

// =========================
// ALTERAR STATUS DO AGENDAMENTO
// =========================

app.patch("/api/agendamentos/:id/status", async function (req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Status é obrigatório."
      });
    }

    await conexao.query(
      "UPDATE agendamentos SET status = ? WHERE id = ?",
      [status, id]
    );

    res.json({
      sucesso: true,
      mensagem: "Status atualizado com sucesso."
    });

  } catch (erro) {
    console.error("Erro ao alterar status:", erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao alterar status."
    });
  }
});

// =========================
// EXCLUIR AGENDAMENTO
// =========================

app.delete("/api/agendamentos/:id", async function (req, res) {
  try {
    const { id } = req.params;

    await conexao.query(
      "DELETE FROM agendamentos WHERE id = ?",
      [id]
    );

    res.json({
      sucesso: true,
      mensagem: "Agendamento excluído com sucesso."
    });

  } catch (erro) {
    console.error("Erro ao excluir agendamento:", erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao excluir agendamento."
    });
  }
});

// =========================
// LISTAR TODAS AS CONVERSAS DO PAINEL
// =========================

app.get("/api/mensagens", async function (req, res) {
  try {
    const [mensagens] = await conexao.query(`
      SELECT 
        mensagens.id,
        mensagens.cliente_id AS clienteId,
        usuarios.nome AS clienteNome,
        usuarios.email AS clienteEmail,
        usuarios.telefone AS clienteTelefone,
        mensagens.autor,
        mensagens.texto,
        mensagens.lida_cliente AS lidaCliente,
        mensagens.lida_barbeiro AS lidaBarbeiro,
        mensagens.criada_em AS dataHora
      FROM mensagens
      INNER JOIN usuarios ON usuarios.id = mensagens.cliente_id
      ORDER BY mensagens.criada_em ASC
    `);

    res.json(mensagens);

  } catch (erro) {
    console.error("Erro ao listar mensagens:", erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao listar mensagens."
    });
  }
});

// =========================
// LISTAR MENSAGENS DE UM CLIENTE
// =========================

app.get("/api/mensagens/:clienteId", async function (req, res) {
  try {
    const { clienteId } = req.params;

    const [mensagens] = await conexao.query(`
      SELECT 
        mensagens.id,
        mensagens.cliente_id AS clienteId,
        usuarios.nome AS clienteNome,
        usuarios.email AS clienteEmail,
        usuarios.telefone AS clienteTelefone,
        mensagens.autor,
        mensagens.texto,
        mensagens.lida_cliente AS lidaCliente,
        mensagens.lida_barbeiro AS lidaBarbeiro,
        mensagens.criada_em AS dataHora
      FROM mensagens
      INNER JOIN usuarios ON usuarios.id = mensagens.cliente_id
      WHERE mensagens.cliente_id = ?
      ORDER BY mensagens.criada_em ASC
    `, [clienteId]);

    res.json(mensagens);

  } catch (erro) {
    console.error("Erro ao listar mensagens do cliente:", erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao listar mensagens do cliente."
    });
  }
});

// =========================
// ENVIAR MENSAGEM
// =========================

app.post("/api/mensagens", async function (req, res) {
  try {
    const { clienteId, autor, texto } = req.body;

    if (!clienteId || !autor || !texto) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Cliente, autor e texto são obrigatórios."
      });
    }

    const lidaCliente = autor === "cliente" ? true : false;
    const lidaBarbeiro = autor === "barbeiro" ? true : false;

    const [resultado] = await conexao.query(
      `INSERT INTO mensagens 
      (cliente_id, autor, texto, lida_cliente, lida_barbeiro)
      VALUES (?, ?, ?, ?, ?)`,
      [clienteId, autor, texto, lidaCliente, lidaBarbeiro]
    );

    res.status(201).json({
      sucesso: true,
      mensagem: "Mensagem enviada com sucesso.",
      novaMensagem: {
        id: resultado.insertId,
        clienteId,
        autor,
        texto,
        lidaCliente,
        lidaBarbeiro,
        dataHora: new Date().toISOString()
      }
    });

  } catch (erro) {
    console.error("Erro ao enviar mensagem:", erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao enviar mensagem."
    });
  }
});

// =========================
// MARCAR MENSAGENS COMO LIDAS PELO CLIENTE
// =========================

app.patch("/api/mensagens/:clienteId/lidas-cliente", async function (req, res) {
  try {
    const { clienteId } = req.params;

    await conexao.query(
      `UPDATE mensagens 
       SET lida_cliente = true 
       WHERE cliente_id = ? AND autor = 'barbeiro'`,
      [clienteId]
    );

    res.json({
      sucesso: true,
      mensagem: "Mensagens marcadas como lidas pelo cliente."
    });

  } catch (erro) {
    console.error("Erro ao marcar lidas pelo cliente:", erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao marcar mensagens como lidas pelo cliente."
    });
  }
});

// =========================
// MARCAR MENSAGENS COMO LIDAS PELO BARBEIRO
// =========================

app.patch("/api/mensagens/:clienteId/lidas-barbeiro", async function (req, res) {
  try {
    const { clienteId } = req.params;

    await conexao.query(
      `UPDATE mensagens 
       SET lida_barbeiro = true 
       WHERE cliente_id = ? AND autor = 'cliente'`,
      [clienteId]
    );

    res.json({
      sucesso: true,
      mensagem: "Mensagens marcadas como lidas pelo barbeiro."
    });

  } catch (erro) {
    console.error("Erro ao marcar lidas pelo barbeiro:", erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao marcar mensagens como lidas pelo barbeiro."
    });
  }
});

// =========================
// INICIAR SERVIDOR
// =========================

app.listen(PORT, function () {
  console.log(`API rodando na porta ${PORT}`);
});
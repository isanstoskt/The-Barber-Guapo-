const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const arquivoAgendamentos = path.join(__dirname, "agendamentos.json");

const USUARIO_ADMIN = "admin";
const SENHA_ADMIN = "guapo123";
const TOKEN_ADMIN = "guapo-admin-logado";

function pegarCookie(req, nome) {
  const cookies = req.headers.cookie || "";
  const listaCookies = cookies.split(";");

  for (const cookie of listaCookies) {
    const partes = cookie.trim().split("=");

    if (partes[0] === nome) {
      return partes[1];
    }
  }

  return null;
}

function verificarLogin(req, res, next) {
  const token = pegarCookie(req, "guapo_admin");

  if (token === TOKEN_ADMIN) {
    return next();
  }

  return res.redirect("/login");
} 

function lerAgendamentos() {
  try {
    const dados = fs.readFileSync(arquivoAgendamentos, "utf8");
    return JSON.parse(dados);
  } catch (erro) {
    return [];
  }
}

function salvarAgendamentos(agendamentos) {
  fs.writeFileSync(
    arquivoAgendamentos,
    JSON.stringify(agendamentos, null, 2),
    "utf8"
  );
}

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.get("/login", function (req, res) {
  res.sendFile(path.join(__dirname, "..", "login.html"));
});

app.post("/api/login", function (req, res) {
  const { usuario, senha } = req.body;

  if (usuario === USUARIO_ADMIN && senha === SENHA_ADMIN) {
    res.setHeader(
      "Set-Cookie",
      `guapo_admin=${TOKEN_ADMIN}; HttpOnly; Path=/; Max-Age=7200; SameSite=Lax`
    );

    return res.json({
      mensagem: "Login realizado com sucesso."
    });
  }

  return res.status(401).json({
    erro: "Usuário ou senha inválidos."
  });
});

app.get("/painel", verificarLogin, function (req, res) {
  res.sendFile(path.join(__dirname, "..", "painel.html"));
});

app.get("/painel.html", verificarLogin, function (req, res) {
  res.sendFile(path.join(__dirname, "..", "painel.html"));
});

app.get("/painel.js", verificarLogin, function (req, res) {
  res.sendFile(path.join(__dirname, "..", "painel.js"));
});


app.get("/api/agendamentos", function (req, res) {
  const data = req.query.data;
  const inicio = req.query.inicio;
  const fim = req.query.fim;

  let agendamentos = lerAgendamentos();

  if (data) {
    agendamentos = agendamentos.filter(function (agendamento) {
      return agendamento.data === data;
    });
  }

  if (inicio && fim) {
    agendamentos = agendamentos.filter(function (agendamento) {
      return agendamento.data >= inicio && agendamento.data <= fim;
    });
  }

  agendamentos.sort(function (a, b) {
    if (a.data === b.data) {
      return a.horario.localeCompare(b.horario);
    }

    return a.data.localeCompare(b.data);
  });

  res.json(agendamentos);
});

app.get("/api/horarios-ocupados", function (req, res) {
  const data = req.query.data;

  if (!data) {
    return res.status(400).json({
      erro: "Informe a data."
    });
  }

  const agendamentos = lerAgendamentos();

  const horariosOcupados = agendamentos
    .filter(function (agendamento) {
      return agendamento.data === data && agendamento.status !== "Cancelado";
    })
    .map(function (agendamento) {
      return agendamento.horario;
    });

  res.json({
    data: data,
    horariosOcupados: horariosOcupados
  });
});

app.post("/api/agendamentos", function (req, res) {
  const {
    nome,
    telefone,
    email,
    data,
    horario,
    servicos,
    totalEstimado,
    observacao
  } = req.body;

  if (!nome || !telefone || !data || !horario || !servicos) {
    return res.status(400).json({
      erro: "Preencha todos os campos obrigatórios."
    });
  }

  const agendamentos = lerAgendamentos();

  const horarioJaExiste = agendamentos.find(function (agendamento) {
    return (
      agendamento.data === data &&
      agendamento.horario === horario &&
      agendamento.status !== "Cancelado"
    );
  });

  if (horarioJaExiste) {
    return res.status(409).json({
      erro: "Esse horário já está ocupado. Escolha outro horário."
    });
  }

  const novoAgendamento = {
    id: Date.now(),
    nome: nome,
    telefone: telefone,
    email: email || "Não informado",
    data: data,
    horario: horario,
    servicos: servicos,
    totalEstimado: totalEstimado,
    observacao: observacao || "Sem observação",
    status: "Aguardando confirmação",
    criadoEm: new Date().toISOString()
  };

  agendamentos.push(novoAgendamento);
  salvarAgendamentos(agendamentos);

  res.status(201).json({
    mensagem: "Agendamento criado com sucesso.",
    agendamento: novoAgendamento
  });
});

app.patch("/api/agendamentos/:id/status", function (req, res) {
  const id = Number(req.params.id);
  const { status } = req.body;

  const statusPermitidos = [
    "Aguardando confirmação",
    "Confirmado",
    "Cancelado"
  ];

  if (!statusPermitidos.includes(status)) {
    return res.status(400).json({
      erro: "Status inválido."
    });
  }

  const agendamentos = lerAgendamentos();

  const agendamento = agendamentos.find(function (item) {
    return item.id === id;
  });

  if (!agendamento) {
    return res.status(404).json({
      erro: "Agendamento não encontrado."
    });
  }

  agendamento.status = status;
  agendamento.atualizadoEm = new Date().toISOString();

  salvarAgendamentos(agendamentos);

  res.json({
    mensagem: "Status atualizado com sucesso.",
    agendamento: agendamento
  });
});

app.delete("/api/agendamentos/:id", function (req, res) {
  const id = Number(req.params.id);

  const agendamentos = lerAgendamentos();

  const novosAgendamentos = agendamentos.filter(function (item) {
    return item.id !== id;
  });

  if (novosAgendamentos.length === agendamentos.length) {
    return res.status(404).json({
      erro: "Agendamento não encontrado."
    });
  }

  salvarAgendamentos(novosAgendamentos);

  res.json({
    mensagem: "Agendamento excluído com sucesso."
  });
});
app.use(function (req, res, next) {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      erro: "Rota não encontrada."
    });
  }

  next();
});

app.use(express.static(path.join(__dirname, "..")));

app.listen(PORT, function () {
  console.log(`API rodando em http://localhost:${PORT}`);
});
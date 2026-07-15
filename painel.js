const API_URL = "https://the-barber-guapo.onrender.com/api/agendamentos";

const listaAgendamentos = document.getElementById("listaAgendamentos");
const filtroData = document.getElementById("filtroData");
const btnHoje = document.getElementById("btnHoje");
const btnSemana = document.getElementById("btnSemana");
const btnTodos = document.getElementById("btnTodos");

const totalAgendamentos = document.getElementById("totalAgendamentos");
const totalPendentes = document.getElementById("totalPendentes");
const totalConfirmados = document.getElementById("totalConfirmados");
const totalCancelados = document.getElementById("totalCancelados");

function formatarData(data) {
  if (!data) return "Data não informada";

  const partes = data.split("-");

  if (partes.length !== 3) {
    return data;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function dataHoje() {
  return new Date().toISOString().split("T")[0];
}

function obterSemanaAtual() {
  const hoje = new Date();
  const diaSemana = hoje.getDay();

  const segunda = new Date(hoje);
  const diferencaParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
  segunda.setDate(hoje.getDate() + diferencaParaSegunda);

  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);

  return {
    inicio: segunda.toISOString().split("T")[0],
    fim: domingo.toISOString().split("T")[0]
  };
}

async function buscarJSON(url, opcoes = {}) {
  const resposta = await fetch(url, opcoes);

  const texto = await resposta.text();

  let dados = null;

  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch (erro) {
    throw new Error("A API não retornou um JSON válido.");
  }

  if (!resposta.ok) {
    throw new Error(dados?.erro || "Erro na requisição.");
  }

  return dados;
}

async function carregarAgendamentos(filtro = {}) {
  listaAgendamentos.innerHTML = `<p class="painel-carregando">Carregando agendamentos...</p>`;

  try {
    let url = API_URL;

    if (filtro.data) {
      url = `${API_URL}?data=${filtro.data}`;
    }

    if (filtro.inicio && filtro.fim) {
      url = `${API_URL}?inicio=${filtro.inicio}&fim=${filtro.fim}`;
    }

    const agendamentos = await buscarJSON(url);

    renderizarResumo(agendamentos);
    renderizarAgendamentos(agendamentos);

  } catch (erro) {
    console.error("Erro ao carregar agendamentos:", erro);

    listaAgendamentos.innerHTML = `
      <div class="painel-vazio">
        <h3>Erro ao conectar com a API</h3>
        <p>
          Verifique se a API do Render está ativa:
          <strong>https://the-barber-guapo.onrender.com</strong>
        </p>
      </div>
    `;

    renderizarResumo([]);
  }
}

function renderizarResumo(agendamentos) {
  const pendentes = agendamentos.filter(function (item) {
    return item.status === "Aguardando confirmação";
  });

  const confirmados = agendamentos.filter(function (item) {
    return item.status === "Confirmado";
  });

  const cancelados = agendamentos.filter(function (item) {
    return item.status === "Cancelado";
  });

  totalAgendamentos.textContent = agendamentos.length;
  totalPendentes.textContent = pendentes.length;
  totalConfirmados.textContent = confirmados.length;
  totalCancelados.textContent = cancelados.length;
}

function renderizarAgendamentos(agendamentos) {
  if (!agendamentos || agendamentos.length === 0) {
    listaAgendamentos.innerHTML = `
      <div class="painel-vazio">
        <h3>Nenhum agendamento encontrado</h3>
        <p>Quando um cliente solicitar horário, ele aparecerá aqui.</p>
      </div>
    `;
    return;
  }

  listaAgendamentos.innerHTML = agendamentos.map(function (agendamento) {
    return `
      <article class="agendamento-admin-card">
        <div class="agendamento-admin-topo">
          <div>
            <h3>${agendamento.nome || "Cliente sem nome"}</h3>
            <p>${formatarData(agendamento.data)} às ${agendamento.horario || "horário não informado"}</p>
          </div>

          <span class="status-agendamento ${classeStatus(agendamento.status)}">
            ${agendamento.status || "Aguardando confirmação"}
          </span>
        </div>

        <div class="agendamento-admin-info">
          <p><strong>Telefone:</strong> ${agendamento.telefone || "Não informado"}</p>
          <p><strong>E-mail:</strong> ${agendamento.email || "Não informado"}</p>
          <p><strong>Serviços:</strong> ${agendamento.servicos || agendamento.servico || "Não informado"}</p>
          <p><strong>Total:</strong> ${agendamento.totalEstimado || "Não informado"}</p>
          <p><strong>Observação:</strong> ${agendamento.observacao || "Sem observação"}</p>
        </div>

        <div class="agendamento-admin-botoes">
          <button 
            type="button" 
            class="btn-confirmar"
            onclick="alterarStatus(${agendamento.id}, 'Confirmado')"
          >
            Confirmar
          </button>

          <button 
            type="button" 
            class="btn-cancelar"
            onclick="alterarStatus(${agendamento.id}, 'Cancelado')"
          >
            Cancelar
          </button>

          <button 
            type="button" 
            class="btn-pendente"
            onclick="alterarStatus(${agendamento.id}, 'Aguardando confirmação')"
          >
            Pendente
          </button>

          <button 
            type="button" 
            class="btn-excluir"
            onclick="excluirAgendamento(${agendamento.id})"
          >
            Excluir
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function classeStatus(status) {
  if (status === "Confirmado") {
    return "status-confirmado";
  }

  if (status === "Cancelado") {
    return "status-cancelado";
  }

  return "status-pendente";
}

async function alterarStatus(id, status) {
  try {
    await buscarJSON(`${API_URL}/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: status })
    });

    if (filtroData.value) {
      carregarAgendamentos({ data: filtroData.value });
    } else {
      carregarAgendamentos();
    }

  } catch (erro) {
    console.error("Erro ao alterar status:", erro);
    alert("Erro ao atualizar status do agendamento.");
  }
}

async function excluirAgendamento(id) {
  const confirmar = confirm("Tem certeza que deseja excluir este agendamento?");

  if (!confirmar) {
    return;
  }

  try {
    await buscarJSON(`${API_URL}/${id}`, {
      method: "DELETE"
    });

    if (filtroData.value) {
      carregarAgendamentos({ data: filtroData.value });
    } else {
      carregarAgendamentos();
    }

  } catch (erro) {
    console.error("Erro ao excluir:", erro);
    alert("Erro ao excluir agendamento.");
  }
}

btnHoje.addEventListener("click", function () {
  filtroData.value = dataHoje();
  carregarAgendamentos({ data: filtroData.value });
});

btnSemana.addEventListener("click", function () {
  filtroData.value = "";

  const semana = obterSemanaAtual();

  carregarAgendamentos({
    inicio: semana.inicio,
    fim: semana.fim
  });
});

btnTodos.addEventListener("click", function () {
  filtroData.value = "";
  carregarAgendamentos();
});

filtroData.addEventListener("change", function () {
  if (filtroData.value) {
    carregarAgendamentos({ data: filtroData.value });
  } else {
    carregarAgendamentos();
  }
});

carregarAgendamentos();

const MENSAGENS_KEY = "guapo_mensagens";
const listaMensagensClientes = document.getElementById("listaMensagensClientes");
const btnAtualizarMensagens = document.getElementById("btnAtualizarMensagens");

function carregarMensagensChat() {
  const dados = localStorage.getItem(MENSAGENS_KEY);
  return dados ? JSON.parse(dados) : [];
}

function salvarMensagensChat(mensagens) {
  localStorage.setItem(MENSAGENS_KEY, JSON.stringify(mensagens));
}

function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto || "";
  return div.innerHTML;
}

function formatarDataHoraMensagem(dataISO) {
  if (!dataISO) return "";

  const data = new Date(dataISO);

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function agruparMensagensPorCliente(mensagens) {
  const conversas = {};

  mensagens.forEach(function (mensagem) {
    const clienteId = mensagem.clienteId;

    if (!conversas[clienteId]) {
      conversas[clienteId] = {
        clienteId: clienteId,
        clienteNome: mensagem.clienteNome || "Cliente",
        clienteEmail: mensagem.clienteEmail || "",
        clienteTelefone: mensagem.clienteTelefone || "",
        mensagens: []
      };
    }

    conversas[clienteId].mensagens.push(mensagem);
  });

  return Object.values(conversas);
}

let clienteAdminAtivo = null;

function temMensagemNaoLida(conversa) {
  return conversa.mensagens.some(function (mensagem) {
    return mensagem.autor === "cliente" && !mensagem.lida;
  });
}

function ultimaDataHora(conversa) {
  const ultima = conversa.mensagens[conversa.mensagens.length - 1];
  return ultima ? new Date(ultima.dataHora).getTime() : 0;
}

function marcarConversaComoLida(conversa) {
  const mensagens = carregarMensagensChat();
  let houveAlteracao = false;

  mensagens.forEach(function (mensagem) {
    if (String(mensagem.clienteId) === String(conversa.clienteId) && mensagem.autor === "cliente" && !mensagem.lida) {
      mensagem.lida = true;
      houveAlteracao = true;
    }
  });

  if (houveAlteracao) {
    salvarMensagensChat(mensagens);
  }
}

function selecionarConversaAdmin(clienteId) {
  clienteAdminAtivo = String(clienteAdminAtivo) === String(clienteId) ? null : clienteId;
  renderizarMensagensAdmin();
}

function renderizarMensagensAdmin() {
  if (!listaMensagensClientes) return;

  const mensagens = carregarMensagensChat();

  if (mensagens.length === 0) {
    listaMensagensClientes.innerHTML = `
      <div class="painel-vazio">
        <h3>Nenhuma mensagem encontrada</h3>
        <p>Quando um cliente enviar mensagem pelo chat, ela aparecerá aqui.</p>
      </div>
    `;
    return;
  }

  const conversas = agruparMensagensPorCliente(mensagens).sort(function (a, b) {
    return ultimaDataHora(b) - ultimaDataHora(a);
  });

  const existeAtiva = conversas.some(function (conversa) {
    return String(conversa.clienteId) === String(clienteAdminAtivo);
  });

  if (!existeAtiva) {
    clienteAdminAtivo = null;
  }

  const tirasHTML = conversas.map(function (conversa) {
    const ativa = String(conversa.clienteId) === String(clienteAdminAtivo);
    const naoLida = temMensagemNaoLida(conversa);

    return `
      <button
        type="button"
        class="tira-cliente ${ativa ? "tira-cliente-ativa" : ""}"
        onclick="selecionarConversaAdmin('${conversa.clienteId}')"
      >
        <span class="tira-cliente-nome">${escaparHTML(conversa.clienteNome)}</span>
        ${naoLida ? '<span class="tira-cliente-dot"></span>' : ""}
      </button>
    `;
  }).join("");

  const conversaAtiva = conversas.find(function (conversa) {
    return String(conversa.clienteId) === String(clienteAdminAtivo);
  });

  let conversaHTML = "";

  if (conversaAtiva) {
    marcarConversaComoLida(conversaAtiva);

    const mensagensHTML = conversaAtiva.mensagens.map(function (mensagem) {
      const classe = mensagem.autor === "cliente" ? "msg-admin-cliente" : "msg-admin-barbeiro";
      const autor = mensagem.autor === "cliente" ? conversaAtiva.clienteNome : "Guapo";

      return `
        <div class="msg-admin ${classe}">
          <strong>${escaparHTML(autor)}</strong>
          <p>${escaparHTML(mensagem.texto)}</p>
          <span>${formatarDataHoraMensagem(mensagem.dataHora)}</span>
        </div>
      `;
    }).join("");

    conversaHTML = `
      <article class="conversa-admin-card">
        <div class="conversa-admin-topo">
          <div>
            <h3>${escaparHTML(conversaAtiva.clienteNome)}</h3>
            <p>${escaparHTML(conversaAtiva.clienteEmail)}</p>
            <p>${escaparHTML(conversaAtiva.clienteTelefone)}</p>
          </div>
        </div>

        <div class="conversa-admin-mensagens">
          ${mensagensHTML}
        </div>

        <form class="form-resposta-admin" onsubmit="responderCliente(event, '${conversaAtiva.clienteId}')">
          <input
            type="text"
            id="respostaCliente-${conversaAtiva.clienteId}"
            placeholder="Responder cliente..."
            required
          />

          <button type="submit">
            Responder
          </button>
        </form>
      </article>
    `;
  }

  listaMensagensClientes.innerHTML = `
    <div class="mensagens-tiras">
      ${tirasHTML}
    </div>

    ${conversaHTML}
  `;
}

function responderCliente(event, clienteId) {
  event.preventDefault();

  const inputResposta = document.getElementById(`respostaCliente-${clienteId}`);

  if (!inputResposta) return;

  const texto = inputResposta.value.trim();

  if (!texto) return;

  const mensagens = carregarMensagensChat();

  const mensagensDoCliente = mensagens.filter(function (mensagem) {
    return String(mensagem.clienteId) === String(clienteId);
  });

  if (mensagensDoCliente.length === 0) return;

  const ultimaMensagem = mensagensDoCliente[mensagensDoCliente.length - 1];

  const novaResposta = {
    id: Date.now(),
    clienteId: ultimaMensagem.clienteId,
    clienteNome: ultimaMensagem.clienteNome,
    clienteEmail: ultimaMensagem.clienteEmail,
    clienteTelefone: ultimaMensagem.clienteTelefone,
    autor: "barbeiro",
    texto: texto,
    dataHora: new Date().toISOString(),
    lida: false
  };

  mensagens.push(novaResposta);
  salvarMensagensChat(mensagens);

  inputResposta.value = "";
  renderizarMensagensAdmin();
}

if (btnAtualizarMensagens) {
  btnAtualizarMensagens.addEventListener("click", renderizarMensagensAdmin);
}

renderizarMensagensAdmin();
const API_URL = "/api/agendamentos";

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
  const partes = data.split("-");
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

    const resposta = await fetch(url);
    const agendamentos = await resposta.json();

    renderizarResumo(agendamentos);
    renderizarAgendamentos(agendamentos);

  } catch (erro) {
    console.error("Erro ao carregar agendamentos:", erro);

    listaAgendamentos.innerHTML = `
      <div class="painel-vazio">
        <h3>Erro ao conectar com a API</h3>
        <p>Verifique se o servidor está ligado com <strong>npm start</strong>.</p>
      </div>
    `;
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
  if (agendamentos.length === 0) {
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
            <h3>${agendamento.nome}</h3>
            <p>${formatarData(agendamento.data)} às ${agendamento.horario}</p>
          </div>

          <span class="status-agendamento ${classeStatus(agendamento.status)}">
            ${agendamento.status}
          </span>
        </div>

        <div class="agendamento-admin-info">
          <p><strong>Telefone:</strong> ${agendamento.telefone}</p>
          <p><strong>E-mail:</strong> ${agendamento.email}</p>
          <p><strong>Serviços:</strong> ${agendamento.servicos}</p>
          <p><strong>Total:</strong> ${agendamento.totalEstimado}</p>
          <p><strong>Observação:</strong> ${agendamento.observacao}</p>
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
    const resposta = await fetch(`${API_URL}/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: status })
    });

    const retorno = await resposta.json();

    if (!resposta.ok) {
      alert(retorno.erro || "Erro ao atualizar status.");
      return;
    }

    if (filtroData.value) {
      carregarAgendamentos({ data: filtroData.value });
    } else {
      carregarAgendamentos();
    }

  } catch (erro) {
    console.error("Erro ao alterar status:", erro);
    alert("Erro ao conectar com a API.");
  }
}

async function excluirAgendamento(id) {
  const confirmar = confirm("Tem certeza que deseja excluir este agendamento?");

  if (!confirmar) {
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/${id}`, {
      method: "DELETE"
    });

    const retorno = await resposta.json();

    if (!resposta.ok) {
      alert(retorno.erro || "Erro ao excluir agendamento.");
      return;
    }

    if (filtroData.value) {
      carregarAgendamentos({ data: filtroData.value });
    } else {
      carregarAgendamentos();
    }

  } catch (erro) {
    console.error("Erro ao excluir:", erro);
    alert("Erro ao conectar com a API.");
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
  carregarAgendamentos({ data: filtroData.value });
});

carregarAgendamentos();
const GUAPO_API_URL = "http://localhost:3000";

const usuarioLogado = pegarUsuarioLogado();

if (!usuarioLogado) {
  localStorage.setItem("guapo_redirect_apos_login", "agendamento.html");
  window.location.href = "login.html";
  throw new Error("Cliente precisa estar logado para agendar.");
}

if (usuarioLogado.tipo === "barbeiro") {
  window.location.href = "painel.html";
  throw new Error("Barbeiro não agenda como cliente.");
}

let etapaAtual = 1;
let servicosSelecionados = [];
let horarioSelecionado = "";

const etapas = {
  1: document.getElementById("etapaServicos"),
  2: document.getElementById("etapaHorario"),
  3: document.getElementById("etapaConfirmar")
};

const btnProximo = document.getElementById("btnProximo");
const btnVoltar = document.getElementById("btnVoltar");
const resumoQuantidade = document.getElementById("resumoQuantidade");
const resumoValor = document.getElementById("resumoValor");
const resumoFinal = document.getElementById("resumoFinal");
const mensagemStatus = document.getElementById("mensagemStatus");

const campoData = document.getElementById("data");
const inputHorario = document.getElementById("horario");
const datasCarrossel = document.getElementById("datasCarrossel");
const horariosGrid = document.getElementById("horariosGrid");

const confirmarNome = document.getElementById("confirmarNome");
const confirmarEmail = document.getElementById("confirmarEmail");
const confirmarTelefone = document.getElementById("confirmarTelefone");

const horariosBase = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30"
];

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const meses = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez"
];

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarDataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function formatarDataBR(dataISO) {
  if (!dataISO) {
    return "";
  }

  const partes = dataISO.split("-");
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function criarDatasCarrossel() {
  if (!datasCarrossel || !horariosGrid || !campoData) {
    return;
  }

  datasCarrossel.innerHTML = "";

  const hoje = new Date();

  for (let i = 0; i < 21; i++) {
    const data = new Date();
    data.setDate(hoje.getDate() + i);

    const dataISO = formatarDataISO(data);
    const diaSemana = diasSemana[data.getDay()];
    const dia = data.getDate();
    const mes = meses[data.getMonth()];
    const ano = String(data.getFullYear()).slice(2);

    const botao = document.createElement("button");
    botao.type = "button";
    botao.classList.add("data-card");
    botao.dataset.data = dataISO;

    botao.innerHTML = `
      <span>${diaSemana}</span>
      <strong>${dia}</strong>
      <small>${mes}/${ano}</small>
    `;

    botao.addEventListener("click", function () {
      selecionarDataCarrossel(dataISO, botao);
    });

    datasCarrossel.appendChild(botao);
  }

  const primeiraData = datasCarrossel.querySelector(".data-card");

  if (primeiraData) {
    primeiraData.click();
  }
}

async function selecionarDataCarrossel(dataISO, botaoSelecionado) {
  campoData.value = dataISO;
  horarioSelecionado = "";

  if (inputHorario) {
    inputHorario.value = "";
  }

  document.querySelectorAll(".data-card").forEach(function (botao) {
    botao.classList.remove("ativo");
  });

  botaoSelecionado.classList.add("ativo");

  await carregarHorariosDisponiveis(dataISO);
  validarEtapa();
}

async function carregarHorariosDisponiveis(dataISO) {
  if (!horariosGrid) {
    return;
  }

  horariosGrid.innerHTML = "<p class='horarios-msg'>Carregando horários...</p>";

  try {
    const resposta = await fetch(`${GUAPO_API_URL}/api/agendamentos?data=${dataISO}`);
    const agendamentos = await resposta.json();

    const horariosOcupados = agendamentos
      .filter(function (agendamento) {
        const status = String(agendamento.status || "").toLowerCase();
        return !status.includes("cancel");
      })
      .map(function (agendamento) {
        return agendamento.horario;
      });

    const horariosDisponiveis = horariosBase.filter(function (horario) {
      return !horariosOcupados.includes(horario);
    });

    if (horariosDisponiveis.length === 0) {
      horariosGrid.innerHTML = `
        <p class="horarios-msg">
          Nenhum horário disponível para este dia.
        </p>
      `;
      return;
    }

    horariosGrid.innerHTML = "";

    horariosDisponiveis.forEach(function (horario) {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.classList.add("horario-card");
      botao.textContent = horario;

      botao.addEventListener("click", function () {
        selecionarHorarioCarrossel(horario, botao);
      });

      horariosGrid.appendChild(botao);
    });

  } catch (erro) {
    console.error("Erro ao carregar horários:", erro);

    horariosGrid.innerHTML = `
      <p class="horarios-msg">
        Erro ao carregar horários disponíveis. Verifique se a API está ligada.
      </p>
    `;
  }
}

function selecionarHorarioCarrossel(horario, botaoSelecionado) {
  horarioSelecionado = horario;

  if (inputHorario) {
    inputHorario.value = horario;
  }

  document.querySelectorAll(".horario-card").forEach(function (botao) {
    botao.classList.remove("ativo");
  });

  botaoSelecionado.classList.add("ativo");

  validarEtapa();
}

function atualizarPassos() {
  document.querySelectorAll(".agenda-etapa").forEach(function (etapa) {
    etapa.classList.remove("ativa");
  });

  if (etapas[etapaAtual]) {
    etapas[etapaAtual].classList.add("ativa");
  }

  document.querySelectorAll(".passo").forEach(function (passo) {
    const numeroPasso = Number(passo.dataset.passo);

    if (numeroPasso === etapaAtual) {
      passo.classList.add("ativo");
    } else {
      passo.classList.remove("ativo");
    }
  });

  btnVoltar.style.display = etapaAtual === 1 ? "none" : "inline-block";

  if (etapaAtual === 3) {
    btnProximo.textContent = "Enviar solicitação";
  } else {
    btnProximo.textContent = "Próximo";
  }

  validarEtapa();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function atualizarResumo() {
  const total = servicosSelecionados.reduce(function (soma, servico) {
    return soma + servico.preco;
  }, 0);

  if (servicosSelecionados.length === 0) {
    resumoQuantidade.textContent = "Nenhum serviço selecionado";
    resumoValor.textContent = "Selecione um serviço para continuar";
    return;
  }

  resumoQuantidade.textContent =
    servicosSelecionados.length === 1
      ? "1 serviço selecionado"
      : `${servicosSelecionados.length} serviços selecionados`;

  resumoValor.textContent = `Total estimado: ${formatarMoeda(total)}`;
}

function validarEtapa() {
  if (etapaAtual === 1) {
    btnProximo.disabled = servicosSelecionados.length === 0;
    return;
  }

  if (etapaAtual === 2) {
    btnProximo.disabled = !campoData.value || !horarioSelecionado;
    return;
  }

  if (etapaAtual === 3) {
    btnProximo.disabled = false;
    return;
  }

  btnProximo.disabled = false;
}

document.querySelectorAll(".agenda-servico").forEach(function (card) {
  const botao = card.querySelector("button");

  botao.addEventListener("click", function () {
    const nome = card.dataset.nome;
    const preco = Number(card.dataset.preco);
    const tempo = card.dataset.tempo;
    const apartir = card.dataset.apartir === "true";

    const jaSelecionado = servicosSelecionados.find(function (servico) {
      return servico.nome === nome;
    });

    if (jaSelecionado) {
      servicosSelecionados = servicosSelecionados.filter(function (servico) {
        return servico.nome !== nome;
      });

      card.classList.remove("selecionado");
      botao.textContent = "Selecionar";
    } else {
      servicosSelecionados.push({
        nome: nome,
        preco: preco,
        tempo: tempo,
        apartir: apartir
      });

      card.classList.add("selecionado");
      botao.textContent = "Selecionado";
    }

    atualizarResumo();
    validarEtapa();
  });
});

const campoObservacao = document.getElementById("observacao");

if (campoObservacao) {
  campoObservacao.addEventListener("input", montarResumoFinal);
  campoObservacao.addEventListener("change", montarResumoFinal);
}

btnVoltar.addEventListener("click", function () {
  if (etapaAtual > 1) {
    etapaAtual--;
    atualizarPassos();
  }
});

btnProximo.addEventListener("click", async function () {
  if (etapaAtual === 1) {
    if (servicosSelecionados.length === 0) {
      alert("Selecione pelo menos um serviço.");
      return;
    }

    etapaAtual = 2;
    atualizarPassos();
    return;
  }

  if (etapaAtual === 2) {
    if (!campoData.value || !horarioSelecionado) {
      alert("Selecione a data e o horário.");
      return;
    }

    montarResumoFinal();
    etapaAtual = 3;
    atualizarPassos();
    return;
  }

  if (etapaAtual === 3) {
    await enviarAgendamento();
  }
});

function montarResumoFinal() {
  const observacao = document.getElementById("observacao")
    ? document.getElementById("observacao").value.trim()
    : "";

  const total = servicosSelecionados.reduce(function (soma, servico) {
    return soma + servico.preco;
  }, 0);

  const listaServicos = servicosSelecionados
    .map(function (servico) {
      const textoPreco = servico.apartir
        ? `A partir de ${formatarMoeda(servico.preco)}`
        : formatarMoeda(servico.preco);

      return `<li>${servico.nome} - ${textoPreco} - ${servico.tempo}</li>`;
    })
    .join("");

  if (confirmarNome) confirmarNome.textContent = usuarioLogado.nome || "Cliente";
  if (confirmarEmail) confirmarEmail.textContent = usuarioLogado.email || "Não informado";
  if (confirmarTelefone) confirmarTelefone.textContent = usuarioLogado.telefone || "Não informado";

  resumoFinal.innerHTML = `
    <p><strong>Data:</strong> ${formatarDataBR(campoData.value)}</p>
    <p><strong>Horário:</strong> ${horarioSelecionado}</p>
    <p><strong>Serviços:</strong></p>
    <ul>${listaServicos}</ul>
    <p><strong>Total estimado:</strong> ${formatarMoeda(total)}</p>
    <p><strong>Observação:</strong> ${observacao || "Sem observação"}</p>
  `;
}

async function enviarAgendamento() {
  const observacao = document.getElementById("observacao")
    ? document.getElementById("observacao").value.trim()
    : "";

  const total = servicosSelecionados.reduce(function (soma, servico) {
    return soma + servico.preco;
  }, 0);

  const servicosTexto = servicosSelecionados
    .map(function (servico) {
      const preco = servico.apartir
        ? `A partir de ${formatarMoeda(servico.preco)}`
        : formatarMoeda(servico.preco);

      return `${servico.nome} - ${preco} - ${servico.tempo}`;
    })
    .join(" | ");

  const dadosAgendamento = {
    clienteId: usuarioLogado.id,
    nome: usuarioLogado.nome,
    telefone: usuarioLogado.telefone || "",
    email: usuarioLogado.email || "",
    data: campoData.value,
    horario: horarioSelecionado,
    servicos: servicosTexto,
    totalEstimado: formatarMoeda(total),
    observacao: observacao || "Sem observação"
  };

  mensagemStatus.textContent = "Enviando solicitação...";
  btnProximo.disabled = true;

  try {
    const resposta = await fetch(`${GUAPO_API_URL}/api/agendamentos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dadosAgendamento)
    });

    const retorno = await resposta.json();

    if (resposta.ok) {
      mensagemStatus.textContent = "Solicitação enviada com sucesso! Aguarde a confirmação do horário.";

      btnProximo.style.display = "none";
      btnVoltar.style.display = "none";

      resumoQuantidade.textContent = "Agendamento enviado";
      resumoValor.textContent = "O agendamento foi salvo no banco de dados.";

      setTimeout(function () {
        window.location.href = "cliente.html";
      }, 2500);
    } else {
      mensagemStatus.textContent = retorno.mensagem || retorno.erro || "Não foi possível enviar. Tente novamente.";
      btnProximo.disabled = false;
    }
  } catch (erro) {
    console.error("Erro ao enviar para API:", erro);
    mensagemStatus.textContent = "Erro ao conectar com a API. Verifique se o servidor está ligado.";
    btnProximo.disabled = false;
  }
}

criarDatasCarrossel();
atualizarResumo();
atualizarPassos();
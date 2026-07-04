const emailGuapo = "sisabelli566@gmail.com";

let etapaAtual = 1;
let servicosSelecionados = [];
let horarioSelecionado = "";

const etapas = {
  1: document.getElementById("etapaServicos"),
  2: document.getElementById("etapaHorario"),
  3: document.getElementById("etapaDados"),
  4: document.getElementById("etapaConfirmar")
};

const btnProximo = document.getElementById("btnProximo");
const btnVoltar = document.getElementById("btnVoltar");
const resumoQuantidade = document.getElementById("resumoQuantidade");
const resumoValor = document.getElementById("resumoValor");
const resumoFinal = document.getElementById("resumoFinal");
const mensagemStatus = document.getElementById("mensagemStatus");

const campoData = document.getElementById("data");

if (campoData) {
  const hoje = new Date().toISOString().split("T")[0];
  campoData.setAttribute("min", hoje);
}

async function carregarHorariosOcupados() {
  if (!campoData.value) {
    return;
  }

  try {
    const resposta = await fetch(`http://localhost:3000/api/horarios-ocupados?data=${campoData.value}`);
    const dados = await resposta.json();

    const horariosOcupados = dados.horariosOcupados || [];

    document.querySelectorAll(".agenda-horarios button").forEach(function (botao) {
      const horarioBotao = botao.textContent.trim();

      botao.disabled = false;
      botao.classList.remove("ocupado");

      if (horariosOcupados.includes(horarioBotao)) {
        botao.disabled = true;
        botao.classList.add("ocupado");
        botao.textContent = `${horarioBotao} - Ocupado`;
      }
    });

  } catch (erro) {
    console.error("Erro ao carregar horários ocupados:", erro);
  }
}

if (campoData) {
  campoData.addEventListener("change", function () {
    horarioSelecionado = "";

    document.querySelectorAll(".agenda-horarios button").forEach(function (botao) {
      botao.classList.remove("selecionado");
    });

    carregarHorariosOcupados();
    validarEtapa();
  });
}

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function atualizarPassos() {
  document.querySelectorAll(".agenda-etapa").forEach(function (etapa) {
    etapa.classList.remove("ativa");
  });

  etapas[etapaAtual].classList.add("ativa");

  document.querySelectorAll(".passo").forEach(function (passo) {
    const numeroPasso = Number(passo.dataset.passo);

    if (numeroPasso === etapaAtual) {
      passo.classList.add("ativo");
    } else {
      passo.classList.remove("ativo");
    }
  });

  btnVoltar.style.display = etapaAtual === 1 ? "none" : "inline-block";

  if (etapaAtual === 4) {
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
    const nome = document.getElementById("nome").value.trim();
    const telefone = document.getElementById("telefone").value.trim();

    btnProximo.disabled = !nome || !telefone;
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
        nome,
        preco,
        tempo,
        apartir
      });

      card.classList.add("selecionado");
      botao.textContent = "Selecionado";
    }

    atualizarResumo();
    validarEtapa();
  });
});

document.querySelectorAll(".agenda-horarios button").forEach(function (botao) {
  botao.addEventListener("click", function () {
    document.querySelectorAll(".agenda-horarios button").forEach(function (item) {
      item.classList.remove("selecionado");
    });

    botao.classList.add("selecionado");
    horarioSelecionado = botao.textContent.trim();

    validarEtapa();
  });
});

["data", "nome", "telefone", "emailCliente", "observacao"].forEach(function (id) {
  const campo = document.getElementById(id);

  if (campo) {
    campo.addEventListener("input", validarEtapa);
    campo.addEventListener("change", validarEtapa);
  }
});

btnVoltar.addEventListener("click", function () {
  if (etapaAtual > 1) {
    etapaAtual--;
    atualizarPassos();
  }
});

btnProximo.addEventListener("click", async function () {
  if (etapaAtual === 1 && servicosSelecionados.length === 0) {
    alert("Selecione pelo menos um serviço.");
    return;
  }

  if (etapaAtual === 2 && (!campoData.value || !horarioSelecionado)) {
    alert("Selecione a data e o horário.");
    return;
  }

  if (etapaAtual === 3) {
    const nome = document.getElementById("nome").value.trim();
    const telefone = document.getElementById("telefone").value.trim();

    if (!nome || !telefone) {
      alert("Preencha nome e telefone.");
      return;
    }

    montarResumoFinal();
  }

  if (etapaAtual < 4) {
    etapaAtual++;
    atualizarPassos();
    return;
  }

  await enviarAgendamento();
});

function montarResumoFinal() {
  const nome = document.getElementById("nome").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const emailCliente = document.getElementById("emailCliente").value.trim();
  const observacao = document.getElementById("observacao").value.trim();

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

  resumoFinal.innerHTML = `
    <p><strong>Nome:</strong> ${nome}</p>
    <p><strong>Telefone:</strong> ${telefone}</p>
    <p><strong>E-mail:</strong> ${emailCliente || "Não informado"}</p>
    <p><strong>Data:</strong> ${campoData.value}</p>
    <p><strong>Horário:</strong> ${horarioSelecionado}</p>
    <p><strong>Serviços:</strong></p>
    <ul>${listaServicos}</ul>
    <p><strong>Total estimado:</strong> ${formatarMoeda(total)}</p>
    <p><strong>Observação:</strong> ${observacao || "Sem observação"}</p>
  `;
}

async function enviarAgendamento() {
  const nome = document.getElementById("nome").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const emailCliente = document.getElementById("emailCliente").value.trim();
  const observacao = document.getElementById("observacao").value.trim();

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
    nome: nome,
    telefone: telefone,
    email: emailCliente || "Não informado",
    data: campoData.value,
    horario: horarioSelecionado,
    servicos: servicosTexto,
    totalEstimado: formatarMoeda(total),
    observacao: observacao || "Sem observação"
  };

  mensagemStatus.textContent = "Enviando solicitação...";
  btnProximo.disabled = true;

  try {
    const resposta = await fetch("http://localhost:3000/api/agendamentos", {
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
      resumoValor.textContent = "O agendamento foi salvo na API.";
    } else {
      mensagemStatus.textContent = retorno.erro || "Não foi possível enviar. Tente novamente.";
      btnProximo.disabled = false;
    }
  } catch (erro) {
    console.error("Erro ao enviar para API:", erro);
    mensagemStatus.textContent = "Erro ao conectar com a API. Verifique se o servidor está ligado.";
    btnProximo.disabled = false;
  }
}
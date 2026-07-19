const AGENDAMENTO_API_URL = "http://localhost:3000";

const usuarioLogado = pegarUsuarioLogado();

// =========================
// PROTEÇÃO DA PÁGINA
// =========================

if (!usuarioLogado) {
  localStorage.setItem(
    "guapo_redirect_apos_login",
    "agendamento.html"
  );

  window.location.replace("login.html");

  throw new Error("Cliente precisa estar logado para agendar.");
}

if (usuarioLogado.tipo === "barbeiro") {
  window.location.replace("painel.html");

  throw new Error("Barbeiro não pode agendar como cliente.");
}

// Remove redirecionamentos antigos
localStorage.removeItem("guapo_redirect_apos_login");

// =========================
// VARIÁVEIS
// =========================

let etapaAtual = 1;
let servicosSelecionados = [];
let horarioSelecionado = "";
let enviandoAgendamento = false;

const etapas = {
  1: document.getElementById("etapaServicos"),
  2: document.getElementById("etapaHorario"),
  3: document.getElementById("etapaConfirmar")
};

const btnProximo = document.getElementById("btnProximo");
const btnVoltar = document.getElementById("btnVoltar");

const resumoQuantidade =
  document.getElementById("resumoQuantidade");

const resumoValor =
  document.getElementById("resumoValor");

const resumoFinal =
  document.getElementById("resumoFinal");

const mensagemStatus =
  document.getElementById("mensagemStatus");

const campoData =
  document.getElementById("data");

const inputHorario =
  document.getElementById("horario");

const datasCarrossel =
  document.getElementById("datasCarrossel");

const horariosGrid =
  document.getElementById("horariosGrid");

const confirmarNome =
  document.getElementById("confirmarNome");

const confirmarEmail =
  document.getElementById("confirmarEmail");

const confirmarTelefone =
  document.getElementById("confirmarTelefone");

const campoObservacao =
  document.getElementById("observacao");

const diasSemana = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb"
];

const meses = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez"
];

// =========================
// FORMATAÇÃO
// =========================

function formatarMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarDataISO(data) {
  const ano = data.getFullYear();

  const mes = String(
    data.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    data.getDate()
  ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function formatarDataBR(dataISO) {
  if (!dataISO) {
    return "";
  }

  const partes = String(dataISO)
    .split("T")[0]
    .split("-");

  if (partes.length !== 3) {
    return dataISO;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function escaparHTML(texto) {
  const div = document.createElement("div");

  div.textContent = texto || "";

  return div.innerHTML;
}

function normalizarHorario(horario) {
  if (!horario) {
    return "";
  }

  return String(horario).slice(0, 5);
}

// =========================
// TEMPO DOS SERVIÇOS
// =========================

function converterTempoParaMinutos(tempo) {
  if (!tempo) {
    return 30;
  }

  const partes = String(tempo).split(":");

  const horas = Number(partes[0]) || 0;
  const minutos = Number(partes[1]) || 0;

  return (horas * 60) + minutos;
}

function converterHorarioParaMinutos(horario) {
  const horarioNormalizado =
    normalizarHorario(horario);

  if (!horarioNormalizado) {
    return 0;
  }

  const partes =
    horarioNormalizado.split(":");

  const horas = Number(partes[0]) || 0;
  const minutos = Number(partes[1]) || 0;

  return (horas * 60) + minutos;
}

function converterMinutosParaHorario(minutosTotais) {
  const horas = String(
    Math.floor(minutosTotais / 60)
  ).padStart(2, "0");

  const minutos = String(
    minutosTotais % 60
  ).padStart(2, "0");

  return `${horas}:${minutos}`;
}

function calcularDuracaoTotalServicos() {
  const duracao = servicosSelecionados.reduce(
    function (total, servico) {
      return total +
        converterTempoParaMinutos(servico.tempo);
    },
    0
  );

  return Math.max(duracao, 5);
}

/*
  Lê a duração dos serviços já gravados no banco.

  Exemplo:
  Corte - R$ 50,00 - 00:30 |
  Sobrancelha - R$ 10,00 - 00:05
*/
function calcularDuracaoAgendamentoExistente(
  agendamento
) {
  const textoServicos = String(
    agendamento.servicos ||
    agendamento.servico ||
    ""
  );

  const temposEncontrados =
    textoServicos.match(/\b\d{1,2}:\d{2}\b/g);

  if (
    !temposEncontrados ||
    temposEncontrados.length === 0
  ) {
    return 30;
  }

  const total = temposEncontrados.reduce(
    function (soma, tempo) {
      return soma +
        converterTempoParaMinutos(tempo);
    },
    0
  );

  return Math.max(total, 5);
}

// =========================
// HORÁRIO DE FUNCIONAMENTO
// =========================

function obterHorarioFuncionamento(dataISO) {
  const data = new Date(
    `${dataISO}T12:00:00`
  );

  const diaSemana = data.getDay();

  // Domingo e segunda não atende
  if (diaSemana === 0 || diaSemana === 1) {
    return null;
  }

  // Sábado: 09:00 às 15:30
  if (diaSemana === 6) {
    return {
      abertura: 9 * 60,
      fechamento: (15 * 60) + 30
    };
  }

  // Terça a sexta: 09:00 às 19:00
  return {
    abertura: 9 * 60,
    fechamento: 19 * 60
  };
}

function horarioJaPassou(dataISO, horarioMinutos) {
  const hoje = new Date();

  const hojeISO = formatarDataISO(hoje);

  if (dataISO !== hojeISO) {
    return false;
  }

  const agoraEmMinutos =
    (hoje.getHours() * 60) +
    hoje.getMinutes();

  return horarioMinutos <= agoraEmMinutos;
}

function existeConflito(
  inicioNovo,
  fimNovo,
  intervalosOcupados
) {
  return intervalosOcupados.some(
    function (intervalo) {
      return (
        inicioNovo < intervalo.fim &&
        fimNovo > intervalo.inicio
      );
    }
  );
}

function gerarHorariosDisponiveis(
  dataISO,
  agendamentos
) {
  const funcionamento =
    obterHorarioFuncionamento(dataISO);

  if (!funcionamento) {
    return [];
  }

  const duracaoNova =
    calcularDuracaoTotalServicos();

  const intervalosOcupados =
    agendamentos
      .filter(function (agendamento) {
        const status = String(
          agendamento.status || ""
        ).toLowerCase();

        return !status.includes("cancel");
      })
      .map(function (agendamento) {
        const inicio =
          converterHorarioParaMinutos(
            agendamento.horario
          );

        const duracao =
          calcularDuracaoAgendamentoExistente(
            agendamento
          );

        return {
          inicio: inicio,
          fim: inicio + duracao
        };
      });

  const horarios = [];

  /*
    Os horários começam a cada 30 minutos.

    A duração real do serviço é respeitada na hora
    de verificar fechamento e conflito.
  */
  for (
    let inicio = funcionamento.abertura;
    inicio + duracaoNova <= funcionamento.fechamento;
    inicio += 30
  ) {
    const fim = inicio + duracaoNova;

    if (horarioJaPassou(dataISO, inicio)) {
      continue;
    }

    if (
      existeConflito(
        inicio,
        fim,
        intervalosOcupados
      )
    ) {
      continue;
    }

    horarios.push(
      converterMinutosParaHorario(inicio)
    );
  }

  return horarios;
}

// =========================
// DATAS DISPONÍVEIS
// =========================

function criarDatasCarrossel() {
  if (
    !datasCarrossel ||
    !horariosGrid ||
    !campoData
  ) {
    return;
  }

  datasCarrossel.innerHTML = "";

  const hoje = new Date();

  let diasDisponiveisAdicionados = 0;
  let diasAvancados = 0;

  /*
    Exibe os próximos 21 dias de atendimento,
    pulando domingo e segunda.
  */
  while (diasDisponiveisAdicionados < 21) {
    const data = new Date(hoje);

    data.setDate(
      hoje.getDate() + diasAvancados
    );

    diasAvancados++;

    const numeroDiaSemana =
      data.getDay();

    // Não mostra domingo nem segunda
    if (
      numeroDiaSemana === 0 ||
      numeroDiaSemana === 1
    ) {
      continue;
    }

    const dataISO =
      formatarDataISO(data);

    const diaSemana =
      diasSemana[numeroDiaSemana];

    const dia =
      data.getDate();

    const mes =
      meses[data.getMonth()];

    const ano =
      String(data.getFullYear()).slice(2);

    const botao =
      document.createElement("button");

    botao.type = "button";

    botao.classList.add("data-card");

    botao.dataset.data = dataISO;

    botao.innerHTML = `
      <span>${diaSemana}</span>
      <strong>${dia}</strong>
      <small>${mes}/${ano}</small>
    `;

    botao.addEventListener(
      "click",
      function () {
        selecionarDataCarrossel(
          dataISO,
          botao
        );
      }
    );

    datasCarrossel.appendChild(botao);

    diasDisponiveisAdicionados++;
  }

  const primeiraData =
    datasCarrossel.querySelector(
      ".data-card"
    );

  if (primeiraData) {
    primeiraData.click();
  }
}

async function selecionarDataCarrossel(
  dataISO,
  botaoSelecionado
) {
  campoData.value = dataISO;

  horarioSelecionado = "";

  if (inputHorario) {
    inputHorario.value = "";
  }

  document
    .querySelectorAll(".data-card")
    .forEach(function (botao) {
      botao.classList.remove("ativo");
    });

  botaoSelecionado.classList.add("ativo");

  await carregarHorariosDisponiveis(
    dataISO
  );

  validarEtapa();
}

// =========================
// CARREGAR HORÁRIOS
// =========================

async function carregarHorariosDisponiveis(
  dataISO
) {
  if (!horariosGrid) {
    return;
  }

  horariosGrid.innerHTML = `
    <p class="horarios-msg">
      Carregando horários...
    </p>
  `;

  try {
    const resposta = await fetch(
      `${AGENDAMENTO_API_URL}/api/agendamentos?data=${encodeURIComponent(dataISO)}`
    );

    const retorno =
      await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        retorno.mensagem ||
        "Erro ao carregar horários."
      );
    }

    const agendamentos =
      Array.isArray(retorno)
        ? retorno
        : [];

    const horariosDisponiveis =
      gerarHorariosDisponiveis(
        dataISO,
        agendamentos
      );

    if (horariosDisponiveis.length === 0) {
      horariosGrid.innerHTML = `
        <p class="horarios-msg">
          Nenhum horário disponível para este dia.
        </p>
      `;

      return;
    }

    horariosGrid.innerHTML = "";

    horariosDisponiveis.forEach(
      function (horario) {
        const botao =
          document.createElement("button");

        botao.type = "button";

        botao.classList.add(
          "horario-card"
        );

        botao.textContent = horario;

        botao.addEventListener(
          "click",
          function () {
            selecionarHorarioCarrossel(
              horario,
              botao
            );
          }
        );

        horariosGrid.appendChild(botao);
      }
    );

  } catch (erro) {
    console.error(
      "Erro ao carregar horários:",
      erro
    );

    horariosGrid.innerHTML = `
      <p class="horarios-msg">
        Erro ao carregar horários.
        Verifique se a API está ligada.
      </p>
    `;
  }
}

function selecionarHorarioCarrossel(
  horario,
  botaoSelecionado
) {
  horarioSelecionado = horario;

  if (inputHorario) {
    inputHorario.value = horario;
  }

  document
    .querySelectorAll(".horario-card")
    .forEach(function (botao) {
      botao.classList.remove("ativo");
    });

  botaoSelecionado.classList.add("ativo");

  validarEtapa();
}

// =========================
// CONTROLE DAS ETAPAS
// =========================

function atualizarPassos() {
  document
    .querySelectorAll(".agenda-etapa")
    .forEach(function (etapa) {
      etapa.classList.remove("ativa");
    });

  if (etapas[etapaAtual]) {
    etapas[etapaAtual].classList.add(
      "ativa"
    );
  }

  document
    .querySelectorAll(".passo")
    .forEach(function (passo) {
      const numeroPasso = Number(
        passo.dataset.passo
      );

      if (numeroPasso === etapaAtual) {
        passo.classList.add("ativo");
      } else {
        passo.classList.remove("ativo");
      }
    });

  btnVoltar.style.display =
    etapaAtual === 1
      ? "none"
      : "inline-block";

  btnProximo.textContent =
    etapaAtual === 3
      ? "Enviar solicitação"
      : "Próximo";

  validarEtapa();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function validarEtapa() {
  if (etapaAtual === 1) {
    btnProximo.disabled =
      servicosSelecionados.length === 0;

    return;
  }

  if (etapaAtual === 2) {
    btnProximo.disabled =
      !campoData.value ||
      !horarioSelecionado;

    return;
  }

  btnProximo.disabled = false;
}

// =========================
// SERVIÇOS
// =========================

function atualizarResumo() {
  const total =
    servicosSelecionados.reduce(
      function (soma, servico) {
        return soma + servico.preco;
      },
      0
    );

  if (servicosSelecionados.length === 0) {
    resumoQuantidade.textContent =
      "Nenhum serviço selecionado";

    resumoValor.textContent =
      "Selecione um serviço para continuar";

    return;
  }

  resumoQuantidade.textContent =
    servicosSelecionados.length === 1
      ? "1 serviço selecionado"
      : `${servicosSelecionados.length} serviços selecionados`;

  resumoValor.textContent =
    `Total estimado: ${formatarMoeda(total)}`;
}

document
  .querySelectorAll(".agenda-servico")
  .forEach(function (card) {
    const botao =
      card.querySelector("button");

    if (!botao) {
      return;
    }

    botao.addEventListener(
      "click",
      function () {
        const nome =
          card.dataset.nome;

        const preco =
          Number(card.dataset.preco);

        const tempo =
          card.dataset.tempo;

        const apartir =
          card.dataset.apartir === "true";

        const jaSelecionado =
          servicosSelecionados.find(
            function (servico) {
              return servico.nome === nome;
            }
          );

        if (jaSelecionado) {
          servicosSelecionados =
            servicosSelecionados.filter(
              function (servico) {
                return servico.nome !== nome;
              }
            );

          card.classList.remove(
            "selecionado"
          );

          botao.textContent =
            "Selecionar";

        } else {
          servicosSelecionados.push({
            nome: nome,
            preco: preco,
            tempo: tempo,
            apartir: apartir
          });

          card.classList.add(
            "selecionado"
          );

          botao.textContent =
            "Selecionado";
        }

        /*
          Ao mudar serviços, o horário selecionado
          precisa ser validado novamente.
        */
        horarioSelecionado = "";

        if (inputHorario) {
          inputHorario.value = "";
        }

        atualizarResumo();
        validarEtapa();
      }
    );
  });

// =========================
// BOTÕES
// =========================

btnVoltar.addEventListener(
  "click",
  function () {
    if (etapaAtual > 1) {
      etapaAtual--;

      atualizarPassos();
    }
  }
);

btnProximo.addEventListener(
  "click",
  async function () {
    if (etapaAtual === 1) {
      if (
        servicosSelecionados.length === 0
      ) {
        alert(
          "Selecione pelo menos um serviço."
        );

        return;
      }

      etapaAtual = 2;

      atualizarPassos();

      /*
        Recalcula os horários considerando
        a duração dos serviços selecionados.
      */
      if (campoData.value) {
        await carregarHorariosDisponiveis(
          campoData.value
        );
      }

      return;
    }

    if (etapaAtual === 2) {
      if (
        !campoData.value ||
        !horarioSelecionado
      ) {
        alert(
          "Selecione a data e o horário."
        );

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
  }
);

if (campoObservacao) {
  campoObservacao.addEventListener(
    "input",
    function () {
      if (etapaAtual === 3) {
        montarResumoFinal();
      }
    }
  );
}

// =========================
// RESUMO FINAL
// =========================

function montarResumoFinal() {
  const observacao =
    campoObservacao
      ? campoObservacao.value.trim()
      : "";

  const total =
    servicosSelecionados.reduce(
      function (soma, servico) {
        return soma + servico.preco;
      },
      0
    );

  const listaServicos =
    servicosSelecionados
      .map(function (servico) {
        const textoPreco =
          servico.apartir
            ? `A partir de ${formatarMoeda(servico.preco)}`
            : formatarMoeda(servico.preco);

        return `
          <li>
            ${escaparHTML(servico.nome)}
            -
            ${textoPreco}
            -
            ${escaparHTML(servico.tempo)}
          </li>
        `;
      })
      .join("");

  if (confirmarNome) {
    confirmarNome.textContent =
      usuarioLogado.nome ||
      "Cliente";
  }

  if (confirmarEmail) {
    confirmarEmail.textContent =
      usuarioLogado.email ||
      "Não informado";
  }

  if (confirmarTelefone) {
    confirmarTelefone.textContent =
      usuarioLogado.telefone ||
      "Não informado";
  }

  resumoFinal.innerHTML = `
    <p>
      <strong>Data:</strong>
      ${formatarDataBR(campoData.value)}
    </p>

    <p>
      <strong>Horário:</strong>
      ${escaparHTML(horarioSelecionado)}
    </p>

    <p>
      <strong>Serviços:</strong>
    </p>

    <ul>
      ${listaServicos}
    </ul>

    <p>
      <strong>Total estimado:</strong>
      ${formatarMoeda(total)}
    </p>

    <p>
      <strong>Observação:</strong>
      ${escaparHTML(
        observacao ||
        "Sem observação"
      )}
    </p>
  `;
}

// =========================
// ENVIAR AGENDAMENTO
// =========================

async function enviarAgendamento() {
  if (enviandoAgendamento) {
    return;
  }

  enviandoAgendamento = true;

  const observacao =
    campoObservacao
      ? campoObservacao.value.trim()
      : "";

  const total =
    servicosSelecionados.reduce(
      function (soma, servico) {
        return soma + servico.preco;
      },
      0
    );

  const servicosTexto =
    servicosSelecionados
      .map(function (servico) {
        const preco =
          servico.apartir
            ? `A partir de ${formatarMoeda(servico.preco)}`
            : formatarMoeda(servico.preco);

        return (
          `${servico.nome} - ` +
          `${preco} - ` +
          `${servico.tempo}`
        );
      })
      .join(" | ");

  const dadosAgendamento = {
    clienteId: usuarioLogado.id,
    nome: usuarioLogado.nome,
    telefone:
      usuarioLogado.telefone || "",
    email:
      usuarioLogado.email || "",
    data:
      campoData.value,
    horario:
      horarioSelecionado,
    servicos:
      servicosTexto,
    totalEstimado:
      formatarMoeda(total),
    observacao:
      observacao || "Sem observação"
  };

  mensagemStatus.textContent =
    "Enviando solicitação...";

  btnProximo.disabled = true;

  try {
    /*
      Confere mais uma vez se o horário continua livre
      antes de salvar.
    */
    const respostaConsulta = await fetch(
      `${AGENDAMENTO_API_URL}/api/agendamentos?data=${encodeURIComponent(campoData.value)}`
    );

    const agendamentosAtuais =
      await respostaConsulta.json();

    if (!respostaConsulta.ok) {
      throw new Error(
        agendamentosAtuais.mensagem ||
        "Erro ao conferir o horário."
      );
    }

    const horariosAtuais =
      gerarHorariosDisponiveis(
        campoData.value,
        Array.isArray(agendamentosAtuais)
          ? agendamentosAtuais
          : []
      );

    if (
      !horariosAtuais.includes(
        horarioSelecionado
      )
    ) {
      mensagemStatus.textContent =
        "Esse horário acabou de ficar indisponível. Volte e escolha outro horário.";

      btnProximo.disabled = false;
      enviandoAgendamento = false;

      return;
    }

    const resposta = await fetch(
      `${AGENDAMENTO_API_URL}/api/agendamentos`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(
          dadosAgendamento
        )
      }
    );

    const retorno =
      await resposta.json();

    if (!resposta.ok) {
      mensagemStatus.textContent =
        retorno.mensagem ||
        retorno.erro ||
        "Não foi possível enviar. Tente novamente.";

      btnProximo.disabled = false;
      enviandoAgendamento = false;

      return;
    }

    mensagemStatus.textContent =
      "Solicitação enviada com sucesso! Você será direcionado para sua área.";

    btnProximo.style.display = "none";
    btnVoltar.style.display = "none";

    resumoQuantidade.textContent =
      "Agendamento enviado";

    resumoValor.textContent =
      "O agendamento foi salvo no banco de dados.";

    // Remove qualquer redirecionamento antigo
    localStorage.removeItem(
      "guapo_redirect_apos_login"
    );

    // Garante que o cliente continue logado
    localStorage.setItem(
      "guapo_usuario_logado",
      JSON.stringify(usuarioLogado)
    );

    setTimeout(function () {
      window.location.replace(
        "cliente.html"
      );
    }, 1500);

  } catch (erro) {
    console.error(
      "Erro ao enviar agendamento:",
      erro
    );

    mensagemStatus.textContent =
      "Erro ao conectar com a API. Verifique se o servidor está ligado.";

    btnProximo.disabled = false;
    enviandoAgendamento = false;
  }
}

// =========================
// INICIAR
// =========================

criarDatasCarrossel();
atualizarResumo();
atualizarPassos();
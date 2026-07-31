// =========================
// CONFIGURAÇÃO DA API
// =========================

const GUAPO_API_URL =
  "https://the-barber-guapo.onrender.com";


// =========================
// VERIFICAR LOGIN
// =========================

const usuarioLogado =
  pegarUsuarioLogado();

if (!usuarioLogado) {
  localStorage.setItem(
    "guapo_redirect_apos_login",
    "agendamento.html"
  );

  window.location.replace(
    "login.html"
  );

  throw new Error(
    "Cliente precisa estar logado para agendar."
  );
}

if (
  usuarioLogado.tipo ===
  "barbeiro"
) {
  window.location.replace(
    "painel.html"
  );

  throw new Error(
    "Barbeiro não agenda como cliente."
  );
}


// =========================
// ESTADO DO AGENDAMENTO
// =========================

let etapaAtual = 1;

let servicosSelecionados = [];

let horarioSelecionado = "";

let envioEmAndamento = false;

let agendamentoFinalizado = false;


// =========================
// ELEMENTOS
// =========================

const etapas = {
  1: document.getElementById(
    "etapaServicos"
  ),

  2: document.getElementById(
    "etapaHorario"
  ),

  3: document.getElementById(
    "etapaConfirmar"
  )
};

const btnProximo =
  document.getElementById(
    "btnProximo"
  );

const btnVoltar =
  document.getElementById(
    "btnVoltar"
  );

const resumoQuantidade =
  document.getElementById(
    "resumoQuantidade"
  );

const resumoValor =
  document.getElementById(
    "resumoValor"
  );

const resumoFinal =
  document.getElementById(
    "resumoFinal"
  );

const mensagemStatus =
  document.getElementById(
    "mensagemStatus"
  );

const campoData =
  document.getElementById(
    "data"
  );

const inputHorario =
  document.getElementById(
    "horario"
  );

const datasCarrossel =
  document.getElementById(
    "datasCarrossel"
  );

const horariosGrid =
  document.getElementById(
    "horariosGrid"
  );

const confirmarNome =
  document.getElementById(
    "confirmarNome"
  );

const confirmarEmail =
  document.getElementById(
    "confirmarEmail"
  );

const confirmarTelefone =
  document.getElementById(
    "confirmarTelefone"
  );

const campoObservacao =
  document.getElementById(
    "observacao"
  );


// =========================
// HORÁRIOS
// =========================

const horariosSemana = [
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

const horariosSabado = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30"
];

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
// FUNÇÕES GERAIS
// =========================

function formatarMoeda(valor) {
  return valor.toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );
}

function formatarDataISO(data) {
  const ano =
    data.getFullYear();

  const mes =
    String(
      data.getMonth() + 1
    ).padStart(2, "0");

  const dia =
    String(
      data.getDate()
    ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function obterDataISO(dataBanco) {
  if (!dataBanco) {
    return "";
  }

  return String(dataBanco)
    .split("T")[0];
}

function formatarDataBR(
  dataISO
) {
  if (!dataISO) {
    return "";
  }

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

function criarDataLocal(
  dataISO
) {
  return new Date(
    `${dataISO}T12:00:00`
  );
}

function normalizarTexto(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function aguardar(tempo) {
  return new Promise(
    function (resolve) {
      setTimeout(
        resolve,
        tempo
      );
    }
  );
}

function diaPermitido(data) {
  const diaSemana =
    data.getDay();

  return (
    diaSemana >= 2 &&
    diaSemana <= 6
  );
}

function obterHorariosDoDia(
  dataISO
) {
  const data =
    criarDataLocal(dataISO);

  const diaSemana =
    data.getDay();

  if (diaSemana === 6) {
    return [
      ...horariosSabado
    ];
  }

  if (
    diaSemana >= 2 &&
    diaSemana <= 5
  ) {
    return [
      ...horariosSemana
    ];
  }

  return [];
}

function horarioJaPassouHoje(
  dataISO,
  horario
) {
  const agora =
    new Date();

  const hojeISO =
    formatarDataISO(agora);

  if (dataISO !== hojeISO) {
    return false;
  }

  const partes =
    horario
      .split(":")
      .map(Number);

  const hora =
    partes[0];

  const minuto =
    partes[1];

  const horarioData =
    new Date();

  horarioData.setHours(
    hora,
    minuto,
    0,
    0
  );

  return horarioData <= agora;
}

async function buscarJSON(
  url,
  opcoes = {}
) {
  const resposta =
    await fetch(
      url,
      opcoes
    );

  const texto =
    await resposta.text();

  let dados = null;

  try {
    dados = texto
      ? JSON.parse(texto)
      : null;

  } catch (erro) {
    throw new Error(
      "A API retornou uma resposta inválida."
    );
  }

  if (!resposta.ok) {
    throw new Error(
      dados?.mensagem ||
      dados?.erro ||
      "Erro na solicitação."
    );
  }

  return dados;
}


// =========================
// DATAS DO CARROSSEL
// =========================

function criarDatasCarrossel() {
  if (
    !datasCarrossel ||
    !horariosGrid ||
    !campoData
  ) {
    return;
  }

  datasCarrossel.innerHTML =
    "";

  const hoje =
    new Date();

  let quantidadeCriada = 0;

  let diasAvancados = 0;

  while (
    quantidadeCriada < 21 &&
    diasAvancados < 60
  ) {
    const data =
      new Date(hoje);

    data.setDate(
      hoje.getDate() +
      diasAvancados
    );

    diasAvancados++;

    if (!diaPermitido(data)) {
      continue;
    }

    const dataISO =
      formatarDataISO(data);

    const diaSemana =
      diasSemana[
        data.getDay()
      ];

    const dia =
      data.getDate();

    const mes =
      meses[
        data.getMonth()
      ];

    const ano =
      String(
        data.getFullYear()
      ).slice(2);

    const botao =
      document.createElement(
        "button"
      );

    botao.type =
      "button";

    botao.classList.add(
      "data-card"
    );

    botao.dataset.data =
      dataISO;

    botao.innerHTML = `
      <span>
        ${diaSemana}
      </span>

      <strong>
        ${dia}
      </strong>

      <small>
        ${mes}/${ano}
      </small>
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

    datasCarrossel.appendChild(
      botao
    );

    quantidadeCriada++;
  }

  const primeiraData =
    datasCarrossel
      .querySelector(
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
  campoData.value =
    dataISO;

  horarioSelecionado =
    "";

  if (inputHorario) {
    inputHorario.value =
      "";
  }

  document
    .querySelectorAll(
      ".data-card"
    )
    .forEach(
      function (botao) {
        botao.classList.remove(
          "ativo"
        );
      }
    );

  botaoSelecionado
    .classList
    .add("ativo");

  await carregarHorariosDisponiveis(
    dataISO
  );

  validarEtapa();
}


// =========================
// HORÁRIOS DISPONÍVEIS
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
    const agendamentos =
      await buscarJSON(
        `${GUAPO_API_URL}` +
        `/api/agendamentos` +
        `?data=${
          encodeURIComponent(
            dataISO
          )
        }`
      );

    const listaAgendamentos =
      Array.isArray(
        agendamentos
      )
        ? agendamentos
        : [];

    const horariosOcupados =
      listaAgendamentos
        .filter(
          function (
            agendamento
          ) {
            const status =
              String(
                agendamento.status ||
                ""
              ).toLowerCase();

            return !status.includes(
              "cancel"
            );
          }
        )
        .map(
          function (
            agendamento
          ) {
            return String(
              agendamento.horario ||
              ""
            ).slice(0, 5);
          }
        );

    const horariosDoDia =
      obterHorariosDoDia(
        dataISO
      );

    const horariosDisponiveis =
      horariosDoDia.filter(
        function (horario) {
          return (
            !horariosOcupados.includes(
              horario
            ) &&
            !horarioJaPassouHoje(
              dataISO,
              horario
            )
          );
        }
      );

    if (
      horariosDisponiveis.length ===
      0
    ) {
      horariosGrid.innerHTML = `
        <p class="horarios-msg">
          Nenhum horário disponível
          para este dia.
        </p>
      `;

      return;
    }

    horariosGrid.innerHTML =
      "";

    horariosDisponiveis.forEach(
      function (horario) {
        const botao =
          document.createElement(
            "button"
          );

        botao.type =
          "button";

        botao.classList.add(
          "horario-card"
        );

        botao.textContent =
          horario;

        botao.addEventListener(
          "click",
          function () {
            selecionarHorarioCarrossel(
              horario,
              botao
            );
          }
        );

        horariosGrid.appendChild(
          botao
        );
      }
    );

  } catch (erro) {
    console.error(
      "Erro ao carregar horários:",
      erro
    );

    horariosGrid.innerHTML = `
      <p class="horarios-msg">
        Não foi possível carregar
        os horários.

        Aguarde alguns segundos
        e tente novamente.
      </p>
    `;
  }
}

function selecionarHorarioCarrossel(
  horario,
  botaoSelecionado
) {
  horarioSelecionado =
    horario;

  if (inputHorario) {
    inputHorario.value =
      horario;
  }

  document
    .querySelectorAll(
      ".horario-card"
    )
    .forEach(
      function (botao) {
        botao.classList.remove(
          "ativo"
        );
      }
    );

  botaoSelecionado
    .classList
    .add("ativo");

  validarEtapa();
}


// =========================
// ETAPAS
// =========================

function atualizarPassos() {
  document
    .querySelectorAll(
      ".agenda-etapa"
    )
    .forEach(
      function (etapa) {
        etapa.classList.remove(
          "ativa"
        );
      }
    );

  if (etapas[etapaAtual]) {
    etapas[etapaAtual]
      .classList
      .add("ativa");
  }

  document
    .querySelectorAll(
      ".passo"
    )
    .forEach(
      function (passo) {
        const numeroPasso =
          Number(
            passo.dataset.passo
          );

        passo.classList.toggle(
          "ativo",
          numeroPasso ===
          etapaAtual
        );
      }
    );

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

function atualizarResumo() {
  const total =
    servicosSelecionados.reduce(
      function (
        soma,
        servico
      ) {
        return (
          soma +
          servico.preco
        );
      },
      0
    );

  if (
    servicosSelecionados.length ===
    0
  ) {
    resumoQuantidade.textContent =
      "Nenhum serviço selecionado";

    resumoValor.textContent =
      "Selecione um serviço para continuar";

    return;
  }

  resumoQuantidade.textContent =
    servicosSelecionados.length ===
      1
      ? "1 serviço selecionado"
      : (
        `${servicosSelecionados.length} ` +
        "serviços selecionados"
      );

  resumoValor.textContent =
    `Total estimado: ${
      formatarMoeda(total)
    }`;
}

function validarEtapa() {
  if (
    envioEmAndamento ||
    agendamentoFinalizado
  ) {
    btnProximo.disabled =
      true;

    return;
  }

  if (etapaAtual === 1) {
    btnProximo.disabled =
      servicosSelecionados.length ===
      0;

    return;
  }

  if (etapaAtual === 2) {
    btnProximo.disabled =
      !campoData.value ||
      !horarioSelecionado;

    return;
  }

  btnProximo.disabled =
    false;
}


// =========================
// SELEÇÃO DE SERVIÇOS
// =========================

document
  .querySelectorAll(
    ".agenda-servico"
  )
  .forEach(
    function (card) {
      const botao =
        card.querySelector(
          "button"
        );

      if (!botao) {
        return;
      }

      botao.addEventListener(
        "click",
        function () {
          if (
            envioEmAndamento ||
            agendamentoFinalizado
          ) {
            return;
          }

          const nome =
            card.dataset.nome;

          const preco =
            Number(
              card.dataset.preco
            );

          const tempo =
            card.dataset.tempo;

          const apartir =
            card.dataset.apartir ===
            "true";

          const jaSelecionado =
            servicosSelecionados.find(
              function (servico) {
                return (
                  servico.nome ===
                  nome
                );
              }
            );

          if (jaSelecionado) {
            servicosSelecionados =
              servicosSelecionados.filter(
                function (servico) {
                  return (
                    servico.nome !==
                    nome
                  );
                }
              );

            card.classList.remove(
              "selecionado"
            );

            botao.textContent =
              "Selecionar";

          } else {
            servicosSelecionados.push({
              nome,
              preco,
              tempo,
              apartir
            });

            card.classList.add(
              "selecionado"
            );

            botao.textContent =
              "Selecionado";
          }

          atualizarResumo();

          validarEtapa();
        }
      );
    }
  );


// =========================
// OBSERVAÇÃO
// =========================

if (campoObservacao) {
  campoObservacao.addEventListener(
    "input",
    montarResumoFinal
  );

  campoObservacao.addEventListener(
    "change",
    montarResumoFinal
  );
}


// =========================
// BOTÕES DE NAVEGAÇÃO
// =========================

btnVoltar.addEventListener(
  "click",
  function () {
    if (
      envioEmAndamento ||
      agendamentoFinalizado
    ) {
      return;
    }

    if (etapaAtual > 1) {
      etapaAtual--;

      atualizarPassos();
    }
  }
);

btnProximo.addEventListener(
  "click",
  async function () {
    if (
      envioEmAndamento ||
      agendamentoFinalizado
    ) {
      return;
    }

    if (etapaAtual === 1) {
      if (
        servicosSelecionados.length ===
        0
      ) {
        alert(
          "Selecione pelo menos um serviço."
        );

        return;
      }

      etapaAtual = 2;

      atualizarPassos();

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
      function (
        soma,
        servico
      ) {
        return (
          soma +
          servico.preco
        );
      },
      0
    );

  const listaServicos =
    servicosSelecionados
      .map(
        function (servico) {
          const textoPreco =
            servico.apartir
              ? (
                "A partir de " +
                formatarMoeda(
                  servico.preco
                )
              )
              : formatarMoeda(
                servico.preco
              );

          return `
            <li>
              ${servico.nome}
              -
              ${textoPreco}
              -
              ${servico.tempo}
            </li>
          `;
        }
      )
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

      ${formatarDataBR(
        campoData.value
      )}
    </p>

    <p>
      <strong>Horário:</strong>

      ${horarioSelecionado}
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

      ${observacao || "Sem observação"}
    </p>
  `;
}


// =========================
// VERIFICAR SE FOI SALVO
// =========================

async function verificarAgendamentoSalvo(
  dadosAgendamento
) {
  const totalTentativas = 5;

  for (
    let tentativa = 1;
    tentativa <= totalTentativas;
    tentativa++
  ) {
    try {
      const agendamentos =
        await buscarJSON(
          `${GUAPO_API_URL}` +
          `/api/agendamentos` +
          `?clienteId=${
            encodeURIComponent(
              usuarioLogado.id
            )
          }`
        );

      const lista =
        Array.isArray(
          agendamentos
        )
          ? agendamentos
          : [];

      const encontrado =
        lista.find(
          function (agendamento) {
            const mesmaData =
              obterDataISO(
                agendamento.data
              ) ===
              dadosAgendamento.data;

            const mesmoHorario =
              String(
                agendamento.horario ||
                ""
              ).slice(0, 5) ===
              dadosAgendamento.horario;

            const mesmosServicos =
              normalizarTexto(
                agendamento.servicos ||
                agendamento.servico
              ) ===
              normalizarTexto(
                dadosAgendamento.servicos
              );

            const naoCancelado =
              !String(
                agendamento.status ||
                ""
              )
                .toLowerCase()
                .includes(
                  "cancel"
                );

            return (
              mesmaData &&
              mesmoHorario &&
              mesmosServicos &&
              naoCancelado
            );
          }
        );

      if (encontrado) {
        return encontrado;
      }

    } catch (erro) {
      console.warn(
        "Ainda não foi possível verificar o agendamento:",
        erro
      );
    }

    await aguardar(1000);
  }

  return null;
}


// =========================
// FINALIZAR COM SUCESSO
// =========================

function finalizarAgendamentoComSucesso() {
  if (agendamentoFinalizado) {
    return;
  }

  agendamentoFinalizado =
    true;

  envioEmAndamento =
    false;

  mensagemStatus.textContent =
    "Solicitação enviada com sucesso! Abrindo sua área...";

  btnProximo.disabled =
    true;

  btnProximo.textContent =
    "Enviado";

  btnVoltar.style.display =
    "none";

  resumoQuantidade.textContent =
    "Agendamento enviado";

  resumoValor.textContent =
    "Acompanhe a confirmação na sua área.";

  localStorage.removeItem(
    "guapo_redirect_apos_login"
  );

  salvarUsuarioLogado(
    usuarioLogado
  );

  setTimeout(
    function () {
      window.location.replace(
        "cliente.html"
      );
    },
    800
  );
}


// =========================
// ENVIAR AGENDAMENTO
// =========================

async function enviarAgendamento() {
  if (
    envioEmAndamento ||
    agendamentoFinalizado
  ) {
    return;
  }

  envioEmAndamento =
    true;

  const observacao =
    campoObservacao
      ? campoObservacao.value.trim()
      : "";

  const total =
    servicosSelecionados.reduce(
      function (
        soma,
        servico
      ) {
        return (
          soma +
          servico.preco
        );
      },
      0
    );

  const servicosTexto =
    servicosSelecionados
      .map(
        function (servico) {
          const preco =
            servico.apartir
              ? (
                "A partir de " +
                formatarMoeda(
                  servico.preco
                )
              )
              : formatarMoeda(
                servico.preco
              );

          return (
            `${servico.nome} - ` +
            `${preco} - ` +
            `${servico.tempo}`
          );
        }
      )
      .join(" | ");

  const dadosAgendamento = {
    clienteId:
      usuarioLogado.id,

    nome:
      usuarioLogado.nome,

    telefone:
      usuarioLogado.telefone ||
      "",

    email:
      usuarioLogado.email ||
      "",

    data:
      campoData.value,

    horario:
      horarioSelecionado,

    servicos:
      servicosTexto,

    totalEstimado:
      formatarMoeda(total),

    observacao:
      observacao ||
      "Sem observação"
  };

  mensagemStatus.textContent =
    "Enviando solicitação...";

  btnProximo.disabled =
    true;

  btnProximo.textContent =
    "Enviando...";

  btnVoltar.disabled =
    true;

  const controlador =
    new AbortController();

  const tempoLimite =
    setTimeout(
      function () {
        controlador.abort();
      },
      8000
    );

  try {
    const resposta =
      await fetch(
        `${GUAPO_API_URL}/api/agendamentos`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              dadosAgendamento
            ),

          signal:
            controlador.signal
        }
      );

    clearTimeout(
      tempoLimite
    );

    const texto =
      await resposta.text();

    let retorno = {};

    try {
      retorno =
        texto
          ? JSON.parse(texto)
          : {};

    } catch (erro) {
      retorno = {};
    }

    if (
      resposta.ok &&
      retorno.sucesso
    ) {
      finalizarAgendamentoComSucesso();

      return;
    }

    const salvo =
      await verificarAgendamentoSalvo(
        dadosAgendamento
      );

    if (salvo) {
      finalizarAgendamentoComSucesso();

      return;
    }

    throw new Error(
      retorno.mensagem ||
      retorno.erro ||
      "Não foi possível enviar o agendamento."
    );

  } catch (erro) {
    clearTimeout(
      tempoLimite
    );

    console.error(
      "Erro ou demora ao enviar agendamento:",
      erro
    );

    mensagemStatus.textContent =
      "Verificando se o agendamento foi salvo...";

    const salvo =
      await verificarAgendamentoSalvo(
        dadosAgendamento
      );

    if (salvo) {
      finalizarAgendamentoComSucesso();

      return;
    }

    envioEmAndamento =
      false;

    mensagemStatus.textContent =
      "Não foi possível confirmar o envio. Tente novamente.";

    btnProximo.disabled =
      false;

    btnProximo.textContent =
      "Enviar solicitação";

    btnVoltar.disabled =
      false;
  }
}


// =========================
// INICIAR
// =========================

criarDatasCarrossel();

atualizarResumo();

atualizarPassos();
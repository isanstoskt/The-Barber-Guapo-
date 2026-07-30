const GUAPO_API_URL =
  "https://the-barber-guapo.onrender.com";

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

let etapaAtual = 1;
let servicosSelecionados = [];
let horarioSelecionado = "";

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

function formatarDataBR(
  dataISO
) {
  if (!dataISO) {
    return "";
  }

  const partes =
    dataISO.split("-");

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

function diaPermitido(
  data
) {
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
    return [...horariosSabado];
  }

  if (
    diaSemana >= 2 &&
    diaSemana <= 5
  ) {
    return [...horariosSemana];
  }

  return [];
}

function horarioJaPassouHoje(
  dataISO,
  horario
) {
  const hoje =
    new Date();

  const hojeISO =
    formatarDataISO(hoje);

  if (dataISO !== hojeISO) {
    return false;
  }

  const [hora, minuto] =
    horario
      .split(":")
      .map(Number);

  const horarioData =
    new Date();

  horarioData.setHours(
    hora,
    minuto,
    0,
    0
  );

  return horarioData <= hoje;
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

function criarDatasCarrossel() {
  if (
    !datasCarrossel ||
    !horariosGrid ||
    !campoData
  ) {
    return;
  }

  datasCarrossel.innerHTML = "";

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
      diasSemana[data.getDay()];

    const dia =
      data.getDate();

    const mes =
      meses[data.getMonth()];

    const ano =
      String(
        data.getFullYear()
      ).slice(2);

    const botao =
      document.createElement(
        "button"
      );

    botao.type = "button";

    botao.classList.add(
      "data-card"
    );

    botao.dataset.data =
      dataISO;

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

    datasCarrossel.appendChild(
      botao
    );

    quantidadeCriada++;
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
    .forEach(function (botao) {
      botao.classList.remove(
        "ativo"
      );
    });

  botaoSelecionado
    .classList
    .add("ativo");

  await carregarHorariosDisponiveis(
    dataISO
  );

  validarEtapa();
}

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
        `?data=${encodeURIComponent(dataISO)}`
      );

    const listaAgendamentos =
      Array.isArray(agendamentos)
        ? agendamentos
        : [];

    const horariosOcupados =
      listaAgendamentos
        .filter(function (
          agendamento
        ) {
          const status =
            String(
              agendamento.status || ""
            ).toLowerCase();

          return !status.includes(
            "cancel"
          );
        })
        .map(function (
          agendamento
        ) {
          return agendamento.horario;
        });

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
      horariosDisponiveis.length === 0
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
        Não foi possível carregar os horários.
        Aguarde alguns segundos e tente novamente.
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
    .forEach(function (botao) {
      botao.classList.remove(
        "ativo"
      );
    });

  botaoSelecionado
    .classList
    .add("ativo");

  validarEtapa();
}

function atualizarPassos() {
  document
    .querySelectorAll(
      ".agenda-etapa"
    )
    .forEach(function (etapa) {
      etapa.classList.remove(
        "ativa"
      );
    });

  if (etapas[etapaAtual]) {
    etapas[etapaAtual]
      .classList
      .add("ativa");
  }

  document
    .querySelectorAll(
      ".passo"
    )
    .forEach(function (passo) {
      const numeroPasso =
        Number(
          passo.dataset.passo
        );

      passo.classList.toggle(
        "ativo",
        numeroPasso ===
        etapaAtual
      );
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
    servicosSelecionados.length === 0
  ) {
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

  btnProximo.disabled =
    false;
}

document
  .querySelectorAll(
    ".agenda-servico"
  )
  .forEach(function (card) {
    const botao =
      card.querySelector(
        "button"
      );

    botao.addEventListener(
      "click",
      function () {
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
  });

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
      .map(function (
        servico
      ) {
        const textoPreco =
          servico.apartir
            ? `A partir de ${formatarMoeda(servico.preco)}`
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

async function enviarAgendamento() {
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
      .map(function (
        servico
      ) {
        const preco =
          servico.apartir
            ? `A partir de ${formatarMoeda(servico.preco)}`
            : formatarMoeda(
                servico.preco
              );

        return (
          `${servico.nome} - ` +
          `${preco} - ` +
          `${servico.tempo}`
        );
      })
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

  try {
    const retorno =
      await buscarJSON(
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
            )
        }
      );

    if (!retorno.sucesso) {
      throw new Error(
        retorno.mensagem ||
        "Não foi possível enviar."
      );
    }

    mensagemStatus.textContent =
      "Solicitação enviada com sucesso! Você será direcionado para sua área.";

    btnProximo.style.display =
      "none";

    btnVoltar.style.display =
      "none";

    resumoQuantidade.textContent =
      "Agendamento enviado";

    resumoValor.textContent =
      "O agendamento foi salvo no banco de dados.";

    localStorage.removeItem(
      "guapo_redirect_apos_login"
    );

    localStorage.setItem(
      "guapo_usuario_logado",
      JSON.stringify(
        usuarioLogado
      )
    );

    setTimeout(function () {
      window.location.replace(
        "cliente.html"
      );
    }, 1500);

  } catch (erro) {
    console.error(
      "Erro ao enviar para API:",
      erro
    );

    mensagemStatus.textContent =
      erro.message ||
      "Erro ao conectar com a API. Aguarde alguns segundos e tente novamente.";

    btnProximo.disabled =
      false;
  }
}

criarDatasCarrossel();
atualizarResumo();
atualizarPassos();
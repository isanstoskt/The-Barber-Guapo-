// =========================
// CONFIGURAÇÃO DA API
// =========================

// Nome exclusivo para não entrar em conflito com o auth.js
const PAINEL_API_BASE_URL = "http://localhost:3000";

const API_AGENDAMENTOS_URL =
  `${PAINEL_API_BASE_URL}/api/agendamentos`;

const API_MENSAGENS_URL =
  `${PAINEL_API_BASE_URL}/api/mensagens`;


// =========================
// ELEMENTOS DO PAINEL
// =========================

const listaAgendamentos =
  document.getElementById("listaAgendamentos");

const filtroData =
  document.getElementById("filtroData");

const btnHoje =
  document.getElementById("btnHoje");

const btnSemana =
  document.getElementById("btnSemana");

const btnTodos =
  document.getElementById("btnTodos");

const totalAgendamentos =
  document.getElementById("totalAgendamentos");

const totalPendentes =
  document.getElementById("totalPendentes");

const totalConfirmados =
  document.getElementById("totalConfirmados");

const totalCancelados =
  document.getElementById("totalCancelados");

const listaMensagensClientes =
  document.getElementById("listaMensagensClientes");

const btnAtualizarMensagens =
  document.getElementById("btnAtualizarMensagens");

let clienteAdminAtivo = null;


// =========================
// FUNÇÕES GERAIS
// =========================

function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto || "";
  return div.innerHTML;
}

function formatarData(data) {
  if (!data) {
    return "Data não informada";
  }

  const somenteData = String(data).split("T")[0];
  const partes = somenteData.split("-");

  if (partes.length !== 3) {
    return data;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarDataHoraMensagem(dataISO) {
  if (!dataISO) {
    return "";
  }

  const data = new Date(dataISO);

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function dataHoje() {
  const hoje = new Date();

  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function formatarDataParaAPI(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function obterSemanaAtual() {
  const hoje = new Date();
  const diaSemana = hoje.getDay();

  const segunda = new Date(hoje);

  const diferencaParaSegunda =
    diaSemana === 0 ? -6 : 1 - diaSemana;

  segunda.setDate(
    hoje.getDate() + diferencaParaSegunda
  );

  const domingo = new Date(segunda);

  domingo.setDate(
    segunda.getDate() + 6
  );

  return {
    inicio: formatarDataParaAPI(segunda),
    fim: formatarDataParaAPI(domingo)
  };
}

async function buscarJSON(url, opcoes = {}) {
  const resposta = await fetch(url, opcoes);

  const texto = await resposta.text();

  let dados = null;

  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch (erro) {
    throw new Error(
      "A API não retornou um JSON válido."
    );
  }

  if (!resposta.ok) {
    throw new Error(
      dados?.mensagem ||
      dados?.erro ||
      "Erro na requisição."
    );
  }

  return dados;
}


// =========================
// AGENDAMENTOS
// =========================

async function carregarAgendamentos(
  filtro = {},
  mostrarCarregando = true
) {
  if (!listaAgendamentos) {
    return;
  }

  if (mostrarCarregando) {
    listaAgendamentos.innerHTML = `
      <p class="painel-carregando">
        Carregando agendamentos...
      </p>
    `;
  }

  try {
    let url = API_AGENDAMENTOS_URL;

    if (filtro.data) {
      url =
        `${API_AGENDAMENTOS_URL}?data=${encodeURIComponent(filtro.data)}`;
    }

    if (filtro.inicio && filtro.fim) {
      url =
        `${API_AGENDAMENTOS_URL}` +
        `?inicio=${encodeURIComponent(filtro.inicio)}` +
        `&fim=${encodeURIComponent(filtro.fim)}`;
    }

    const agendamentos =
      await buscarJSON(url);

    renderizarResumo(agendamentos);
    renderizarAgendamentos(agendamentos);

  } catch (erro) {
    console.error(
      "Erro ao carregar agendamentos:",
      erro
    );

    listaAgendamentos.innerHTML = `
      <div class="painel-vazio">
        <h3>Erro ao conectar com a API</h3>

        <p>
          Confirme se a API está ligada em:
          <strong>http://localhost:3000</strong>
        </p>
      </div>
    `;

    renderizarResumo([]);
  }
}

function renderizarResumo(agendamentos) {
  const lista = Array.isArray(agendamentos)
    ? agendamentos
    : [];

  const pendentes = lista.filter(function (item) {
    return item.status === "Aguardando confirmação";
  });

  const confirmados = lista.filter(function (item) {
    return item.status === "Confirmado";
  });

  const cancelados = lista.filter(function (item) {
    return item.status === "Cancelado";
  });

  if (totalAgendamentos) {
    totalAgendamentos.textContent = lista.length;
  }

  if (totalPendentes) {
    totalPendentes.textContent = pendentes.length;
  }

  if (totalConfirmados) {
    totalConfirmados.textContent = confirmados.length;
  }

  if (totalCancelados) {
    totalCancelados.textContent = cancelados.length;
  }
}

function renderizarAgendamentos(agendamentos) {
  if (!listaAgendamentos) {
    return;
  }

  if (
    !Array.isArray(agendamentos) ||
    agendamentos.length === 0
  ) {
    listaAgendamentos.innerHTML = `
      <div class="painel-vazio">
        <h3>Nenhum agendamento encontrado</h3>

        <p>
          Quando um cliente solicitar um horário,
          ele aparecerá aqui.
        </p>
      </div>
    `;

    return;
  }

  listaAgendamentos.innerHTML =
    agendamentos.map(function (agendamento) {
      return `
        <article class="agendamento-admin-card">

          <div class="agendamento-admin-topo">
            <div>
              <h3>
                ${escaparHTML(
                  agendamento.nome ||
                  "Cliente sem nome"
                )}
              </h3>

              <p>
                ${formatarData(agendamento.data)}
                às
                ${escaparHTML(
                  agendamento.horario ||
                  "horário não informado"
                )}
              </p>
            </div>

            <span
              class="status-agendamento ${classeStatus(agendamento.status)}"
            >
              ${escaparHTML(
                agendamento.status ||
                "Aguardando confirmação"
              )}
            </span>
          </div>

          <div class="agendamento-admin-info">
            <p>
              <strong>Telefone:</strong>
              ${escaparHTML(
                agendamento.telefone ||
                "Não informado"
              )}
            </p>

            <p>
              <strong>E-mail:</strong>
              ${escaparHTML(
                agendamento.email ||
                "Não informado"
              )}
            </p>

            <p>
              <strong>Serviços:</strong>
              ${escaparHTML(
                agendamento.servicos ||
                agendamento.servico ||
                "Não informado"
              )}
            </p>

            <p>
              <strong>Total:</strong>
              ${escaparHTML(
                agendamento.totalEstimado ||
                "Não informado"
              )}
            </p>

            <p>
              <strong>Observação:</strong>
              ${escaparHTML(
                agendamento.observacao ||
                "Sem observação"
              )}
            </p>
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
    await buscarJSON(
      `${API_AGENDAMENTOS_URL}/${id}/status`,
      {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          status: status
        })
      }
    );

    if (filtroData && filtroData.value) {
      await carregarAgendamentos(
        {
          data: filtroData.value
        },
        false
      );
    } else {
      await carregarAgendamentos(
        {},
        false
      );
    }

  } catch (erro) {
    console.error(
      "Erro ao alterar status:",
      erro
    );

    alert(
      "Erro ao atualizar o status do agendamento."
    );
  }
}

async function excluirAgendamento(id) {
  const confirmou = confirm(
    "Tem certeza que deseja excluir este agendamento?"
  );

  if (!confirmou) {
    return;
  }

  try {
    await buscarJSON(
      `${API_AGENDAMENTOS_URL}/${id}`,
      {
        method: "DELETE"
      }
    );

    if (filtroData && filtroData.value) {
      await carregarAgendamentos(
        {
          data: filtroData.value
        },
        false
      );
    } else {
      await carregarAgendamentos(
        {},
        false
      );
    }

  } catch (erro) {
    console.error(
      "Erro ao excluir agendamento:",
      erro
    );

    alert(
      "Erro ao excluir o agendamento."
    );
  }
}


// =========================
// MENSAGENS / CHAT ADMIN
// =========================

async function carregarMensagensChat() {
  const mensagens =
    await buscarJSON(API_MENSAGENS_URL);

  return Array.isArray(mensagens)
    ? mensagens
    : [];
}

function agruparMensagensPorCliente(mensagens) {
  const conversas = {};

  mensagens.forEach(function (mensagem) {
    const clienteId =
      String(mensagem.clienteId);

    if (!conversas[clienteId]) {
      conversas[clienteId] = {
        clienteId: clienteId,

        clienteNome:
          mensagem.clienteNome ||
          "Cliente",

        clienteEmail:
          mensagem.clienteEmail ||
          "",

        clienteTelefone:
          mensagem.clienteTelefone ||
          "",

        mensagens: []
      };
    }

    conversas[clienteId].mensagens.push(
      mensagem
    );
  });

  return Object.values(conversas);
}

function mensagemLidaBarbeiro(mensagem) {
  return (
    mensagem.lidaBarbeiro === true ||
    mensagem.lidaBarbeiro === 1 ||
    mensagem.lidaBarbeiro === "1"
  );
}

function temMensagemNaoLida(conversa) {
  return conversa.mensagens.some(
    function (mensagem) {
      return (
        mensagem.autor === "cliente" &&
        !mensagemLidaBarbeiro(mensagem)
      );
    }
  );
}

function ultimaDataHora(conversa) {
  const ultimaMensagem =
    conversa.mensagens[
      conversa.mensagens.length - 1
    ];

  if (!ultimaMensagem) {
    return 0;
  }

  return new Date(
    ultimaMensagem.dataHora
  ).getTime();
}

async function marcarConversaComoLida(
  clienteId
) {
  try {
    await buscarJSON(
      `${API_MENSAGENS_URL}/${clienteId}/lidas-barbeiro`,
      {
        method: "PATCH"
      }
    );

  } catch (erro) {
    console.error(
      "Erro ao marcar conversa como lida:",
      erro
    );
  }
}

async function selecionarConversaAdmin(
  clienteId
) {
  if (
    String(clienteAdminAtivo) ===
    String(clienteId)
  ) {
    clienteAdminAtivo = null;

    await renderizarMensagensAdmin(false);

    return;
  }

  clienteAdminAtivo =
    String(clienteId);

  await marcarConversaComoLida(
    clienteAdminAtivo
  );

  await renderizarMensagensAdmin(false);
}

async function renderizarMensagensAdmin(
  mostrarCarregando = true
) {
  if (!listaMensagensClientes) {
    return;
  }

  if (mostrarCarregando) {
    listaMensagensClientes.innerHTML = `
      <p class="painel-carregando">
        Carregando mensagens...
      </p>
    `;
  }

  try {
    if (clienteAdminAtivo) {
      await marcarConversaComoLida(
        clienteAdminAtivo
      );
    }

    const mensagens =
      await carregarMensagensChat();

    if (mensagens.length === 0) {
      listaMensagensClientes.innerHTML = `
        <div class="painel-vazio">
          <h3>Nenhuma mensagem encontrada</h3>

          <p>
            Quando um cliente enviar uma mensagem,
            ela aparecerá aqui.
          </p>
        </div>
      `;

      clienteAdminAtivo = null;

      return;
    }

    const conversas =
      agruparMensagensPorCliente(mensagens)
        .sort(function (a, b) {
          return (
            ultimaDataHora(b) -
            ultimaDataHora(a)
          );
        });

    const existeConversaAtiva =
      conversas.some(function (conversa) {
        return (
          String(conversa.clienteId) ===
          String(clienteAdminAtivo)
        );
      });

    if (!existeConversaAtiva) {
      clienteAdminAtivo = null;
    }

    const tirasHTML =
      conversas.map(function (conversa) {
        const ativa =
          String(conversa.clienteId) ===
          String(clienteAdminAtivo);

        const naoLida =
          temMensagemNaoLida(conversa);

        const ultimaMensagem =
          conversa.mensagens[
            conversa.mensagens.length - 1
          ];

        const previa =
          ultimaMensagem?.texto ||
          "Sem mensagem";

        return `
          <button
            type="button"
            class="tira-cliente ${ativa ? "tira-cliente-ativa" : ""}"
            onclick="selecionarConversaAdmin('${conversa.clienteId}')"
          >
            <span class="tira-cliente-conteudo">
              <span class="tira-cliente-nome">
                ${escaparHTML(conversa.clienteNome)}
              </span>

              <span class="tira-cliente-previa">
                ${escaparHTML(previa)}
              </span>
            </span>

            ${naoLida
              ? '<span class="tira-cliente-dot"></span>'
              : ""
            }
          </button>
        `;
      }).join("");

    const conversaAtiva =
      conversas.find(function (conversa) {
        return (
          String(conversa.clienteId) ===
          String(clienteAdminAtivo)
        );
      });

    let conversaHTML = "";

    if (conversaAtiva) {
      const mensagensHTML =
        conversaAtiva.mensagens
          .map(function (mensagem) {
            const classe =
              mensagem.autor === "cliente"
                ? "msg-admin-cliente"
                : "msg-admin-barbeiro";

            const autor =
              mensagem.autor === "cliente"
                ? conversaAtiva.clienteNome
                : "Guapo";

            return `
              <div class="msg-admin ${classe}">
                <strong>
                  ${escaparHTML(autor)}
                </strong>

                <p>
                  ${escaparHTML(mensagem.texto)}
                </p>

                <span>
                  ${formatarDataHoraMensagem(
                    mensagem.dataHora
                  )}
                </span>
              </div>
            `;
          }).join("");

      conversaHTML = `
        <article class="conversa-admin-card">

          <div class="conversa-admin-topo">
            <div>
              <h3>
                ${escaparHTML(
                  conversaAtiva.clienteNome
                )}
              </h3>

              <p>
                ${escaparHTML(
                  conversaAtiva.clienteEmail ||
                  "E-mail não informado"
                )}
              </p>

              <p>
                ${escaparHTML(
                  conversaAtiva.clienteTelefone ||
                  "Telefone não informado"
                )}
              </p>
            </div>
          </div>

          <div class="conversa-admin-mensagens">
            ${mensagensHTML}
          </div>

          <form
            class="form-resposta-admin"
            onsubmit="responderCliente(event, '${conversaAtiva.clienteId}')"
          >
            <input
              type="text"
              id="respostaCliente-${conversaAtiva.clienteId}"
              placeholder="Responder cliente..."
              autocomplete="off"
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

    const caixaMensagens =
      listaMensagensClientes.querySelector(
        ".conversa-admin-mensagens"
      );

    if (caixaMensagens) {
      caixaMensagens.scrollTop =
        caixaMensagens.scrollHeight;
    }

  } catch (erro) {
    console.error(
      "Erro ao carregar mensagens:",
      erro
    );

    listaMensagensClientes.innerHTML = `
      <div class="painel-vazio">
        <h3>Erro ao carregar mensagens</h3>

        <p>
          Confirme se a API está ligada em:
          <strong>http://localhost:3000</strong>
        </p>
      </div>
    `;
  }
}

async function responderCliente(
  event,
  clienteId
) {
  event.preventDefault();

  const formulario = event.currentTarget;

  const inputResposta =
    document.getElementById(
      `respostaCliente-${clienteId}`
    );

  if (!inputResposta) {
    return;
  }

  const texto =
    inputResposta.value.trim();

  if (!texto) {
    return;
  }

  const botao =
    formulario.querySelector("button");

  if (botao) {
    botao.disabled = true;
    botao.textContent = "Enviando...";
  }

  try {
    await buscarJSON(
      API_MENSAGENS_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          clienteId: Number(clienteId),
          autor: "barbeiro",
          texto: texto
        })
      }
    );

    inputResposta.value = "";

    clienteAdminAtivo =
      String(clienteId);

    await renderizarMensagensAdmin(false);

  } catch (erro) {
    console.error(
      "Erro ao responder cliente:",
      erro
    );

    alert(
      "Erro ao enviar a resposta para o cliente."
    );

  } finally {
    if (botao && document.body.contains(botao)) {
      botao.disabled = false;
      botao.textContent = "Responder";
    }
  }
}


// =========================
// EVENTOS DOS FILTROS
// =========================

if (btnHoje && filtroData) {
  btnHoje.addEventListener(
    "click",
    function () {
      filtroData.value = dataHoje();

      carregarAgendamentos({
        data: filtroData.value
      });
    }
  );
}

if (btnSemana && filtroData) {
  btnSemana.addEventListener(
    "click",
    function () {
      filtroData.value = "";

      const semana =
        obterSemanaAtual();

      carregarAgendamentos({
        inicio: semana.inicio,
        fim: semana.fim
      });
    }
  );
}

if (btnTodos && filtroData) {
  btnTodos.addEventListener(
    "click",
    function () {
      filtroData.value = "";

      carregarAgendamentos();
    }
  );
}

if (filtroData) {
  filtroData.addEventListener(
    "change",
    function () {
      if (filtroData.value) {
        carregarAgendamentos({
          data: filtroData.value
        });
      } else {
        carregarAgendamentos();
      }
    }
  );
}

if (btnAtualizarMensagens) {
  btnAtualizarMensagens.addEventListener(
    "click",
    function () {
      renderizarMensagensAdmin(true);
    }
  );
}


// =========================
// INICIAR PAINEL
// =========================

carregarAgendamentos();
renderizarMensagensAdmin();


// =========================
// ATUALIZAÇÃO AUTOMÁTICA
// =========================

// Atualiza sem mostrar "Carregando..." e sem apagar
// o texto enquanto o Guapo estiver digitando.

setInterval(function () {
  const inputRespostaAtivo =
    document.querySelector(
      ".form-resposta-admin input:focus"
    );

  if (!inputRespostaAtivo) {
    renderizarMensagensAdmin(false);
  }
}, 5000);
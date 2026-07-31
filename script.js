// =========================
// MENU MOBILE
// =========================

document.addEventListener(
  "DOMContentLoaded",
  function () {
    const botaoMenu =
      document.getElementById(
        "botaoMenu"
      );

    const menuLinks =
      document.getElementById(
        "menuLinks"
      ) ||
      document.querySelector("nav");

    if (
      botaoMenu &&
      menuLinks
    ) {
      botaoMenu.addEventListener(
        "click",
        function () {
          const menuEstaAberto =
            menuLinks.classList.toggle(
              "ativo"
            );

          botaoMenu.setAttribute(
            "aria-expanded",
            String(menuEstaAberto)
          );
        }
      );

      const linksMenu =
        menuLinks.querySelectorAll(
          "a"
        );

      linksMenu.forEach(
        function (link) {
          link.addEventListener(
            "click",
            function () {
              menuLinks.classList.remove(
                "ativo"
              );

              botaoMenu.setAttribute(
                "aria-expanded",
                "false"
              );
            }
          );
        }
      );
    }
  }
);


// =========================
// CARROSSEL PRINCIPAL
// =========================

let slideAtual = 0;

const areaSlides =
  document.querySelector(
    ".slides"
  );

const imagensSlides =
  document.querySelectorAll(
    ".slides img"
  );

if (
  areaSlides &&
  imagensSlides.length > 0
) {
  const totalSlides =
    imagensSlides.length;

  function mostrarSlide() {
    areaSlides.style.transform =
      `translateX(-${slideAtual * 100}%)`;
  }

  window.mudarSlide =
    function (direcao) {
      slideAtual += direcao;

      if (
        slideAtual >= totalSlides
      ) {
        slideAtual = 0;
      }

      if (slideAtual < 0) {
        slideAtual =
          totalSlides - 1;
      }

      mostrarSlide();
    };

  let tempoCarrossel =
    setInterval(
      function () {
        window.mudarSlide(1);
      },
      4000
    );

  const carrossel =
    document.querySelector(
      ".carrossel"
    );

  if (carrossel) {
    carrossel.addEventListener(
      "mouseenter",
      function () {
        clearInterval(
          tempoCarrossel
        );
      }
    );

    carrossel.addEventListener(
      "mouseleave",
      function () {
        tempoCarrossel =
          setInterval(
            function () {
              window.mudarSlide(1);
            },
            4000
          );
      }
    );
  }
}


// =========================
// CARROSSEL DE SERVIÇOS
// =========================

const servicosTrilho =
  document.getElementById(
    "servicosTrilho"
  );

const servicoAnterior =
  document.getElementById(
    "servicoAnterior"
  );

const servicoProximo =
  document.getElementById(
    "servicoProximo"
  );

if (
  servicosTrilho &&
  servicoAnterior &&
  servicoProximo
) {
  servicoProximo.addEventListener(
    "click",
    function () {
      servicosTrilho.scrollBy({
        left: 360,
        behavior: "smooth"
      });
    }
  );

  servicoAnterior.addEventListener(
    "click",
    function () {
      servicosTrilho.scrollBy({
        left: -360,
        behavior: "smooth"
      });
    }
  );
}


// =========================
// BOTÃO VOLTAR AO TOPO
// =========================

const botaoTopo =
  document.getElementById(
    "voltarTopo"
  );

if (botaoTopo) {
  window.addEventListener(
    "scroll",
    function () {
      if (
        window.scrollY > 400
      ) {
        botaoTopo.classList.add(
          "aparecer"
        );

      } else {
        botaoTopo.classList.remove(
          "aparecer"
        );
      }
    }
  );

  botaoTopo.addEventListener(
    "click",
    function () {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  );
}


// =========================
// DESTACAR DIA ATUAL
// =========================

const linhasHorario =
  document.querySelectorAll(
    ".horario-linha"
  );

if (
  linhasHorario.length > 0
) {
  const diaAtual =
    new Date().getDay();

  linhasHorario.forEach(
    function (linha) {
      const diaLinha =
        Number(
          linha.dataset.dia
        );

      if (
        diaLinha === diaAtual
      ) {
        linha.classList.add(
          "ativo"
        );
      }
    }
  );
}


// =========================
// MODAL DE TELEFONE
// =========================

const abrirModalTelefone =
  document.getElementById(
    "abrirModalTelefone"
  );

const modalTelefone =
  document.getElementById(
    "modalTelefone"
  );

const fecharModalTelefone =
  document.getElementById(
    "fecharModalTelefone"
  );

const fecharModalOverlay =
  document.getElementById(
    "fecharModalOverlay"
  );

const copiarTelefone =
  document.getElementById(
    "copiarTelefone"
  );

function abrirOpcoesTelefone() {
  if (!modalTelefone) {
    return;
  }

  modalTelefone.classList.add(
    "ativo"
  );

  modalTelefone.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "modal-aberto"
  );

  if (fecharModalTelefone) {
    fecharModalTelefone.focus();
  }
}

function fecharOpcoesTelefone() {
  if (!modalTelefone) {
    return;
  }

  modalTelefone.classList.remove(
    "ativo"
  );

  modalTelefone.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "modal-aberto"
  );

  if (abrirModalTelefone) {
    abrirModalTelefone.focus();
  }
}

if (
  abrirModalTelefone &&
  modalTelefone
) {
  abrirModalTelefone.addEventListener(
    "click",
    abrirOpcoesTelefone
  );
}

if (
  fecharModalTelefone &&
  modalTelefone
) {
  fecharModalTelefone.addEventListener(
    "click",
    fecharOpcoesTelefone
  );
}

if (
  fecharModalOverlay &&
  modalTelefone
) {
  fecharModalOverlay.addEventListener(
    "click",
    fecharOpcoesTelefone
  );
}

document.addEventListener(
  "keydown",
  function (event) {
    if (
      event.key === "Escape" &&
      modalTelefone &&
      modalTelefone.classList.contains(
        "ativo"
      )
    ) {
      fecharOpcoesTelefone();
    }
  }
);

if (copiarTelefone) {
  copiarTelefone.addEventListener(
    "click",
    async function () {
      const numero =
        copiarTelefone.dataset.numero;

      try {
        await navigator.clipboard.writeText(
          numero
        );

        copiarTelefone.textContent =
          "Copiado!";

        setTimeout(
          function () {
            copiarTelefone.textContent =
              "Copiar número";
          },
          2000
        );

      } catch (erro) {
        console.error(
          "Erro ao copiar telefone:",
          erro
        );

        copiarTelefone.textContent =
          "Não foi possível copiar";

        setTimeout(
          function () {
            copiarTelefone.textContent =
              "Copiar número";
          },
          2000
        );
      }
    }
  );
}
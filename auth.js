window.GUAPO_API_BASE_URL =
  "https://the-barber-guapo.onrender.com";

window.GUAPO_USUARIO_LOGADO_KEY =
  "guapo_usuario_logado";

// =========================
// USUÁRIO LOGADO
// =========================

function salvarUsuarioLogado(usuario) {
  localStorage.setItem(
    window.GUAPO_USUARIO_LOGADO_KEY,
    JSON.stringify(usuario)
  );
}

function pegarUsuarioLogado() {
  const dados =
    localStorage.getItem(
      window.GUAPO_USUARIO_LOGADO_KEY
    );

  if (!dados) {
    return null;
  }

  try {
    return JSON.parse(dados);

  } catch (erro) {
    console.error(
      "Erro ao ler usuário salvo:",
      erro
    );

    localStorage.removeItem(
      window.GUAPO_USUARIO_LOGADO_KEY
    );

    return null;
  }
}

function sair() {
  localStorage.removeItem(
    window.GUAPO_USUARIO_LOGADO_KEY
  );

  localStorage.removeItem(
    "guapo_redirect_apos_login"
  );

  window.location.href =
    "login.html";
}

// =========================
// RESPOSTA DA API
// =========================

async function lerRespostaJSON(resposta) {
  const texto =
    await resposta.text();

  let dados = {};

  try {
    dados = texto
      ? JSON.parse(texto)
      : {};

  } catch (erro) {
    console.error(
      "Resposta inválida da API:",
      texto
    );

    dados = {
      sucesso: false,
      mensagem:
        "A API retornou uma resposta inválida."
    };
  }

  if (!resposta.ok) {
    return {
      sucesso: false,

      mensagem:
        dados.mensagem ||
        dados.erro ||
        "Erro na solicitação."
    };
  }

  return dados;
}

// =========================
// LOGIN
// =========================

async function fazerLogin(
  email,
  senha
) {
  try {
    const resposta =
      await fetch(
        `${window.GUAPO_API_BASE_URL}/api/auth/login`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            email:
              String(email || "")
                .trim()
                .toLowerCase(),

            senha:
              String(senha || "")
          })
        }
      );

    const dados =
      await lerRespostaJSON(
        resposta
      );

    if (!dados.sucesso) {
      return {
        sucesso: false,

        mensagem:
          dados.mensagem ||
          "Erro ao fazer login."
      };
    }

    salvarUsuarioLogado(
      dados.usuario
    );

    return {
      sucesso: true,
      usuario: dados.usuario
    };

  } catch (erro) {
    console.error(
      "Erro no login:",
      erro
    );

    return {
      sucesso: false,

      mensagem:
        "Não foi possível conectar com a API. Aguarde alguns segundos e tente novamente."
    };
  }
}

// =========================
// CADASTRO
// =========================

async function cadastrarCliente(
  nome,
  email,
  telefone,
  senha
) {
  try {
    const resposta =
      await fetch(
        `${window.GUAPO_API_BASE_URL}/api/auth/cadastro`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            nome:
              String(nome || "")
                .trim(),

            email:
              String(email || "")
                .trim()
                .toLowerCase(),

            telefone:
              String(telefone || "")
                .trim(),

            senha:
              String(senha || "")
          })
        }
      );

    const dados =
      await lerRespostaJSON(
        resposta
      );

    if (!dados.sucesso) {
      return {
        sucesso: false,

        mensagem:
          dados.mensagem ||
          "Erro ao cadastrar cliente."
      };
    }

    return {
      sucesso: true,

      mensagem:
        dados.mensagem,

      usuario:
        dados.usuario
    };

  } catch (erro) {
    console.error(
      "Erro no cadastro:",
      erro
    );

    return {
      sucesso: false,

      mensagem:
        "Não foi possível conectar com a API. Aguarde alguns segundos e tente novamente."
    };
  }
}

// =========================
// SOLICITAR CÓDIGO
// =========================

async function solicitarCodigoRecuperacao(
  email
) {
  try {
    const resposta =
      await fetch(
        `${window.GUAPO_API_BASE_URL}/api/auth/recuperacao/solicitar`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            email:
              String(email || "")
                .trim()
                .toLowerCase()
          })
        }
      );

    return await lerRespostaJSON(
      resposta
    );

  } catch (erro) {
    console.error(
      "Erro ao solicitar recuperação:",
      erro
    );

    return {
      sucesso: false,

      mensagem:
        "Não foi possível conectar com a API. Aguarde alguns segundos e tente novamente."
    };
  }
}

// =========================
// VERIFICAR CÓDIGO
// =========================

async function verificarCodigoRecuperacao(
  email,
  codigo
) {
  try {
    const resposta =
      await fetch(
        `${window.GUAPO_API_BASE_URL}/api/auth/recuperacao/verificar`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            email:
              String(email || "")
                .trim()
                .toLowerCase(),

            codigo:
              String(codigo || "")
                .trim()
          })
        }
      );

    return await lerRespostaJSON(
      resposta
    );

  } catch (erro) {
    console.error(
      "Erro ao verificar código:",
      erro
    );

    return {
      sucesso: false,

      mensagem:
        "Não foi possível conectar com a API. Aguarde alguns segundos e tente novamente."
    };
  }
}

// =========================
// REDEFINIR SENHA
// =========================

async function redefinirSenha(
  email,
  codigo,
  novaSenha
) {
  try {
    const resposta =
      await fetch(
        `${window.GUAPO_API_BASE_URL}/api/auth/recuperacao/redefinir`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            email:
              String(email || "")
                .trim()
                .toLowerCase(),

            codigo:
              String(codigo || "")
                .trim(),

            novaSenha:
              String(novaSenha || "")
          })
        }
      );

    return await lerRespostaJSON(
      resposta
    );

  } catch (erro) {
    console.error(
      "Erro ao redefinir senha:",
      erro
    );

    return {
      sucesso: false,

      mensagem:
        "Não foi possível conectar com a API. Aguarde alguns segundos e tente novamente."
    };
  }
}

// =========================
// COMPATIBILIDADE ANTIGA
// =========================

function carregarUsuarios() {
  return [];
}

function salvarUsuarios() {}

function criarUsuarioPadraoBarbeiro() {}
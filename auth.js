const API_BASE_URL =
  "http://localhost:3000";

const USUARIO_LOGADO_KEY =
  "guapo_usuario_logado";

function salvarUsuarioLogado(
  usuario
) {
  localStorage.setItem(
    USUARIO_LOGADO_KEY,
    JSON.stringify(usuario)
  );
}

function pegarUsuarioLogado() {
  const dados =
    localStorage.getItem(
      USUARIO_LOGADO_KEY
    );

  return dados
    ? JSON.parse(dados)
    : null;
}

function sair() {
  localStorage.removeItem(
    USUARIO_LOGADO_KEY
  );

  localStorage.removeItem(
    "guapo_redirect_apos_login"
  );

  window.location.href =
    "login.html";
}

async function lerRespostaJSON(
  resposta
) {
  const texto =
    await resposta.text();

  let dados = {};

  try {
    dados = texto
      ? JSON.parse(texto)
      : {};

  } catch (erro) {
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

async function fazerLogin(
  email,
  senha
) {
  try {
    const resposta =
      await fetch(
        `${API_BASE_URL}/api/auth/login`,
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
        "Não foi possível conectar com a API."
    };
  }
}

async function cadastrarCliente(
  nome,
  email,
  telefone,
  senha
) {
  try {
    const resposta =
      await fetch(
        `${API_BASE_URL}/api/auth/cadastro`,
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
        "Não foi possível conectar com a API."
    };
  }
}

async function solicitarCodigoRecuperacao(
  email
) {
  try {
    const resposta =
      await fetch(
        `${API_BASE_URL}/api/auth/recuperacao/solicitar`,
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
        "Não foi possível conectar com a API."
    };
  }
}

async function verificarCodigoRecuperacao(
  email,
  codigo
) {
  try {
    const resposta =
      await fetch(
        `${API_BASE_URL}/api/auth/recuperacao/verificar`,
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
        "Não foi possível conectar com a API."
    };
  }
}

async function redefinirSenha(
  email,
  codigo,
  novaSenha
) {
  try {
    const resposta =
      await fetch(
        `${API_BASE_URL}/api/auth/recuperacao/redefinir`,
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
        "Não foi possível conectar com a API."
    };
  }
}

// Compatibilidade com códigos antigos

function carregarUsuarios() {
  return [];
}

function salvarUsuarios() {}

function criarUsuarioPadraoBarbeiro() {}
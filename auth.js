const API_BASE_URL = "http://localhost:3000";

const USUARIO_LOGADO_KEY = "guapo_usuario_logado";

function salvarUsuarioLogado(usuario) {
  localStorage.setItem(USUARIO_LOGADO_KEY, JSON.stringify(usuario));
}

function pegarUsuarioLogado() {
  const dados = localStorage.getItem(USUARIO_LOGADO_KEY);
  return dados ? JSON.parse(dados) : null;
}

function sair() {
  localStorage.removeItem(USUARIO_LOGADO_KEY);
  localStorage.removeItem("guapo_redirect_apos_login");
  window.location.href = "login.html";
}

async function fazerLogin(email, senha) {
  try {
    const resposta = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, senha })
    });

    const dados = await resposta.json();

    if (!dados.sucesso) {
      return {
        sucesso: false,
        mensagem: dados.mensagem || "Erro ao fazer login."
      };
    }

    salvarUsuarioLogado(dados.usuario);

    return {
      sucesso: true,
      usuario: dados.usuario
    };

  } catch (erro) {
    console.error("Erro no login:", erro);

    return {
      sucesso: false,
      mensagem: "Não foi possível conectar com a API."
    };
  }
}

async function cadastrarCliente(nome, email, telefone, senha) {
  try {
    const resposta = await fetch(`${API_BASE_URL}/api/auth/cadastro`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nome,
        email,
        telefone,
        senha
      })
    });

    const dados = await resposta.json();

    if (!dados.sucesso) {
      return {
        sucesso: false,
        mensagem: dados.mensagem || "Erro ao cadastrar cliente."
      };
    }

    return {
      sucesso: true,
      mensagem: dados.mensagem,
      usuario: dados.usuario
    };

  } catch (erro) {
    console.error("Erro no cadastro:", erro);

    return {
      sucesso: false,
      mensagem: "Não foi possível conectar com a API."
    };
  }
}

// Mantém compatibilidade com códigos antigos
function carregarUsuarios() {
  return [];
}

function salvarUsuarios() {}

function criarUsuarioPadraoBarbeiro() {}

function redefinirSenha() {
  return {
    sucesso: false,
    mensagem: "Recuperação de senha será ajustada depois pela API."
  };
}
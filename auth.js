const USUARIOS_KEY = "guapo_usuarios";
const USUARIO_LOGADO_KEY = "guapo_usuario_logado";

function carregarUsuarios() {
  const usuarios = localStorage.getItem(USUARIOS_KEY);
  return usuarios ? JSON.parse(usuarios) : [];
}

function salvarUsuarios(usuarios) {
  localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuarios));
}

function criarUsuarioPadraoBarbeiro() {
  const usuarios = carregarUsuarios();

  const barbeiroExiste = usuarios.some(usuario => usuario.tipo === "barbeiro");

  if (!barbeiroExiste) {
    usuarios.push({
      id: Date.now(),
      nome: "Guapo",
      email: "guapo@barber.com",
      senha: "123456",
      telefone: "",
      tipo: "barbeiro"
    });

    salvarUsuarios(usuarios);
  }
}

function cadastrarCliente(nome, email, telefone, senha) {
  const usuarios = carregarUsuarios();

  const emailJaExiste = usuarios.some(usuario => usuario.email === email);

  if (emailJaExiste) {
    return {
      sucesso: false,
      mensagem: "Este e-mail já está cadastrado."
    };
  }

  const novoUsuario = {
    id: Date.now(),
    nome,
    email,
    telefone,
    senha,
    tipo: "cliente"
  };

  usuarios.push(novoUsuario);
  salvarUsuarios(usuarios);

  return {
    sucesso: true,
    mensagem: "Cadastro realizado com sucesso!"
  };
}

function fazerLogin(email, senha) {
  criarUsuarioPadraoBarbeiro();

  const usuarios = carregarUsuarios();

  const usuarioEncontrado = usuarios.find(usuario =>
    usuario.email === email && usuario.senha === senha
  );

  if (!usuarioEncontrado) {
    return {
      sucesso: false,
      mensagem: "E-mail ou senha inválidos."
    };
  }

  localStorage.setItem(USUARIO_LOGADO_KEY, JSON.stringify(usuarioEncontrado));

  return {
    sucesso: true,
    usuario: usuarioEncontrado
  };
}

function pegarUsuarioLogado() {
  const usuario = localStorage.getItem(USUARIO_LOGADO_KEY);
  return usuario ? JSON.parse(usuario) : null;
}

function sair() {
  localStorage.removeItem(USUARIO_LOGADO_KEY);
  window.location.href = "login.html";
}

criarUsuarioPadraoBarbeiro();

function redefinirSenha(email, novaSenha) {
  const usuarios = carregarUsuarios();

  const usuarioIndex = usuarios.findIndex(usuario => usuario.email === email);

  if (usuarioIndex === -1) {
    return {
      sucesso: false,
      mensagem: "Nenhuma conta encontrada com este e-mail."
    };
  }

  if (novaSenha.length < 6) {
    return {
      sucesso: false,
      mensagem: "A nova senha precisa ter pelo menos 6 caracteres."
    };
  }

  usuarios[usuarioIndex].senha = novaSenha;
  salvarUsuarios(usuarios);

  return {
    sucesso: true,
    mensagem: "Senha redefinida com sucesso!"
  };
}
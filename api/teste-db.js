require("dotenv").config();

const conexao = require("./db");

async function testarBanco() {
  try {
    console.log(
      "Tentando conectar ao banco..."
    );

    const [informacoes] =
      await conexao.query(`
        SELECT
          DATABASE() AS banco,
          VERSION() AS versao
      `);

    const [totais] =
      await conexao.query(`
        SELECT
          (
            SELECT COUNT(*)
            FROM usuarios
          ) AS usuarios,

          (
            SELECT COUNT(*)
            FROM agendamentos
          ) AS agendamentos,

          (
            SELECT COUNT(*)
            FROM mensagens
          ) AS mensagens,

          (
            SELECT COUNT(*)
            FROM notificacoes
          ) AS notificacoes,

          (
            SELECT COUNT(*)
            FROM recuperacoes_senha
          ) AS recuperacoes
      `);

    console.log(
      "Banco conectado com sucesso!"
    );

    console.log(
      "Banco atual:",
      informacoes[0].banco
    );

    console.log(
      "Versão do MySQL:",
      informacoes[0].versao
    );

    console.log(
      "Usuários:",
      totais[0].usuarios
    );

    console.log(
      "Agendamentos:",
      totais[0].agendamentos
    );

    console.log(
      "Mensagens:",
      totais[0].mensagens
    );

    console.log(
      "Notificações:",
      totais[0].notificacoes
    );

    console.log(
      "Recuperações:",
      totais[0].recuperacoes
    );

  } catch (erro) {
    console.error(
      "Erro ao conectar ao banco:"
    );

    console.error(
      erro.message || erro
    );

  } finally {
    await conexao.end();
  }
}

testarBanco();
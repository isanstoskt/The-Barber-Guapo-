require("dotenv").config();

const conexao = require("./db");

async function testarBanco() {
  try {
    const [linhas] = await conexao.query("SELECT 1 + 1 AS resultado");

    console.log("Banco conectado com sucesso!");
    console.log("Resultado do teste:", linhas[0].resultado);

    process.exit();
  } catch (erro) {
    console.error("Erro ao conectar no banco:");
    console.error(erro.message);

    process.exit(1);
  }
}

testarBanco();
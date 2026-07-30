require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function carregarCertificadoSSL() {
  const usarSSL =
    String(process.env.DB_SSL || "false")
      .toLowerCase() === "true";

  if (!usarSSL) {
    return undefined;
  }

  /*
    Para testar localmente, usamos o caminho
    do certificado baixado da Aiven.
  */

  if (process.env.DB_SSL_CA_PATH) {
    const caminhoCertificado = path.resolve(
      process.env.DB_SSL_CA_PATH
    );

    if (!fs.existsSync(caminhoCertificado)) {
      throw new Error(
        `Certificado SSL não encontrado em: ${caminhoCertificado}`
      );
    }

    return {
      ca: fs.readFileSync(
        caminhoCertificado,
        "utf8"
      ),

      rejectUnauthorized: true
    };
  }

  /*
    Esta opção será usada posteriormente
    quando colocarmos a API no Render.
  */

  if (process.env.DB_SSL_CA_BASE64) {
    return {
      ca: Buffer.from(
        process.env.DB_SSL_CA_BASE64,
        "base64"
      ).toString("utf8"),

      rejectUnauthorized: true
    };
  }

  throw new Error(
    "O SSL está ativado, mas nenhum certificado foi configurado."
  );
}

const conexao = mysql.createPool({
  host:
    process.env.DB_HOST ||
    "localhost",

  port:
    Number(
      process.env.DB_PORT || 3306
    ),

  user:
    process.env.DB_USER ||
    "root",

  password:
    process.env.DB_PASSWORD ||
    "",

  database:
    process.env.DB_NAME ||
    "guapo_barber",

  ssl:
    carregarCertificadoSSL(),

  charset:
    "utf8mb4",

  waitForConnections:
    true,

  connectionLimit:
    10,

  queueLimit:
    0,

  enableKeepAlive:
    true,

  keepAliveInitialDelay:
    0
});

module.exports = conexao;
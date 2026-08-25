require("dotenv").config();

const mysql = require("mysql2/promise");

// =========================
// CONFIGURAÇÃO DO BANCO
// KINGHOST
// =========================

const conexao = mysql.createPool({
  host:
    process.env.DB_HOST ||
    "mysql.oguapo.kinghost.net",

  port:
    Number(
      process.env.DB_PORT ||
      3306
    ),

  user:
    process.env.DB_USER ||
    "oguapo",

  password:
    process.env.DB_PASSWORD ||
    "",

  database:
    process.env.DB_NAME ||
    "oguapo",

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
import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 4000),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,

  ssl: {
    minVersion: "TLSv1.2"
  },

  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true,
  connectTimeout: 10000,
});

export default db;
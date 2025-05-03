const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'education_platform',
  password: 'sima2014', // Укажи пароль, который ты задала при установке PostgreSQL
  port: 5432,
});

module.exports = pool;
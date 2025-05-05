const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'education_platform',
  password: '123125', // Укажи пароль, который ты задала при установке PostgreSQL
  port: 5432,
});

// Проверка подключения к базе данных
pool.connect((err, client, release) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err.stack);
  } else {
    console.log('Успешное подключение к базе данных PostgreSQL');
    release();
  }
});

module.exports = pool;
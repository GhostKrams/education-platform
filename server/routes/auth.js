const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Временное хранилище кодов (для демо, в продакшене используй Redis)
const resetCodes = {};

// Настройка транспортера для отправки email (пример для Gmail)
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'krams.anna@gmail.com', // email
    pass: '...', //пароль приложения(почта реальная, надо будет протестить, пароль дам) 
  },
});

// Отправка кода на email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await pool.query('SELECT * FROM Users WHERE Email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь с таким email не найден' });
    }

    // Генерируем 6-значный код
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Сохраняем код во временное хранилище (с TTL 10 минут)
    resetCodes[email] = { code, expires: Date.now() + 10 * 60 * 1000 };

    // Отправляем email с кодом
    const mailOptions = {
      from: 'krams.anna98@gmail.com',
      to: email,
      subject: 'Код восстановления пароля',
      text: `Ваш код для восстановления пароля: ${code}\nКод действителен 10 минут.`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Код отправлен на ваш email' });
  } catch (error) {
    console.error('Ошибка отправки email:', error);
    res.status(500).json({ message: 'Ошибка сервера при отправке email' });
  }
});

// Проверка кода
router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;

  const storedCode = resetCodes[email];
  if (!storedCode) {
    return res.status(400).json({ message: 'Код не найден или истёк' });
  }

  if (storedCode.expires < Date.now()) {
    delete resetCodes[email];
    return res.status(400).json({ message: 'Код истёк' });
  }

  if (storedCode.code !== code) {
    return res.status(400).json({ message: 'Неверный код' });
  }

  res.json({ message: 'Код подтверждён' });
});

// Смена пароля
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const user = await pool.query('SELECT * FROM Users WHERE Email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь с таким email не найден' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE Users SET PasswordHash = $1 WHERE Email = $2', [hashedPassword, email]);

    // Удаляем код после успешной смены пароля
    delete resetCodes[email];

    res.json({ message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
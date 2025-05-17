const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken'); // Добавляем библиотеку JWT

const JWT_SECRET = 'your_jwt_secret_key'; // Храните в .env в продакшене

const resetCodes = {};

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'krams.anna@gmail.com',
    pass: process.env.EMAIL_PASS || 'your_email_password', // Используйте .env
  },
});

// Отправка кода на email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь с таким email не найден' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    resetCodes[email] = { code, expires: Date.now() + 10 * 60 * 1000 };

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
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь с таким email не найден' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET passwordhash = $1 WHERE email = $2', [hashedPassword, email]);

    delete resetCodes[email];
    res.json({ message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Регистрация пользователя
router.post('/register', async (req, res) => {
  console.log('POST /auth/register вызван');
  const { firstName, lastName, email, password } = req.body;
  console.log('POST /register body:', req.body);
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ success: false, message: 'Заполните все поля' });
  }
  try {
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email уже зарегистрирован' });
    }
    const fullName = `${firstName} ${lastName}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await pool.query(
      'INSERT INTO users (fullname, email, passwordhash, role) VALUES ($1, $2, $3, $4) RETURNING userid, fullname, email, role',
      [fullName, email, hashedPassword, 'Student']
    );
    console.log('INSERT RESULT:', insertResult.rows);

    if (insertResult.rows.length === 0) {
      return res.status(500).json({ success: false, message: 'Ошибка при добавлении пользователя' });
    }

    const user = insertResult.rows[0];
    const token = jwt.sign(
      { userId: user.userid, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      message: 'Регистрация успешна',
      token,
      user: {
        userId: user.userid,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        avatarUrl: null
      }
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ success: false, message: 'Ошибка сервера при регистрации', error: error.message });
  }
});

// Авторизация пользователя
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Неверный email или пароль' });
    }
    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.passwordhash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      { userId: user.userid, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      message: 'Вход выполнен',
      token,
      user: {
        userId: user.userid,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        avatarUrl: null
      }
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ success: false, message: 'Ошибка сервера при входе' });
  }
});

router.get('/users/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Токен не предоставлен' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userResult = await pool.query(
      'SELECT userid, fullname, email, role FROM users WHERE userid = $1',
      [decoded.userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json({ user: userResult.rows[0] });
  } catch (error) {
    console.error('Ошибка получения данных пользователя:', error);
    res.status(401).json({ message: 'Неверный или истёкший токен' });
  }
});

module.exports = router;
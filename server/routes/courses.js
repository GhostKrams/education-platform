const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_jwt_secret_key'; // Тот же секретный ключ

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Токен не предоставлен' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};

// Получение активных курсов пользователя
router.get('/courses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Запрашиваем курсы, на которые записан пользователь через таблицу CourseEnrollments
    const coursesResult = await pool.query(
      `
      SELECT c.courseid, c.title, c.description, c.startdate, c.enddate, ce.progress, ce.lessons_completed, ce.total_lessons
      FROM courses c
      JOIN courseenrollments ce ON c.courseid = ce.courseid
      WHERE ce.studentid = $1 AND ce.status = 'active'
      `,
      [userId]
    );

    const courses = coursesResult.rows.map((course) => {
      // Рассчитываем оставшееся время до конца курса (пример)
      let timeLeft = 'Завершён';
      if (course.enddate) {
        const endDate = new Date(course.enddate);
        const now = new Date();
        const monthsLeft = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24 * 30)));
        timeLeft = monthsLeft > 0 ? `${monthsLeft} мес.` : 'Завершён';
      }

      return {
        courseid: course.courseid,
        title: course.title,
        description: course.description,
        progress: course.progress || 0,
        lessons_completed: course.lessons_completed || 0,
        total_lessons: course.total_lessons || 0,
        time_left: timeLeft,
      };
    });

    res.json({ courses });
  } catch (error) {
    console.error('Ошибка получения курсов:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Создание нового курса (для преподавателей и админов)
router.post('/courses', authenticateToken, async (req, res) => {
  const { title, description, startDate, endDate } = req.body;
  const userId = req.user.userId;
  const role = req.user.role;

  if (role !== 'Teacher' && role !== 'Admin') {
    return res.status(403).json({ message: 'Доступ запрещён: только для преподавателей и админов' });
  }

  try {
    const insertResult = await pool.query(
      `
      INSERT INTO courses (title, description, startdate, enddate, teacherid)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING courseid
      `,
      [title, description, startDate || null, endDate || null, userId]
    );

    if (insertResult.rows.length === 0) {
      return res.status(500).json({ message: 'Ошибка создания курса' });
    }

    res.status(201).json({ message: 'Курс успешно создан', courseId: insertResult.rows[0].courseid });
  } catch (error) {
    console.error('Ошибка создания курса:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
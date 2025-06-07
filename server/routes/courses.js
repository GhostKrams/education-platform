const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Получение данных пользователя
router.get('/users/me', async (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.status(400).json({ message: 'Email не предоставлен' });
    }

    try {
        const userResult = await pool.query(
            'SELECT userid, fullname, email, role FROM users WHERE email = $1',
            [email]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        res.json({ user: userResult.rows[0] });
    } catch (error) {
        console.error('Ошибка получения данных пользователя:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получение активных курсов пользователя
router.get('/', async (req, res) => {
    const { email } = req.query;
    console.log('Запрос на /api/courses с email:', email);
    if (!email) {
        return res.status(400).json({ message: 'Email не предоставлен' });
    }

    try {
        const userResult = await pool.query('SELECT userid FROM users WHERE email = $1', [email]);
        console.log('Результат поиска пользователя:', userResult.rows);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        const userId = userResult.rows[0].userid;

        // Получаем курсы, где пользователь является учителем или учеником
        const coursesResult = await pool.query(
            `
            (SELECT c.courseid, c.title, c.description, c.startdate, c.enddate, NULL as progress, NULL as lessons_completed, NULL as total_lessons
             FROM courses c
             WHERE c.teacherid = $1)
            UNION
            (SELECT c.courseid, c.title, c.description, c.startdate, c.enddate, ce.progress, ce.lessons_completed, ce.total_lessons
             FROM courses c
             JOIN courseenrollments ce ON c.courseid = ce.courseid
             WHERE ce.userid = $1 AND ce.status = 'active')
            `,
            [userId]
        );
        console.log('Результат поиска курсов:', coursesResult.rows);

        const courses = coursesResult.rows.map((course) => {
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
                total_lessons: course.total_lessons || 1,
                time_left: timeLeft,
            };
        });

        console.log('Отправляемые курсы:', courses);
        res.json({ courses });
    } catch (error) {
        console.error('Ошибка получения курсов:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создание нового курса (для преподавателей и админов)
router.post('/', async (req, res) => {
    const { title, description, startDate, endDate, teacherId } = req.body;

    try {
        const userResult = await pool.query('SELECT role FROM users WHERE userid = $1', [teacherId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const role = userResult.rows[0].role;
        if (role !== 'Teacher' && role !== 'Admin') {
            return res.status(403).json({ message: 'Доступ запрещён: только для преподавателей и админов' });
        }

        const insertResult = await pool.query(
            `
            INSERT INTO courses (title, description, startdate, enddate, teacherid)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING courseid
            `,
            [title, description, startDate || null, endDate || null, teacherId]
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
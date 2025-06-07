const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Получение информации о курсе
router.get('/', async (req, res) => {
    const { courseId, email } = req.query;
    if (!courseId || !email) {
        return res.status(400).json({ message: 'CourseId или email не предоставлены' });
    }

    try {
        const userResult = await pool.query('SELECT UserID FROM Users WHERE Email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        const userId = userResult.rows[0].userid;

        const courseResult = await pool.query(
            `
            SELECT c.CourseID, c.Title, c.Description, c.StartDate, c.EndDate, ce.progress, ce.lessons_completed, ce.total_lessons
            FROM Courses c
            LEFT JOIN CourseEnrollments ce ON c.CourseID = ce.CourseID AND ce.UserID = $2
            WHERE c.CourseID = $1
            `,
            [courseId, userId]
        );

        if (courseResult.rows.length === 0) {
            return res.status(404).json({ message: 'Курс не найден' });
        }

        const course = courseResult.rows[0];
        res.json({
            course: {
                courseid: course.courseid,
                title: course.title,
                description: course.description,
                startdate: course.startdate,
                enddate: course.enddate,
                progress: course.progress || 0,
                lessons_completed: course.lessons_completed || 0,
                total_lessons: course.total_lessons || 0
            }
        });
    } catch (error) {
        console.error('Ошибка получения данных курса:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получение списка уроков курса
router.get('/lessons', async (req, res) => {
    const { courseId, email } = req.query;
    if (!courseId || !email) {
        return res.status(400).json({ message: 'CourseId или email не предоставлены' });
    }

    try {
        const userResult = await pool.query('SELECT UserID FROM Users WHERE Email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        const userId = userResult.rows[0].userid;

        const lessonsResult = await pool.query(
            `
            SELECT l.LessonID, l.Title, l.Content, l.Date,
                   EXISTS (
                       SELECT 1 FROM HomeworkSubmissions hs
                       JOIN Homeworks h ON hs.HomeworkID = h.HomeworkID
                       WHERE h.LessonID = l.LessonID AND hs.UserID = $2 AND hs.Grade IS NOT NULL
                   ) as is_completed
            FROM Lessons l
            WHERE l.CourseID = $1
            ORDER BY l.Date ASC NULLS LAST, l.LessonID ASC
            `,
            [courseId, userId]
        );

        const lessons = lessonsResult.rows.map(lesson => ({
            lessonid: lesson.lessonid,
            title: lesson.title,
            description: lesson.content,
            date: lesson.date,
            is_completed: lesson.is_completed
        }));

        res.json({ lessons });
    } catch (error) {
        console.error('Ошибка получения уроков:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получение списка учеников курса
router.get('/students', async (req, res) => {
    const { courseId } = req.query;
    if (!courseId) {
        return res.status(400).json({ message: 'CourseId не предоставлен' });
    }

    try {
        const studentsResult = await pool.query(
            `
            SELECT u.UserID, u.FullName, u.Email, ce.progress
            FROM Users u
            JOIN CourseEnrollments ce ON u.UserID = ce.UserID
            WHERE ce.CourseID = $1 AND ce.status = 'active'
            `,
            [courseId]
        );

        const students = studentsResult.rows.map(student => ({
            userid: student.userid,
            fullname: student.fullname,
            email: student.email,
            progress: student.progress || 0,
            avatarUrl: null
        }));

        res.json({ students });
    } catch (error) {
        console.error('Ошибка получения списка учеников:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получение статистики курса
router.get('/stats', async (req, res) => {
    const { courseId } = req.query;
    if (!courseId) {
        return res.status(400).json({ message: 'CourseId не предоставлен' });
    }

    try {
        const statsResult = await pool.query(
            `
            SELECT 
                COALESCE(AVG(ce.progress), 0)::integer as avg_progress,
                COUNT(DISTINCT ce.UserID) as total_students,
                COALESCE(AVG(ce.lessons_completed), 0)::integer as avg_lessons_completed,
                COALESCE(AVG(hs.Grade), 0)::numeric(4,2) as avg_homework_grade
            FROM CourseEnrollments ce
            LEFT JOIN HomeworkSubmissions hs ON ce.UserID = hs.UserID
            LEFT JOIN Homeworks h ON hs.HomeworkID = h.HomeworkID
            LEFT JOIN Lessons l ON h.LessonID = l.LessonID
            WHERE ce.CourseID = $1 AND ce.status = 'active'
              AND (l.CourseID = ce.CourseID OR l.CourseID IS NULL)
            `,
            [courseId]
        );

        const stats = statsResult.rows[0];
        res.json({
            stats: {
                avg_progress: stats.avg_progress || 0,
                total_students: stats.total_students || 0,
                avg_lessons_completed: stats.avg_lessons_completed || 0,
                avg_homework_grade: stats.avg_homework_grade || 0
            }
        });
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создание нового урока
router.post('/lessons', async (req, res) => {
    const { courseId, title, description, date } = req.body;
    if (!courseId || !title) {
        return res.status(400).json({ message: 'CourseId и title обязательны' });
    }

    try {
        // Проверка, что пользователь является преподавателем курса или админом
        const userResult = await pool.query(
            'SELECT Role FROM Users u JOIN Courses c ON u.UserID = c.TeacherID WHERE c.CourseID = $1',
            [courseId]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Курс не найден' });
        }
        const userRole = userResult.rows[0].role;
        if (userRole !== 'Teacher' && userRole !== 'Admin') {
            return res.status(403).json({ message: 'Доступ запрещён: только преподаватели или админы могут добавлять уроки' });
        }

        const insertResult = await pool.query(
            `
            INSERT INTO Lessons (CourseID, Title, Content, Date)
            VALUES ($1, $2, $3, $4)
            RETURNING LessonID
            `,
            [courseId, title, description || null, date || null]
        );

        if (insertResult.rows.length === 0) {
            return res.status(500).json({ message: 'Ошибка создания урока' });
        }

        // Обновление total_lessons в CourseEnrollments
        await pool.query(
            `
            UPDATE CourseEnrollments
            SET total_lessons = (
                SELECT COUNT(*) FROM Lessons WHERE CourseID = $1
            )
            WHERE CourseID = $1
            `,
            [courseId]
        );

        res.status(201).json({ message: 'Урок успешно создан', lessonId: insertResult.rows[0].lessonid });
    } catch (error) {
        console.error('Ошибка создания урока:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router;
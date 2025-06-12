const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

// Настройка Multer для загрузки вложений
const projectRoot = path.join(__dirname, '..', '..');
const attachmentsDir = path.join(projectRoot, 'uploads', 'feedback_attachments');
fs.mkdirSync(attachmentsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, attachmentsDir),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// Вспомогательная функция для получения пользователя
async function getUser(email) {
    if (!email) return null;
    const result = await pool.query('SELECT UserID, FullName, Role FROM Users WHERE Email = $1', [email]);
    return result.rows[0] || null;
}

// Получение данных для фильтров
router.get('/filters', async (req, res) => {
    try {
        const courses = await pool.query('SELECT CourseID, Title FROM Courses ORDER BY Title');
        const lessons = await pool.query('SELECT LessonID, Title, CourseID FROM Lessons ORDER BY Title');
        res.json({
            courses: courses.rows.map(c => ({ id: c.courseid, title: c.title })),
            lessons: lessons.rows.map(l => ({ id: l.lessonid, title: l.title, courseId: l.courseid }))
        });
    } catch (error) {
        console.error('Ошибка загрузки фильтров:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получение ленты ответов
router.get('/', async (req, res) => {
    const { email, courseId, lessonId, status } = req.query;
    const user = await getUser(email);

    if (!user) return res.status(401).json({ message: 'Пользователь не авторизован' });

    try {
        let query = `
            WITH RECURSIVE CommentTree AS (
                -- Базовый случай: корневые комментарии
                SELECT 
                    lc.CommentID, lc.CommentText, lc.CreatedAt, lc.IsHomeworkSubmission, 
                    lc.status, lc.attachment_file_path, lc.attachment_file_name,
                    lc.ParentCommentID, lc.UserID, lc.LessonID,
                    u.FullName AS UserName, u.Role AS UserRole,
                    l.Title AS LessonTitle, c.CourseID, c.Title AS CourseTitle,
                    hs.Grade, hs.SubmissionID,
                    1 AS level
                FROM LessonComments lc
                JOIN Users u ON lc.UserID = u.UserID
                JOIN Lessons l ON lc.LessonID = l.LessonID
                JOIN Courses c ON l.CourseID = c.CourseID
                LEFT JOIN Homeworks h ON l.LessonID = h.LessonID
                LEFT JOIN HomeworkSubmissions hs ON h.HomeworkID = hs.HomeworkID AND lc.UserID = hs.UserID
                WHERE lc.ParentCommentID IS NULL
        `;
        const params = [];

        // Фильтрация для студентов - показываем только их комментарии и ответы на них
        if (user.role === 'Student') {
            params.push(user.userid);
            query += ` AND (lc.UserID = $${params.length} OR lc.CommentID IN (
                SELECT DISTINCT ParentCommentID FROM LessonComments WHERE UserID = $${params.length}
            ))`;
        }

        if (courseId) {
            params.push(courseId);
            query += ` AND c.CourseID = $${params.length}`;
        }
        if (lessonId) {
            params.push(lessonId);
            query += ` AND l.LessonID = $${params.length}`;
        }
        if (status) {
            params.push(status);
            query += ` AND lc.status = $${params.length}`;
        }

        // Рекурсивная часть для получения ответов на комментарии
        query += `
                UNION ALL
                
                -- Рекурсивный случай: ответы на комментарии
                SELECT 
                    lc.CommentID, lc.CommentText, lc.CreatedAt, lc.IsHomeworkSubmission, 
                    lc.status, lc.attachment_file_path, lc.attachment_file_name,
                    lc.ParentCommentID, lc.UserID, lc.LessonID,
                    u.FullName AS UserName, u.Role AS UserRole,
                    l.Title AS LessonTitle, c.CourseID, c.Title AS CourseTitle,
                    hs.Grade, hs.SubmissionID,
                    ct.level + 1
                FROM LessonComments lc
                JOIN Users u ON lc.UserID = u.UserID
                JOIN Lessons l ON lc.LessonID = l.LessonID
                JOIN Courses c ON l.CourseID = c.CourseID
                LEFT JOIN Homeworks h ON l.LessonID = h.LessonID
                LEFT JOIN HomeworkSubmissions hs ON h.HomeworkID = hs.HomeworkID AND lc.UserID = hs.UserID
                JOIN CommentTree ct ON lc.ParentCommentID = ct.CommentID
            )
            
            SELECT * FROM CommentTree
            ORDER BY 
                CASE WHEN ParentCommentID IS NULL THEN CommentID ELSE ParentCommentID END,
                level, CreatedAt
        `;

        const feedResult = await pool.query(query, params);

        res.json(feedResult.rows.map(row => ({
            commentId: row.commentid,
            commentText: row.commenttext,
            createdAt: row.createdat,
            isHomeworkSubmission: row.ishomeworksubmission,
            status: row.status,
            attachment: row.attachment_file_path ? {
                path: row.attachment_file_path,
                name: row.attachment_file_name,
                isImage: ['jpg', 'jpeg', 'png', 'gif'].includes(path.extname(row.attachment_file_name).toLowerCase().slice(1))
            } : null,
            user: {
                id: row.userid,
                name: row.username,
                role: row.userrole
            },
            lesson: {
                id: row.lessonid,
                title: row.lessontitle
            },
            course: {
                id: row.courseid,
                title: row.coursetitle
            },
            submission: row.submissionid ? {
                id: row.submissionid,
                grade: row.grade
            } : null,
            parentCommentId: row.parentcommentid,
            level: row.level
        })));
    } catch (error) {
        console.error('Ошибка загрузки ленты ответов:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создание нового комментария
router.post('/', upload.single('attachment'), async (req, res) => {
    const { email, lessonId, commentText, parentCommentId } = req.body;
    const user = await getUser(email);

    if (!user) return res.status(401).json({ message: 'Пользователь не авторизован' });
    if (!lessonId || !commentText) return res.status(400).json({ message: 'Не хватает обязательных данных' });

    try {
        // Проверяем, есть ли доступ к родительскому комментарию
        if (parentCommentId) {
            const parentComment = await pool.query(
                'SELECT UserID FROM LessonComments WHERE CommentID = $1',
                [parentCommentId]
            );
            if (parentComment.rows.length === 0) {
                return res.status(404).json({ message: 'Родительский комментарий не найден' });
            }
            
            // Студент может отвечать только на свои комментарии или комментарии учителя
            if (user.role === 'Student' && 
                parentComment.rows[0].userid !== user.userid && 
                !(await isTeacherComment(parentComment.rows[0].userid))) {
                return res.status(403).json({ message: 'Нет доступа к этому комментарию' });
            }
        }

        const filePath = req.file ? path.join('uploads', 'feedback_attachments', req.file.filename) : null;
        const fileName = req.file ? req.file.originalname : null;

        const insertQuery = `
            INSERT INTO LessonComments (
                LessonID, UserID, CommentText, IsTeacherComment, 
                status, attachment_file_path, attachment_file_name, ParentCommentID
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING CommentID, CreatedAt
        `;
        
        const status = user.role === 'Student' ? 'Требует проверки' : null;
        const isTeacherComment = ['Teacher', 'Admin'].includes(user.role);
        
        const result = await pool.query(insertQuery, [
            lessonId, 
            user.userid, 
            commentText, 
            isTeacherComment,
            status,
            filePath,
            fileName,
            parentCommentId || null
        ]);

        res.status(201).json({
            message: 'Комментарий добавлен',
            commentId: result.rows[0].commentid,
            createdAt: result.rows[0].createdat
        });
    } catch (error) {
        console.error('Ошибка добавления комментария:', error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Обновление статуса комментария
router.put('/:commentId/status', async (req, res) => {
    const { commentId } = req.params;
    const { email, status } = req.body;
    const user = await getUser(email);

    if (!user || !['Teacher', 'Admin'].includes(user.role)) {
        return res.status(403).json({ message: 'Доступ запрещён' });
    }

    try {
        await pool.query(
            'UPDATE LessonComments SET status = $1 WHERE CommentID = $2',
            [status, commentId]
        );
        res.json({ message: 'Статус обновлён' });
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Обновление оценки для ДЗ
router.put('/:commentId/grade', async (req, res) => {
    const { commentId } = req.params;
    const { email, grade, feedback } = req.body;
    const user = await getUser(email);

    if (!user || !['Teacher', 'Admin'].includes(user.role)) {
        return res.status(403).json({ message: 'Доступ запрещён' });
    }

    try {
        // Получаем информацию о комментарии
        const comment = await pool.query(
            `SELECT lc.IsHomeworkSubmission, hs.SubmissionID 
             FROM LessonComments lc
             LEFT JOIN Homeworks h ON lc.LessonID = h.LessonID
             LEFT JOIN HomeworkSubmissions hs ON h.HomeworkID = hs.HomeworkID AND lc.UserID = hs.UserID
             WHERE lc.CommentID = $1`,
            [commentId]
        );

        if (comment.rows.length === 0) {
            return res.status(404).json({ message: 'Комментарий не найден' });
        }

        if (!comment.rows[0].ishomeworksubmission) {
            return res.status(400).json({ message: 'Этот комментарий не является сдачей ДЗ' });
        }

        // Обновляем оценку
        await pool.query(
            `UPDATE HomeworkSubmissions 
             SET Grade = $1, Feedback = $2, CheckedBy = $3
             WHERE SubmissionID = $4`,
            [grade, feedback, user.userid, comment.rows[0].submissionid]
        );

        res.json({ message: 'Оценка обновлена' });
    } catch (error) {
        console.error('Ошибка обновления оценки:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Обновление комментария
router.put('/:commentId', upload.single('attachment'), async (req, res) => {
    const { commentId } = req.params;
    const { email, commentText } = req.body;
    const user = await getUser(email);

    if (!user) return res.status(401).json({ message: 'Пользователь не авторизован' });

    try {
        // Проверяем, принадлежит ли комментарий пользователю
        const comment = await pool.query(
            'SELECT UserID FROM LessonComments WHERE CommentID = $1',
            [commentId]
        );

        if (comment.rows.length === 0) {
            return res.status(404).json({ message: 'Комментарий не найден' });
        }

        if (comment.rows[0].userid !== user.userid) {
            return res.status(403).json({ message: 'Вы не можете редактировать этот комментарий' });
        }

        const filePath = req.file ? path.join('uploads', 'feedback_attattachments', req.file.filename) : null;
        const fileName = req.file ? req.file.originalname : null;

        await pool.query(
            `UPDATE LessonComments 
             SET CommentText = $1, 
                 attachment_file_path = COALESCE($2, attachment_file_path),
                 attachment_file_name = COALESCE($3, attachment_file_name)
             WHERE CommentID = $4`,
            [commentText, filePath, fileName, commentId]
        );

        res.json({ message: 'Комментарий обновлён' });
    } catch (error) {
        console.error('Ошибка обновления комментария:', error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Вспомогательная функция для проверки, является ли пользователь учителем
async function isTeacherComment(userId) {
    const result = await pool.query('SELECT Role FROM Users WHERE UserID = $1', [userId]);
    return result.rows.length > 0 && ['Teacher', 'Admin'].includes(result.rows[0].role);
}

module.exports = router;
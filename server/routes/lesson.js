const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

// Настройка путей к папкам для загрузок относительно корня проекта
const projectRoot = path.join(__dirname, '..', '..'); // Корень проекта (выход из backend/routes/)
const uploadsDir = path.join(projectRoot, 'uploads');
const materialsDir = path.join(uploadsDir, 'materials');
const homeworksDir = path.join(uploadsDir, 'homeworks');

// Убедимся, что папки для загрузки существуют
fs.mkdirSync(materialsDir, { recursive: true });
fs.mkdirSync(homeworksDir, { recursive: true });

// Multer storage для материалов урока
const materialsStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, materialsDir);
    },
    filename: function (req, file, cb) {
        cb(null, uuidv4() + path.extname(file.originalname));
    }
});
const uploadMaterials = multer({ storage: materialsStorage });

// Multer storage для домашних заданий
const homeworkStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, homeworksDir);
    },
    filename: function (req, file, cb) {
        cb(null, uuidv4() + path.extname(file.originalname));
    }
});
const uploadHomework = multer({
    storage: homeworkStorage,
    limits: { fileSize: 25 * 1024 * 1024 } // Ограничение размера файла 25 МБ
});

// Вспомогательная функция для получения пользователя и его роли
async function getUserAndRole(email) {
    if (!email) return null;
    const userResult = await pool.query('SELECT UserID, FullName, Role FROM Users WHERE Email = $1', [email]);
    if (userResult.rows.length === 0) return null;
    return userResult.rows[0]; // userid, fullname, role
}

// GET Детали урока (включая ДЗ и статус сдачи)
router.get('/', async (req, res) => {
    const { lessonId, email } = req.query;
    if (!lessonId || !email) {
        return res.status(400).json({ message: 'LessonId или email не предоставлены' });
    }

    try {
        const user = await getUserAndRole(email);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        const lessonQuery = `
            SELECT 
                l.LessonID, l.Title, l.Content, l.Date, l.CourseID, 
                c.Title AS CourseTitle,
                h.HomeworkID, h.TaskText,
                EXISTS (
                    SELECT 1 FROM HomeworkSubmissions hs 
                    WHERE hs.HomeworkID = h.HomeworkID AND hs.UserID = $2
                ) AS has_submission
            FROM Lessons l
            JOIN Courses c ON l.CourseID = c.CourseID
            LEFT JOIN Homeworks h ON l.LessonID = h.LessonID
            WHERE l.LessonID = $1;
        `;
        const lessonResult = await pool.query(lessonQuery, [lessonId, user.userid]);

        if (lessonResult.rows.length === 0) {
            return res.status(404).json({ message: 'Урок не найден' });
        }

        const lessonData = lessonResult.rows[0];
        res.json({
            lesson: {
                lessonId: lessonData.lessonid,
                title: lessonData.title,
                videoUrl: lessonData.content,
                date: lessonData.date,
                courseId: lessonData.courseid,
                courseTitle: lessonData.coursetitle,
                homework: lessonData.homeworkid ? {
                    homeworkId: lessonData.homeworkid,
                    taskText: lessonData.tasktext,
                    hasSubmission: lessonData.has_submission
                } : null,
                isEditable: ['Teacher', 'Admin'].includes(user.role)
            }
        });
    } catch (error) {
        console.error('Ошибка получения данных урока:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении данных урока' });
    }
});

// GET Материалы урока
router.get('/materials', async (req, res) => {
    const { lessonId } = req.query;
    if (!lessonId) return res.status(400).json({ message: 'LessonId не предоставлен' });

    try {
        const materialsResult = await pool.query(
            'SELECT MaterialID, FileName, FileType, FileSize, FilePath FROM LessonMaterials WHERE LessonID = $1 ORDER BY UploadedAt DESC',
            [lessonId]
        );
        res.json({
            materials: materialsResult.rows.map(m => ({
                materialId: m.materialid,
                fileName: m.filename,
                fileType: m.filetype,
                fileSize: m.filesize,
                filePath: m.filepath.replace(/\\/g, '/')
            }))
        });
    } catch (error) {
        console.error('Ошибка получения материалов:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении материалов' });
    }
});

// DOWNLOAD Материал урока
router.get('/materials/download/:materialId', async (req, res) => {
    const { materialId } = req.params;
    try {
        const materialResult = await pool.query(
            'SELECT FilePath, FileName FROM LessonMaterials WHERE MaterialID = $1',
            [materialId]
        );
        if (materialResult.rows.length === 0) {
            return res.status(404).json({ message: 'Материал не найден' });
        }
        const { filepath, filename } = materialResult.rows[0];
        const absoluteFilePath = path.join(projectRoot, filepath);

        if (fs.existsSync(absoluteFilePath)) {
            res.download(absoluteFilePath, filename);
        } else {
            console.error(`Файл не найден на сервере: ${absoluteFilePath} (запрошен по ID: ${materialId})`);
            res.status(404).json({ message: 'Файл не найден на сервере' });
        }
    } catch (error) {
        console.error('Ошибка скачивания материала:', error);
        res.status(500).json({ message: 'Ошибка сервера при скачивании материала' });
    }
});

// DELETE Материал урока (только Учитель/Админ)
router.delete('/materials/:materialId', async (req, res) => {
    const { materialId } = req.params;
    const { email } = req.body;

    try {
        const user = await getUserAndRole(email);
        if (!user || !['Teacher', 'Admin'].includes(user.role)) {
            return res.status(403).json({ message: 'Доступ запрещён' });
        }

        const materialResult = await pool.query(
            'SELECT FilePath FROM LessonMaterials WHERE MaterialID = $1',
            [materialId]
        );
        if (materialResult.rows.length === 0) {
            return res.status(404).json({ message: 'Материал не найден для удаления' });
        }

        const { filepath } = materialResult.rows[0];
        const absoluteFilePath = path.join(projectRoot, filepath);

        await pool.query('DELETE FROM LessonMaterials WHERE MaterialID = $1', [materialId]);

        if (fs.existsSync(absoluteFilePath)) {
            fs.unlinkSync(absoluteFilePath);
        }

        res.json({ message: 'Материал успешно удалён' });
    } catch (error) {
        console.error('Ошибка удаления материала:', error);
        res.status(500).json({ message: 'Ошибка сервера при удалении материала' });
    }
});

// GET Комментарии к уроку
router.get('/comments', async (req, res) => {
    const { lessonId, email } = req.query;
    if (!lessonId || !email) {
        return res.status(400).json({ message: 'LessonId или email не предоставлены' });
    }
    try {
        const user = await getUserAndRole(email);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        let commentsQuery = `
            SELECT lc.CommentID, lc.UserID, u.FullName, u.Role AS UserRole, lc.CommentText, lc.CreatedAt,
                   lc.IsTeacherComment, lc.IsHomeworkSubmission, lc.SubmissionFileName, lc.SubmissionFilePath
            FROM LessonComments lc
            JOIN Users u ON lc.UserID = u.UserID
            WHERE lc.LessonID = $1
        `;
        const queryParams = [lessonId];

        if (!['Teacher', 'Admin'].includes(user.role)) {
            commentsQuery += ` AND (
                (lc.IsHomeworkSubmission = FALSE AND lc.UserID = $2) OR 
                (lc.IsHomeworkSubmission = TRUE AND lc.UserID = $2) OR
                (lc.IsHomeworkSubmission = FALSE AND lc.IsTeacherComment = TRUE)
            ) `;
            queryParams.push(user.userid);
        }
        commentsQuery += ' ORDER BY lc.CreatedAt ASC';

        const commentsResult = await pool.query(commentsQuery, queryParams);
        res.json({
            comments: commentsResult.rows.map(c => ({
                commentId: c.commentid,
                userId: c.userid,
                fullName: c.fullname,
                role: c.userrole,
                commentText: c.commenttext,
                createdAt: c.createdat,
                isTeacherComment: c.isteachercomment,
                isHomeworkSubmission: c.ishomeworksubmission,
                submissionFileName: c.submissionfilename,
                submissionFilePath: c.submissionfilepath ? c.submissionfilepath.replace(/\\/g, '/') : null,
                avatarUrl: null // Заглушка для аватара, замените на реальную логику, если есть
            }))
        });
    } catch (error) {
        console.error('Ошибка получения комментариев:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении комментариев' });
    }
});

// POST Новый комментарий
router.post('/comments', async (req, res) => {
    const { lessonId, commentText, email } = req.body;
    if (!lessonId || !commentText || !email) {
        return res.status(400).json({ message: 'Не все данные для комментария предоставлены' });
    }
    try {
        const user = await getUserAndRole(email);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        const isTeacherComment = ['Teacher', 'Admin'].includes(user.role);

        const insertResult = await pool.query(
            `INSERT INTO LessonComments (LessonID, UserID, CommentText, IsTeacherComment, IsHomeworkSubmission)
             VALUES ($1, $2, $3, $4, FALSE) RETURNING CommentID, CreatedAt`,
            [lessonId, user.userid, commentText, isTeacherComment]
        );
        res.status(201).json({
            message: 'Комментарий добавлен',
            comment: {
                commentId: insertResult.rows[0].commentid,
                userId: user.userid,
                fullName: user.fullname,
                role: user.role,
                commentText: commentText,
                createdAt: insertResult.rows[0].createdat,
                isTeacherComment: isTeacherComment,
                isHomeworkSubmission: false,
                submissionFileName: null,
                submissionFilePath: null,
                avatarUrl: null
            }
        });
    } catch (error) {
        console.error('Ошибка добавления комментария:', error);
        res.status(500).json({ message: 'Ошибка сервера при добавлении комментария' });
    }
});

// POST Сдача домашнего задания
router.post('/homework', uploadHomework.single('homeworkFile'), async (req, res) => {
    console.log('--- Запрос на /api/lesson/homework ---');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    console.log('req.headers:', req.headers);

    const { lessonId, homeworkComment, email } = req.body;
    const file = req.file;

    if (!lessonId || !email) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ message: 'LessonId или email не предоставлены' });
    }
    if (!file) {
        return res.status(400).json({ message: 'Файл домашнего задания не загружен' });
    }

    try {
        const user = await getUserAndRole(email);
        if (!user) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const homeworkMetaResult = await pool.query('SELECT HomeworkID FROM Homeworks WHERE LessonID = $1', [lessonId]);
        if (homeworkMetaResult.rows.length === 0) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return res.status(404).json({ message: 'Домашнее задание для этого урока не найдено' });
        }
        const homeworkId = homeworkMetaResult.rows[0].homeworkid;

        const existingSubmission = await pool.query(
            'SELECT SubmissionID FROM HomeworkSubmissions WHERE HomeworkID = $1 AND UserID = $2',
            [homeworkId, user.userid]
        );
        if (existingSubmission.rows.length > 0) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return res.status(409).json({ message: 'Вы уже отправили задание к этому уроку' });
        }

        const relativeFilePathInUploads = path.join('homeworks', file.filename);
        const finalDbFilePath = path.join('uploads', relativeFilePathInUploads).replace(/\\/g, '/');

        const submissionResult = await pool.query(
            `INSERT INTO HomeworkSubmissions (HomeworkID, UserID, AnswerFilePath, SubmittedAt)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING SubmissionID`,
            [homeworkId, user.userid, finalDbFilePath]
        );

        const commentTextForHomework = homeworkComment || `Сдано домашнее задание: ${file.originalname}`;
        await pool.query(
            `INSERT INTO LessonComments (LessonID, UserID, CommentText, IsTeacherComment, IsHomeworkSubmission, SubmissionFilePath, SubmissionFileName)
             VALUES ($1, $2, $3, FALSE, TRUE, $4, $5)`,
            [lessonId, user.userid, commentTextForHomework, finalDbFilePath, file.originalname]
        );

        res.status(201).json({
            message: 'Домашнее задание успешно отправлено',
            submissionId: submissionResult.rows[0].submissionid,
            fileName: file.originalname
        });
    } catch (error) {
        console.error('Ошибка отправки домашнего задания:', error);
        if (file && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        res.status(500).json({ message: 'Ошибка сервера при отправке ДЗ', details: error.message });
    }
});

// PUT Редактирование урока (только Учитель/Админ)
router.put('/', uploadMaterials.array('newMaterials', 10), async (req, res) => {
    const { lessonId, title, videoUrl, email, deletedMaterialIdsJson } = req.body;
    const newMaterialFiles = req.files;

    if (!lessonId || !title || !email) {
        if (newMaterialFiles) newMaterialFiles.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
        return res.status(400).json({ message: 'Не все данные для редактирования урока предоставлены' });
    }

    try {
        const user = await getUserAndRole(email);
        if (!user || !['Teacher', 'Admin'].includes(user.role)) {
            if (newMaterialFiles) newMaterialFiles.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
            return res.status(403).json({ message: 'Доступ запрещён' });
        }

        await pool.query(
            'UPDATE Lessons SET Title = $1, Content = $2 WHERE LessonID = $3',
            [title, videoUrl || null, lessonId]
        );

        const deletedMaterialIds = deletedMaterialIdsJson ? JSON.parse(deletedMaterialIdsJson) : [];
        if (deletedMaterialIds.length > 0) {
            const materialsToDeleteResult = await pool.query(
                'SELECT FilePath FROM LessonMaterials WHERE MaterialID = ANY($1::int[])',
                [deletedMaterialIds]
            );
            for (const material of materialsToDeleteResult.rows) {
                const absoluteFilePath = path.join(projectRoot, material.filepath);
                if (fs.existsSync(absoluteFilePath)) {
                    fs.unlinkSync(absoluteFilePath);
                }
            }
            await pool.query('DELETE FROM LessonMaterials WHERE MaterialID = ANY($1::int[])', [deletedMaterialIds]);
        }

        if (newMaterialFiles && newMaterialFiles.length > 0) {
            for (const file of newMaterialFiles) {
                const relativeFilePathInUploads = path.join('materials', file.filename);
                const finalDbFilePath = path.join('uploads', relativeFilePathInUploads).replace(/\\/g, '/');
                await pool.query(
                    `INSERT INTO LessonMaterials (LessonID, FilePath, FileName, FileType, FileSize, UploadedBy)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [lessonId, finalDbFilePath, file.originalname, path.extname(file.originalname).slice(1), file.size, user.userid]
                );
            }
        }
        res.json({ message: 'Урок успешно обновлён' });
    } catch (error) {
        console.error('Ошибка редактирования урока:', error);
        if (newMaterialFiles) newMaterialFiles.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
        res.status(500).json({ message: 'Ошибка сервера при редактировании урока' });
    }
});

// DOWNLOAD Файл домашнего задания (защищенный)
router.get('/homeworks/download', async (req, res) => {
    const { filepath, email } = req.query;
    if (!filepath || !email) {
        return res.status(400).json({ message: 'Filepath или email не предоставлены' });
    }
    try {
        const user = await getUserAndRole(email);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        if (!['Teacher', 'Admin'].includes(user.role)) {
            const commentOwner = await pool.query(
                `SELECT UserID FROM LessonComments WHERE SubmissionFilePath = $1 AND UserID = $2`,
                [filepath, user.userid]
            );
            if (commentOwner.rows.length === 0) {
                return res.status(403).json({ message: 'Доступ к этому файлу запрещён' });
            }
        }

        const absoluteFilePath = path.join(projectRoot, filepath);
        if (fs.existsSync(absoluteFilePath)) {
            res.download(absoluteFilePath, path.basename(filepath));
        } else {
            console.error(`Файл ДЗ не найден: ${absoluteFilePath} (запрошен ${filepath})`);
            res.status(404).json({ message: 'Файл домашнего задания не найден на сервере' });
        }
    } catch (error) {
        console.error('Ошибка скачивания файла ДЗ:', error);
        res.status(500).json({ message: 'Ошибка сервера при скачивании файла ДЗ' });
    }
});

module.exports = router;
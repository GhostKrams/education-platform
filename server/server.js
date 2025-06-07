const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Настройка CORS
app.use(cors());

// Middleware для обработки JSON
app.use(express.json());

// Обслуживание статических файлов из frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


// Маршруты API
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const courseDetailRoutes = require('./routes/courseDetail');
const lessonRoutes = require('./routes/lesson');
app.use('/api/auth', authRoutes); // Префикс /api/auth для маршрутов авторизации
app.use('/api/courses', courseRoutes); // Префикс /api/courses для маршрутов курсов
console.log('courseDetailRoutes loaded:', courseDetailRoutes);
app.use('/api/course-detail', courseDetailRoutes);
app.use('/api/lesson', lessonRoutes);

// Обработка маршрута для корневой страницы (auth.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'auth.html'));
});

// Обработка маршрута для страницы my-courses.html
app.get('/my-courses.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'my-courses.html'));
});

// Обработка маршрута для страницы course-detail.html
app.get('/course-detail.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'course-detail.html'));
});

// Обработка маршрута для страницы lesson.html
app.get('/lesson.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'lesson.html'));
});

// Обработка несуществующих маршрутов (404)
app.use((req, res, next) => {
    res.status(404).json({ message: 'Маршрут не найден' });
});

// Обработка ошибок сервера
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).json({ message: 'Ошибка сервера', error: err.message });
});

// Запуск сервера
app.listen(3000, () => console.log('Server running on port 3000'));
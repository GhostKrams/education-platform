const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Обслуживание статических файлов из frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Маршруты API 
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

app.listen(3000, () => console.log('Server running on port 3000'));
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/database');

const authRoutes = require('./routes/auth');
const coursesRoutes = require('./routes/courses');
const tasksRoutes = require('./routes/tasks');
const studyPlanRoutes = require('./routes/studyPlans');

const auth = require('./middleware/auth');
const startReminderJob = require('./utils/reminderJob');

const app = express();
const aiRoutes = require('./routes/ai');

connectDB();
startReminderJob();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/study-plans', studyPlanRoutes);
app.use('/api/ai', aiRoutes);


app.get('/api/protected', auth, (req, res) => {
  res.json({
    message: 'Access granted',
    user: req.user
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'StudyFlow API is running!' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'StudyFlow API is healthy',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
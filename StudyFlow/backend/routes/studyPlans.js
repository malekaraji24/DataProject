const express = require('express');
const router = express.Router();

const Task = require('../models/Task');
const StudyPlan = require('../models/StudyPlan');
const auth = require('../middleware/auth');
const generateSchedule = require('../utils/scheduleAlgorithm');

// POST /api/study-plans/generate
router.post('/generate', auth, async (req, res) => {
  try {
    const { hoursPerDay } = req.body;

    if (!hoursPerDay || typeof hoursPerDay !== 'number' || hoursPerDay <= 0) {
      return res.status(400).json({
        message: 'Provide a valid hoursPerDay positive number.'
      });
    }

    if (hoursPerDay > 16) {
      return res.status(400).json({
        message: 'hoursPerDay cannot exceed 16.'
      });
    }

    const tasks = await Task.find({
      user: req.user._id,
      completed: false,
      deadline: { $gte: new Date() }
    }).populate('course', 'name difficulty');

    if (tasks.length === 0) {
      return res.status(200).json({
        message: 'No pending tasks found. You are all caught up!',
        schedule: []
      });
    }

    const schedule = generateSchedule(tasks, hoursPerDay);

    const plan = await StudyPlan.create({
      user: req.user._id,
      hoursPerDay,
      schedule
    });

    res.status(201).json({
      message: 'Study plan generated successfully.',
      hoursPerDay,
      totalDays: [...new Set(schedule.map((s) => s.date))].length,
      totalSessions: schedule.length,
      plan
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/study-plans/latest
router.get('/latest', auth, async (req, res) => {
  try {
    const plan = await StudyPlan.findOne({ user: req.user._id }).sort({
      generatedAt: -1
    });

    if (!plan) {
      return res.status(404).json({ message: 'No study plan found.' });
    }

    res.status(200).json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
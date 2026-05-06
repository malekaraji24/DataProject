const express = require('express');
const auth = require('../middleware/auth');
const Task = require('../models/Task');

const router = express.Router();

// 📅 Calendar route (ADD THIS FIRST before /:id routes)
router.get('/calendar', auth, async (req, res) => {
  try {
    const { date } = req.query;

    let filter = { user: req.user._id };

    if (date) {
      const parsed = new Date(date);

      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
      }

      const startOfDay = new Date(parsed);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(parsed);
      endOfDay.setUTCHours(23, 59, 59, 999);

      filter.deadline = { $gte: startOfDay, $lte: endOfDay };
    }

    const tasks = await Task.find(filter)
      .populate('course', 'name instructor difficulty')
      .sort({ deadline: 1 });

    res.status(200).json({
      count: tasks.length,
      tasks
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create task
router.post('/', auth, async (req, res) => {
  try {
    const { title, type, deadline, estimatedHours, course, startTime, endTime } = req.body;

    const task = await Task.create({
      title,
      type,
      deadline,
      estimatedHours,
      course,
      user: req.user._id,
      startTime,
      endTime
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all tasks
router.get('/', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user._id }).populate('course');
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, type, deadline, estimatedHours, course, completed, startTime, endTime } = req.body;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { title, type, deadline, estimatedHours, course, completed, startTime, endTime },
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const Course = require('../models/Course');
const Task = require('../models/Task');
const StudyPlan = require('../models/StudyPlan');
const ChatHistory = require('../models/ChatHistory');

const { getAISuggestion } = require('../services/aiService');

const MAX_HISTORY = 10;

router.post('/suggest', auth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: 'Provide a non-empty message.' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ message: 'Message too long. Keep it under 1000 characters.' });
    }

    const userId = req.user._id;

    const [courses, tasks, studyPlan, chatHistory] = await Promise.all([
      Course.find({ user: userId }),
      Task.find({ user: userId }).populate('course', 'name difficulty'),
      StudyPlan.findOne({ user: userId }).sort({ generatedAt: -1 }),
      ChatHistory.findOne({ user: userId })
    ]);

    const pastMessages = chatHistory ? chatHistory.messages.slice(-MAX_HISTORY) : [];

    const { reply, actions } = await getAISuggestion(
      message.trim(),
      courses,
      tasks,
      studyPlan,
      pastMessages
    );

    if (chatHistory) {
      chatHistory.messages.push({ role: 'user', content: message.trim() });
      chatHistory.messages.push({ role: 'assistant', content: reply });

      if (chatHistory.messages.length > 100) {
        chatHistory.messages = chatHistory.messages.slice(-100);
      }

      await chatHistory.save();
    } else {
      await ChatHistory.create({
        user: userId,
        messages: [
          { role: 'user', content: message.trim() },
          { role: 'assistant', content: reply }
        ]
      });
    }

    res.status(200).json({ reply, actions });
  } catch (err) {
    console.error('AI route error:', err.message);

    if (err.status === 401) {
      return res.status(500).json({ message: 'Invalid OpenAI API key.' });
    }

    if (err.status === 429) {
      return res.status(429).json({ message: 'OpenAI rate limit reached. Try again shortly.' });
    }

    res.status(500).json({ message: err.message });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const chatHistory = await ChatHistory.findOne({ user: req.user._id });
    const messages = chatHistory ? chatHistory.messages : [];

    res.status(200).json({ count: messages.length, messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/history', auth, async (req, res) => {
  try {
    await ChatHistory.findOneAndUpdate(
      { user: req.user._id },
      { messages: [] },
      { upsert: true }
    );

    res.status(200).json({ message: 'Chat history cleared.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
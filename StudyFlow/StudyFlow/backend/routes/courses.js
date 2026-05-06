const express = require('express');
const auth = require('../middleware/auth');
const Course = require('../models/Course');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { name, instructor, difficulty } = req.body;

    const course = await Course.create({
      name,
      instructor,
      difficulty,
      chapters: [],
      user: req.user._id
    });

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const courses = await Course.find({ user: req.user._id });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, instructor, difficulty } = req.body;

    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { name, instructor, difficulty },
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ message: 'Course deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add chapter to course
router.post('/:id/chapters', auth, async (req, res) => {
  try {
    const { title } = req.body;

    const course = await Course.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!course.chapters) {
      course.chapters = [];
    }

    course.chapters.push({ title });
    await course.save();

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle chapter complete/incomplete
router.patch('/:courseId/chapters/:chapterId', auth, async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.courseId,
      user: req.user._id
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!course.chapters) {
      course.chapters = [];
    }

    const chapter = course.chapters.id(req.params.chapterId);

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    chapter.completed = !chapter.completed;
    await course.save();

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete chapter
router.delete('/:courseId/chapters/:chapterId', auth, async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.courseId,
      user: req.user._id
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!course.chapters) {
      course.chapters = [];
    }

    course.chapters = course.chapters.filter(
      (chapter) => chapter._id.toString() !== req.params.chapterId
    );

    await course.save();

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
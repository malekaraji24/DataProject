const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  date:          { type: String, required: true }, // "YYYY-MM-DD"
  taskId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  taskTitle:     { type: String },
  courseName:    { type: String },
  hoursAssigned: { type: Number },
});

const studyPlanSchema = new mongoose.Schema({
  user:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hoursPerDay:      { type: Number, required: true },
  generatedAt:      { type: Date, default: Date.now },
  schedule:         [sessionSchema],
});

module.exports = mongoose.model('StudyPlan', studyPlanSchema);

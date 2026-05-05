const cron = require('node-cron');
const Task = require('../models/Task');

function startReminderJob() {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      const tasks = await Task.find({
        completed: false,
        reminded: false,
        $or: [
          { deadline: { $gte: now, $lte: oneHourLater } },
          { startTime: { $gte: now, $lte: oneHourLater } }
        ]
      }).populate('course', 'name');

      for (const task of tasks) {
        const triggerTime = task.startTime || task.deadline;
        const timeLabel = triggerTime
          ? triggerTime.toISOString().slice(11, 16)
          : 'N/A';

        const courseName = task.course?.name || 'Unknown Course';

        console.log(`🔔 Reminder: [${courseName}] ${task.title} at ${timeLabel}`);

        task.reminded = true;
        await task.save();
      }
    } catch (error) {
      console.error('Reminder job error:', error.message);
    }
  });

  console.log('✅ Reminder job started — checking every minute.');
}

module.exports = startReminderJob;
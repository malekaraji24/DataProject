/**
 * Generates a daily study schedule from a list of tasks.
 *
 * @param {Array}  tasks        - Incomplete tasks from DB (with course populated)
 * @param {Number} hoursPerDay  - How many hours the user can study each day
 * @returns {Array}             - Array of { date, taskId, taskTitle, courseName, hoursAssigned }
 */
function generateSchedule(tasks, hoursPerDay) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // ── Step 1: Score and sort tasks by priority ─────────────────────────────
  //
  // Priority score = urgency + difficulty weight
  //
  // Urgency: fewer days left → higher score (max 100)
  // Difficulty: hard=3pts, medium=2pts, easy=1pt
  // estimatedHours tiebreaker: more hours = slightly higher priority

  const difficultyWeight = { hard: 3, medium: 2, easy: 1 };

  const scoredTasks = tasks
    .map((task) => {
      const deadline = new Date(task.deadline);
      deadline.setUTCHours(0, 0, 0, 0);

      const daysLeft = Math.max(
        1,
        Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
      );

      const urgencyScore     = Math.round(100 / daysLeft);
      const difficultyScore  = difficultyWeight[task.course?.difficulty] || 1;
      const totalScore       = urgencyScore + difficultyScore * 5 + (task.estimatedHours || 1);

      return { task, daysLeft, totalScore };
    })
    .sort((a, b) => b.totalScore - a.totalScore); // highest priority first

  // ── Step 2: Build a pool of "work chunks" ────────────────────────────────
  //
  // Each task gets split into 1-hour chunks so we can fill days flexibly.
  // A task needing 3 hours becomes three 1-hour chunks.

  const chunks = [];
  for (const { task } of scoredTasks) {
    const hours = task.estimatedHours || 1;
    for (let i = 0; i < hours; i++) {
      chunks.push({
        taskId:     task._id,
        taskTitle:  task.title,
        courseName: task.course?.name || 'Unknown',
        deadline:   new Date(task.deadline),
      });
    }
  }

  // ── Step 3: Distribute chunks across days ────────────────────────────────
  //
  // Walk through days starting from today.
  // Fill each day up to hoursPerDay, respecting each task's deadline.
  // Never schedule a chunk after its task's deadline.

  const schedule = [];   // final sessions
  const dayMap   = {};   // { "YYYY-MM-DD": hoursUsed } — tracks day capacity

  for (const chunk of chunks) {
    let assigned = false;
    let dayCursor = new Date(today);

    // Try up to 60 days ahead (safety ceiling)
    for (let d = 0; d < 60; d++) {
      const dateKey = dayCursor.toISOString().slice(0, 10);

      // Don't schedule past the task's deadline
      if (dayCursor > chunk.deadline) break;

      // Initialize day slot if not seen yet
      if (!dayMap[dateKey]) dayMap[dateKey] = 0;

      // If this day still has capacity, assign the chunk here
      if (dayMap[dateKey] < hoursPerDay) {
        dayMap[dateKey] += 1;

        // Merge with an existing session for the same task+day (cleaner output)
        const existing = schedule.find(
          (s) => s.date === dateKey && String(s.taskId) === String(chunk.taskId)
        );

        if (existing) {
          existing.hoursAssigned += 1;
        } else {
          schedule.push({
            date:          dateKey,
            taskId:        chunk.taskId,
            taskTitle:     chunk.taskTitle,
            courseName:    chunk.courseName,
            hoursAssigned: 1,
          });
        }

        assigned = true;
        break;
      }

      // Day is full — move to the next day
      dayCursor.setUTCDate(dayCursor.getUTCDate() + 1);
    }

    if (!assigned) {
      console.warn(`⚠️  Could not schedule chunk for task: ${chunk.taskTitle}`);
    }
  }

  // Sort final output chronologically
  schedule.sort((a, b) => (a.date > b.date ? 1 : -1));

  return schedule;
}

module.exports = generateSchedule;

const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ── Context builder (unchanged from before) ──────────────────────────────────
function buildContext(courses, tasks, studyPlan) {
  const lines = [];

  if (courses.length > 0) {
    lines.push('=== ENROLLED COURSES ===');
    for (const course of courses) {
      lines.push(`- ${course.name} (Instructor: ${course.instructor}, Difficulty: ${course.difficulty})`);
      if (course.chapters && course.chapters.length > 0) {
        const completed  = course.chapters.filter((c) => c.completed).map((c) => c.title);
        const incomplete = course.chapters.filter((c) => !c.completed).map((c) => c.title);
        if (completed.length)  lines.push(`  Completed chapters: ${completed.join(', ')}`);
        if (incomplete.length) lines.push(`  Remaining chapters: ${incomplete.join(', ')}`);
      }
    }
  }

  const pending = tasks.filter((t) => !t.completed);
  if (pending.length > 0) {
    lines.push('\n=== PENDING TASKS ===');
    for (const task of pending) {
      const deadline   = task.deadline
        ? new Date(task.deadline).toISOString().slice(0, 10)
        : 'No deadline';
      const course = task.course?.name || 'Unknown course';
      lines.push(`- [${task.type}] "${task.title}" | Course: ${course} | Deadline: ${deadline} | Est. hours: ${task.estimatedHours || '?'}`);
    }
  }

  if (studyPlan?.schedule?.length > 0) {
    lines.push('\n=== CURRENT STUDY PLAN ===');
    lines.push(`Hours per day: ${studyPlan.hoursPerDay}`);
    const byDate = {};
    for (const session of studyPlan.schedule) {
      if (!byDate[session.date]) byDate[session.date] = [];
      byDate[session.date].push(`${session.taskTitle} (${session.hoursAssigned}h)`);
    }
    for (const [date, sessions] of Object.entries(byDate)) {
      lines.push(`  ${date}: ${sessions.join(' | ')}`);
    }
  }

  return lines.join('\n');
}

// ── Action parser ─────────────────────────────────────────────────────────────
//
// Scans the AI's reply text for known intent patterns and returns
// structured action objects the frontend can render as buttons.
//
// Supported actions:
//   complete_chapter  → "mark [X] as complete", "complete chapter [X]"
//   reschedule        → "reschedule", "regenerate", "adjust your plan"
//   create_task       → "create a task", "add a task", "new task"
//   complete_task     → "mark [X] task as done", "complete [X] task"

function parseActions(replyText) {
  const actions = [];
  const lower   = replyText.toLowerCase();

  // Reschedule / regenerate study plan
  if (
    lower.includes('reschedule') ||
    lower.includes('regenerate') ||
    lower.includes('adjust your plan') ||
    lower.includes('update your study plan')
  ) {
    actions.push({
      type:    'reschedule',
      label:   'Regenerate Study Plan',
      payload: {},
    });
  }

  // Mark a chapter complete — extract chapter name if mentioned
  const chapterMatch = lower.match(
    /(?:mark|complete|finish)\s+["""']?([^"""']+)["""']?\s+(?:chapter\s+)?as\s+(?:complete|done)/
  );
  if (chapterMatch) {
    actions.push({
      type:    'complete_chapter',
      label:   `Mark "${chapterMatch[1].trim()}" as Complete`,
      payload: { chapterTitle: chapterMatch[1].trim() },
    });
  }

  // Fallback: any mention of completing a chapter without a specific name
  if (
    !chapterMatch &&
    (lower.includes('mark the chapter') || lower.includes('complete the chapter'))
  ) {
    actions.push({
      type:    'complete_chapter',
      label:   'Mark Chapter as Complete',
      payload: {},
    });
  }

  // Create a new task
  if (
    lower.includes('create a task') ||
    lower.includes('add a task')    ||
    lower.includes('new task')
  ) {
    actions.push({
      type:    'create_task',
      label:   'Create a Task',
      payload: {},
    });
  }

  // Mark a task as done — extract task name if mentioned
  const taskDoneMatch = lower.match(
    /mark\s+["""']?([^"""']+)["""']?\s+(?:task\s+)?as\s+(?:done|complete|completed)/
  );
  if (taskDoneMatch) {
    actions.push({
      type:    'complete_task',
      label:   `Mark "${taskDoneMatch[1].trim()}" as Done`,
      payload: { taskTitle: taskDoneMatch[1].trim() },
    });
  }

  return actions;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * @param {String} userMessage    - The student's question
 * @param {Array}  courses        - User's courses (with chapters)
 * @param {Array}  tasks          - User's tasks (with course populated)
 * @param {Object} studyPlan      - Latest study plan (nullable)
 * @param {Array}  historyMessages - Last N turns [ { role, content }, ... ]
 * @returns {{ reply: String, actions: Array }}
 */
async function getAISuggestion(userMessage, courses, tasks, studyPlan, historyMessages = []) {
  const context = buildContext(courses, tasks, studyPlan);

  const systemPrompt = `
You are StudyFlow AI, a smart academic assistant built into a student productivity app.
You have full access to the student's enrolled courses, chapters, pending tasks, deadlines, and study plan.
Your job is to:
- Answer study-related questions clearly and concisely
- Give personalized advice based on the student's actual data
- Help break topics or chapters into manageable study tasks
- Suggest study strategies, revision techniques, and prioritization
- Offer motivation and productivity tips when needed
- Help adjust plans if the student missed a study day

Always be encouraging, practical, and specific to the student's situation.
When relevant, suggest concrete actions the student can take inside the app
(e.g. "mark this chapter as complete", "reschedule your plan", "create a task for X").
If the student asks something unrelated to studying or academics, politely redirect them.

Here is the student's current data:
${context || 'No data available yet.'}
  `.trim();

  // ── Placeholder (no API key) ──────────────────────────────────────────────
  if (!openai) {
    const reply = `[AI Placeholder] You asked: "${userMessage}"\n\nContext loaded:\n${context || 'None'}\n\nConnect your OpenAI API key in .env to get real responses.`;
    return { reply, actions: [] };
  }

  // ── Build message array: system + history + new user message ─────────────
  const messages = [
    { role: 'system', content: systemPrompt },
    ...historyMessages,                          // last N turns for memory
    { role: 'user',   content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    max_tokens:  800,
    temperature: 0.7,
    messages,
  });

  const reply   = completion.choices[0].message.content.trim();
  const actions = parseActions(reply);

  return { reply, actions };
}

module.exports = { getAISuggestion };

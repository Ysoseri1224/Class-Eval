const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

// 学生获取自己在某课堂的答题记录
router.get('/my/:session_id', authMiddleware, requireRole('student'), (req, res) => {
  const sub = db.prepare(
    'SELECT * FROM submissions WHERE session_id = ? AND student_id = ?'
  ).get(req.params.session_id, req.user.id);
  res.json(sub || null);
});

// 学生提交/更新答案
router.post('/:session_id', authMiddleware, requireRole('student'), (req, res) => {
  const { answers } = req.body;
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.session_id);
  if (!session) return res.status(404).json({ error: '课堂不存在' });
  if (!session.exam_open) return res.status(403).json({ error: '答题未开放' });

  const existing = db.prepare(
    'SELECT * FROM submissions WHERE session_id = ? AND student_id = ?'
  ).get(req.params.session_id, req.user.id);

  if (existing && existing.status === 'submitted') {
    return res.status(400).json({ error: '已提交，不能修改' });
  }

  if (existing) {
    db.prepare(
      'UPDATE submissions SET answers = ? WHERE session_id = ? AND student_id = ?'
    ).run(JSON.stringify(answers), req.params.session_id, req.user.id);
  } else {
    db.prepare(
      "INSERT INTO submissions (session_id, student_id, answers, status) VALUES (?, ?, ?, 'in_progress')"
    ).run(req.params.session_id, req.user.id, JSON.stringify(answers));
  }
  res.json({ success: true });
});

// 学生最终提交（计算得分）
router.post('/:session_id/submit', authMiddleware, requireRole('student'), (req, res) => {
  const { answers } = req.body;
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.session_id);
  if (!session) return res.status(404).json({ error: '课堂不存在' });

  // 获取题目
  const questions = db.prepare(
    'SELECT * FROM questions WHERE set_id = ? ORDER BY sort_order, question_no'
  ).all(session.question_set_id);

  // 计算得分
  let totalScore = 0;
  const scorePerQuestion = questions.length > 0 ? 100 / questions.length : 0;
  const questionResults = {};

  for (const q of questions) {
    const correctAnswer = JSON.parse(q.answer);
    const studentAnswer = answers ? answers[q.id] : undefined;
    let correct = false;

    if (q.type === 'choice' || q.type === 'judge') {
      correct = String(studentAnswer) === String(correctAnswer);
    } else if (q.type === 'fill') {
      correct = String(studentAnswer || '').trim() === String(correctAnswer).trim();
    } else if (q.type === 'match') {
      // 连线题：所有配对都正确才得分
      if (studentAnswer && typeof studentAnswer === 'object' && typeof correctAnswer === 'object') {
        const keys = Object.keys(correctAnswer);
        correct = keys.length > 0 && keys.every(k => studentAnswer[k] === correctAnswer[k]);
      }
    }

    if (correct) totalScore += scorePerQuestion;
    questionResults[q.id] = { correct, correctAnswer };
  }

  const existing = db.prepare(
    'SELECT * FROM submissions WHERE session_id = ? AND student_id = ?'
  ).get(req.params.session_id, req.user.id);

  if (existing) {
    if (existing.status === 'submitted') {
      return res.status(400).json({ error: '已提交，不能再次提交' });
    }
    db.prepare(`
      UPDATE submissions SET answers = ?, score = ?, status = 'submitted', submitted_at = CURRENT_TIMESTAMP
      WHERE session_id = ? AND student_id = ?
    `).run(JSON.stringify(answers), Math.round(totalScore), req.params.session_id, req.user.id);
  } else {
    db.prepare(`
      INSERT INTO submissions (session_id, student_id, answers, score, status, submitted_at)
      VALUES (?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP)
    `).run(req.params.session_id, req.user.id, JSON.stringify(answers), Math.round(totalScore));
  }

  res.json({ score: Math.round(totalScore), questionResults });
});

// 学生通过 assignment_id 获取被评人的答题内容（互评用）
router.get('/by-assignment/:assignment_id', authMiddleware, requireRole('student'), (req, res) => {
  const db2 = require('../database');
  const assignment = db2.prepare('SELECT * FROM peer_eval_assignments WHERE id = ?').get(req.params.assignment_id);
  if (!assignment) return res.status(404).json({ error: '互评任务不存在' });
  if (assignment.reviewer_id !== req.user.id) return res.status(403).json({ error: '无权查看' });

  const sub = db2.prepare(
    'SELECT * FROM submissions WHERE session_id = ? AND student_id = ?'
  ).get(assignment.session_id, assignment.reviewee_id);

  if (!sub) return res.json({ answers: {} });
  res.json({ ...sub, answers: JSON.parse(sub.answers || '{}') });
});

// 管理员/教师查看某课堂所有学生答题情况
router.get('/session/:session_id', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const subs = db.prepare(`
    SELECT s.*, u.username
    FROM submissions s JOIN users u ON s.student_id = u.id
    WHERE s.session_id = ?
    ORDER BY u.username
  `).all(req.params.session_id);

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.session_id);
  if (!session) return res.status(404).json({ error: '课堂不存在' });

  const questions = db.prepare(
    'SELECT * FROM questions WHERE set_id = ? ORDER BY sort_order'
  ).all(session.question_set_id);

  // 统计每题得分人数和优秀率
  const scorePerQuestion = questions.length > 0 ? 100 / questions.length : 0;
  const questionStats = questions.map(q => {
    const correctAnswer = JSON.parse(q.answer);
    let correctCount = 0;
    for (const sub of subs) {
      if (sub.status !== 'submitted') continue;
      const answers = JSON.parse(sub.answers || '{}');
      const studentAnswer = answers[q.id];
      let correct = false;
      if (q.type === 'choice' || q.type === 'judge') {
        correct = String(studentAnswer) === String(correctAnswer);
      } else if (q.type === 'fill') {
        correct = String(studentAnswer || '').trim() === String(correctAnswer).trim();
      } else if (q.type === 'match') {
        if (studentAnswer && typeof studentAnswer === 'object' && typeof correctAnswer === 'object') {
          const keys = Object.keys(correctAnswer);
          correct = keys.length > 0 && keys.every(k => studentAnswer[k] === correctAnswer[k]);
        }
      }
      if (correct) correctCount++;
    }
    const submittedCount = subs.filter(s => s.status === 'submitted').length;
    return {
      question_id: q.id,
      question_no: q.question_no,
      type: q.type,
      correct_count: correctCount,
      total_submitted: submittedCount,
      excellent_rate: submittedCount > 0 ? ((correctCount / submittedCount) * 100).toFixed(1) : '0.0'
    };
  });

  res.json({
    submissions: subs.map(s => ({ ...s, answers: JSON.parse(s.answers || '{}') })),
    question_stats: questionStats
  });
});

// 根据互评分配ID获取被评学生的答题记录（学生端互评用）
router.get('/by-assignment/:assignment_id', authMiddleware, requireRole('student'), (req, res) => {
  const assignment = db.prepare('SELECT * FROM peer_eval_assignments WHERE id = ?').get(req.params.assignment_id);
  if (!assignment) return res.status(404).json({ error: '互评任务不存在' });
  if (assignment.reviewer_id !== req.user.id) return res.status(403).json({ error: '无权查看' });

  const sub = db.prepare('SELECT * FROM submissions WHERE session_id = ? AND student_id = ?')
    .get(assignment.session_id, assignment.reviewee_id);
  if (!sub) return res.json({ answers: {} });
  res.json({ ...sub, answers: JSON.parse(sub.answers || '{}') });
});

module.exports = router;

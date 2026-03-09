const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

// ========== 自评维度配置 ==========

// 获取某课堂的自评维度
router.get('/sessions/:session_id/dimensions', authMiddleware, (req, res) => {
  const dims = db.prepare(
    'SELECT * FROM self_eval_dimensions WHERE session_id = ? ORDER BY sort_order'
  ).all(req.params.session_id);
  res.json(dims);
});

// 保存自评维度（管理员/教师）
router.post('/sessions/:session_id/dimensions', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const { dimensions } = req.body; // [{dimension_name, level_20, level_40, level_60, level_80, level_100}]
  const session_id = req.params.session_id;
  const save = db.transaction(() => {
    db.prepare('DELETE FROM self_eval_dimensions WHERE session_id = ?').run(session_id);
    for (let i = 0; i < (dimensions || []).length; i++) {
      const d = dimensions[i];
      db.prepare(`
        INSERT INTO self_eval_dimensions
          (session_id, dimension_name, level_20, level_40, level_60, level_80, level_100, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        session_id,
        d.dimension_name,
        d.level_20 || '初步了解',
        d.level_40 || '基本掌握',
        d.level_60 || '较好掌握',
        d.level_80 || '熟练掌握',
        d.level_100 || '完全掌握',
        i
      );
    }
  });
  save();
  res.json({ success: true });
});

// ========== 学生自评提交 ==========

// 获取学生自己的自评记录
router.get('/sessions/:session_id/self-eval/my', authMiddleware, requireRole('student'), (req, res) => {
  const evals = db.prepare(`
    SELECT se.*, d.dimension_name
    FROM self_evaluations se JOIN self_eval_dimensions d ON se.dimension_id = d.id
    WHERE se.session_id = ? AND se.student_id = ?
  `).all(req.params.session_id, req.user.id);
  res.json(evals);
});

// 提交/更新学生自评
router.post('/sessions/:session_id/self-eval', authMiddleware, requireRole('student'), (req, res) => {
  const { evaluations } = req.body; // [{dimension_id, score}]
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.session_id);
  if (!session) return res.status(404).json({ error: '课堂不存在' });
  if (!session.self_eval_open) return res.status(403).json({ error: '自评未开放' });

  const save = db.transaction(() => {
    for (const e of (evaluations || [])) {
      db.prepare(`
        INSERT INTO self_evaluations (session_id, student_id, dimension_id, score)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(session_id, student_id, dimension_id) DO UPDATE SET score = excluded.score
      `).run(req.params.session_id, req.user.id, e.dimension_id, e.score);
    }
  });
  save();
  res.json({ success: true });
});

// 管理员/教师查看某课堂所有学生自评
router.get('/sessions/:session_id/self-eval', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const evals = db.prepare(`
    SELECT se.student_id, u.username, se.dimension_id, d.dimension_name, se.score
    FROM self_evaluations se
    JOIN users u ON se.student_id = u.id
    JOIN self_eval_dimensions d ON se.dimension_id = d.id
    WHERE se.session_id = ?
    ORDER BY u.username, d.sort_order
  `).all(req.params.session_id);
  res.json(evals);
});

// ========== 互评 ==========

// 随机分配互评（管理员/教师）
router.post('/sessions/:session_id/peer-eval/assign', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const session_id = req.params.session_id;
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id);
  if (!session) return res.status(404).json({ error: '课堂不存在' });

  // 获取已提交答题的学生
  const submitted = db.prepare(`
    SELECT student_id FROM submissions WHERE session_id = ? AND status = 'submitted'
  `).all(session_id).map(s => s.student_id);

  if (submitted.length < 2) {
    return res.status(400).json({ error: '提交人数不足2人，无法分配互评' });
  }

  // Fisher-Yates 洗牌
  const shuffled = [...submitted];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 分配逻辑：A评B，B评C，...，Z评A（循环）
  // 若为单数：最后一份由倒数第一和倒数第二同时评（倒数第二多一份任务）
  const assign = db.transaction(() => {
    db.prepare('DELETE FROM peer_eval_assignments WHERE session_id = ?').run(session_id);
    for (let i = 0; i < shuffled.length; i++) {
      const reviewer = shuffled[i];
      const reviewee = shuffled[(i + 1) % shuffled.length];
      db.prepare(`
        INSERT INTO peer_eval_assignments (session_id, reviewer_id, reviewee_id)
        VALUES (?, ?, ?)
      `).run(session_id, reviewer, reviewee);
    }
    // 若为单数，最后一人的答卷也分配给倒数第二人
    if (shuffled.length % 2 !== 0) {
      const lastReviewee = shuffled[shuffled.length - 1];
      const secondLastReviewer = shuffled[shuffled.length - 2];
      db.prepare(`
        INSERT OR IGNORE INTO peer_eval_assignments (session_id, reviewer_id, reviewee_id)
        VALUES (?, ?, ?)
      `).run(session_id, secondLastReviewer, lastReviewee);
    }
  });
  assign();

  // 开启互评
  db.prepare('UPDATE sessions SET peer_eval_open = 1 WHERE id = ?').run(session_id);
  res.json({ success: true, assigned_count: submitted.length });
});

// 获取学生自己的互评任务（需要评哪个人的卷子）
router.get('/sessions/:session_id/peer-eval/my-task', authMiddleware, requireRole('student'), (req, res) => {
  const tasks = db.prepare(`
    SELECT pea.*, u.username as reviewee_name, s.answers, s.score
    FROM peer_eval_assignments pea
    JOIN users u ON pea.reviewee_id = u.id
    LEFT JOIN submissions s ON s.session_id = pea.session_id AND s.student_id = pea.reviewee_id
    WHERE pea.session_id = ? AND pea.reviewer_id = ?
  `).all(req.params.session_id, req.user.id);

  res.json(tasks.map(t => ({
    ...t,
    answers: t.answers ? JSON.parse(t.answers) : {}
  })));
});

// 获取学生自己的互评任务列表（带已打分状态）- 别名路由
router.get('/sessions/:session_id/peer-eval/my-tasks', authMiddleware, requireRole('student'), (req, res) => {
  const tasks = db.prepare(`
    SELECT pea.id as assignment_id, pea.reviewee_id, pea.score, pea.comment, pea.status,
           u.username as reviewee_name
    FROM peer_eval_assignments pea
    JOIN users u ON pea.reviewee_id = u.id
    WHERE pea.session_id = ? AND pea.reviewer_id = ?
  `).all(req.params.session_id, req.user.id);
  res.json(tasks);
});

// 按 assignment_id 提交互评打分
router.post('/peer-eval/:assignment_id/score', authMiddleware, requireRole('student'), (req, res) => {
  const { score, comment } = req.body;
  if (score === undefined || score < 0 || score > 100) {
    return res.status(400).json({ error: '分数须在0-100之间' });
  }
  const assignment = db.prepare('SELECT * FROM peer_eval_assignments WHERE id = ?').get(req.params.assignment_id);
  if (!assignment) return res.status(404).json({ error: '互评任务不存在' });
  if (assignment.reviewer_id !== req.user.id) return res.status(403).json({ error: '无权操作' });
  if (assignment.status === 'submitted') return res.status(400).json({ error: '已提交互评' });

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(assignment.session_id);
  if (!session || !session.peer_eval_open) return res.status(403).json({ error: '互评未开放' });

  db.prepare(`
    UPDATE peer_eval_assignments
    SET score = ?, comment = ?, status = 'submitted', submitted_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(score, comment || null, req.params.assignment_id);

  res.json({ success: true });
});

// 学生提交互评打分
router.post('/sessions/:session_id/peer-eval/score', authMiddleware, requireRole('student'), (req, res) => {
  const { reviewee_id, score } = req.body;
  if (score === undefined || score < 0 || score > 100) {
    return res.status(400).json({ error: '分数须在0-100之间' });
  }
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.session_id);
  if (!session || !session.peer_eval_open) {
    return res.status(403).json({ error: '互评未开放' });
  }
  const assignment = db.prepare(`
    SELECT * FROM peer_eval_assignments
    WHERE session_id = ? AND reviewer_id = ? AND reviewee_id = ?
  `).get(req.params.session_id, req.user.id, reviewee_id);

  if (!assignment) return res.status(404).json({ error: '未找到互评任务' });
  if (assignment.status === 'submitted') return res.status(400).json({ error: '已提交互评' });

  db.prepare(`
    UPDATE peer_eval_assignments SET score = ?, status = 'submitted', submitted_at = CURRENT_TIMESTAMP
    WHERE session_id = ? AND reviewer_id = ? AND reviewee_id = ?
  `).run(score, req.params.session_id, req.user.id, reviewee_id);

  res.json({ success: true });
});

// 获取学生自己被评的分数及等级
router.get('/sessions/:session_id/peer-eval/my-result', authMiddleware, requireRole('student'), (req, res) => {
  const session_id = req.params.session_id;
  const student_id = req.user.id;

  // 获取所有评给我的记录（已提交），包含评语
  const records = db.prepare(`
    SELECT score, comment FROM peer_eval_assignments
    WHERE session_id = ? AND reviewee_id = ? AND status = 'submitted'
  `).all(session_id, student_id);

  if (records.length === 0) return res.json({ grade: null, avg_score: null, records: [], message: '暂无互评结果' });

  const avgPeerScore = records.reduce((sum, s) => sum + s.score, 0) / records.length;

  // 获取答题得分
  const sub = db.prepare(
    'SELECT score FROM submissions WHERE session_id = ? AND student_id = ?'
  ).get(session_id, student_id);
  const examScore = sub ? sub.score : 0;

  // 互评等级计算：（答题得分 + 互评平均分）/ 200
  const totalRatio = (examScore + avgPeerScore) / 200;
  let grade = 'C';
  if (totalRatio >= 0.85) grade = 'A';
  else if (totalRatio >= 0.75) grade = 'B';

  res.json({ grade, exam_score: examScore, avg_score: avgPeerScore, records, ratio: totalRatio });
});

// 获取学生自评+互评综合等级
router.get('/sessions/:session_id/grade/my', authMiddleware, requireRole('student'), (req, res) => {
  const session_id = req.params.session_id;
  const student_id = req.user.id;

  // 答题得分
  const sub = db.prepare(
    'SELECT score FROM submissions WHERE session_id = ? AND student_id = ?'
  ).get(session_id, student_id);
  const examScore = sub ? sub.score : 0;

  // 自评各维度
  const dims = db.prepare('SELECT * FROM self_eval_dimensions WHERE session_id = ?').all(session_id);
  const selfEvals = db.prepare(
    'SELECT * FROM self_evaluations WHERE session_id = ? AND student_id = ?'
  ).all(session_id, student_id);

  // 自评得分（各维度平均）
  let selfScore = 0;
  if (dims.length > 0 && selfEvals.length > 0) {
    const selfSum = selfEvals.reduce((s, e) => s + e.score, 0);
    selfScore = selfSum / dims.length;
  }

  // 满分 = 100（答题） + 100 * dims.length（自评）
  const maxScore = 100 + 100 * dims.length;
  const actualScore = examScore + selfEvals.reduce((s, e) => s + e.score, 0);
  const ratio = maxScore > 0 ? actualScore / maxScore : 0;

  let grade = 'C';
  if (ratio >= 0.85) grade = 'A';
  else if (ratio >= 0.75) grade = 'B';

  res.json({
    grade,
    exam_score: examScore,
    self_score: selfScore,
    dims_count: dims.length,
    ratio: Math.round(ratio * 100)
  });
});

// 管理员/教师查看所有学生互评情况
router.get('/sessions/:session_id/peer-eval', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const peerEvals = db.prepare(`
    SELECT pea.*, ur.username as reviewer_name, ue.username as reviewee_name
    FROM peer_eval_assignments pea
    JOIN users ur ON pea.reviewer_id = ur.id
    JOIN users ue ON pea.reviewee_id = ue.id
    WHERE pea.session_id = ?
    ORDER BY ue.username
  `).all(req.params.session_id);
  res.json(peerEvals);
});

// 管理员/教师查看所有学生等级汇总
router.get('/sessions/:session_id/grades', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const session_id = req.params.session_id;
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id);
  if (!session) return res.status(404).json({ error: '课堂不存在' });

  const students = db.prepare(
    "SELECT id, username FROM users WHERE role = 'student' AND class_id = ?"
  ).all(session.class_id);

  const dims = db.prepare('SELECT * FROM self_eval_dimensions WHERE session_id = ?').all(session_id);

  const result = students.map(student => {
    const sub = db.prepare(
      'SELECT score, status FROM submissions WHERE session_id = ? AND student_id = ?'
    ).get(session_id, student.id);
    const examScore = sub ? sub.score : null;

    const selfEvals = db.prepare(
      'SELECT * FROM self_evaluations WHERE session_id = ? AND student_id = ?'
    ).all(session_id, student.id);

    const peerScores = db.prepare(`
      SELECT score FROM peer_eval_assignments
      WHERE session_id = ? AND reviewee_id = ? AND status = 'submitted'
    `).all(session_id, student.id);
    const peerScore = peerScores.length > 0
      ? peerScores.reduce((s, p) => s + p.score, 0) / peerScores.length
      : null;

    // 自评等级
    let selfGrade = null;
    if (dims.length > 0 && selfEvals.length === dims.length) {
      const maxScore = 100 + 100 * dims.length;
      const actualScore = (examScore || 0) + selfEvals.reduce((s, e) => s + e.score, 0);
      const ratio = actualScore / maxScore;
      selfGrade = ratio >= 0.85 ? 'A' : ratio >= 0.75 ? 'B' : 'C';
    }

    // 互评等级
    let peerGrade = null;
    if (peerScore !== null && examScore !== null) {
      const ratio = (examScore + peerScore) / 200;
      peerGrade = ratio >= 0.85 ? 'A' : ratio >= 0.75 ? 'B' : 'C';
    }

    return {
      student_id: student.id,
      username: student.username,
      exam_score: examScore,
      submitted: sub ? sub.status === 'submitted' : false,
      self_grade: selfGrade,
      peer_score: peerScore,
      peer_grade: peerGrade
    };
  });

  res.json(result);
});

module.exports = router;

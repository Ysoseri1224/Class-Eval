const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

// 获取课堂列表（管理员/教师）
router.get('/', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const { class_id } = req.query;
  let sessions;
  if (class_id) {
    sessions = db.prepare(`
      SELECT s.*, c.name as class_name, qs.title as question_set_title, u.username as created_by_name
      FROM sessions s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN question_sets qs ON s.question_set_id = qs.id
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.class_id = ?
      ORDER BY s.created_at DESC
    `).all(class_id);
  } else {
    sessions = db.prepare(`
      SELECT s.*, c.name as class_name, qs.title as question_set_title, u.username as created_by_name
      FROM sessions s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN question_sets qs ON s.question_set_id = qs.id
      LEFT JOIN users u ON s.created_by = u.id
      ORDER BY s.created_at DESC
    `).all();
  }
  res.json(sessions);
});

// 获取学生可见的当前课堂（学生端）
router.get('/active', authMiddleware, requireRole('student'), (req, res) => {
  const { class_id } = req.user;
  if (!class_id) return res.json([]);
  const sessions = db.prepare(`
    SELECT s.*, qs.title as question_set_title
    FROM sessions s
    LEFT JOIN question_sets qs ON s.question_set_id = qs.id
    WHERE s.class_id = ? AND s.status IN ('open', 'closed')
    ORDER BY s.created_at DESC
  `).all(class_id);
  res.json(sessions);
});

// 获取单个课堂详情
router.get('/:id', authMiddleware, (req, res) => {
  const session = db.prepare(`
    SELECT s.*, c.name as class_name, qs.title as question_set_title
    FROM sessions s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN question_sets qs ON s.question_set_id = qs.id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!session) return res.status(404).json({ error: '课堂不存在' });
  res.json(session);
});

// 创建课堂（管理员/教师）
router.post('/', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const { title, class_id, question_set_id, duration_minutes } = req.body;
  if (!class_id || !question_set_id) {
    return res.status(400).json({ error: '班级和题集不能为空' });
  }
  const result = db.prepare(`
    INSERT INTO sessions (title, class_id, question_set_id, duration_minutes, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(title || null, class_id, question_set_id, duration_minutes || null, req.user.id);
  res.json({ id: result.lastInsertRowid });
});

// 更新课堂（管理员/教师）
router.put('/:id', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const { title, status, exam_open, self_eval_open, peer_eval_open, duration_minutes, start_time, end_time, question_set_id } = req.body;
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: '课堂不存在' });

  // 若开启答题，记录开始时间
  let actualStartTime = session.start_time;
  if (exam_open === 1 && !session.start_time) {
    actualStartTime = new Date().toISOString();
  }

  db.prepare(`
    UPDATE sessions SET
      title = ?, status = ?, exam_open = ?, self_eval_open = ?,
      peer_eval_open = ?, duration_minutes = ?, start_time = ?, end_time = ?,
      question_set_id = ?
    WHERE id = ?
  `).run(
    title ?? session.title,
    status ?? session.status,
    exam_open !== undefined ? exam_open : session.exam_open,
    self_eval_open !== undefined ? self_eval_open : session.self_eval_open,
    peer_eval_open !== undefined ? peer_eval_open : session.peer_eval_open,
    duration_minutes ?? session.duration_minutes,
    actualStartTime,
    end_time ?? session.end_time,
    question_set_id ?? session.question_set_id,
    req.params.id
  );
  res.json({ success: true });
});

// 删除课堂（管理员）
router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const del = db.transaction(() => {
    db.prepare('DELETE FROM peer_eval_assignments WHERE session_id = ?').run(req.params.id);
    db.prepare('DELETE FROM self_evaluations WHERE session_id = ?').run(req.params.id);
    db.prepare('DELETE FROM self_eval_dimensions WHERE session_id = ?').run(req.params.id);
    db.prepare('DELETE FROM submissions WHERE session_id = ?').run(req.params.id);
    db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
  });
  del();
  res.json({ success: true });
});

module.exports = router;

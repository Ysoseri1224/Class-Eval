const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

// 获取所有题集列表
router.get('/sets', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const sets = db.prepare(`
    SELECT qs.*, u.username as created_by_name,
      COUNT(q.id) as question_count
    FROM question_sets qs
    LEFT JOIN users u ON qs.created_by = u.id
    LEFT JOIN questions q ON q.set_id = qs.id
    GROUP BY qs.id
    ORDER BY qs.created_at DESC
  `).all();
  res.json(sets);
});

// 获取单个题集及其题目
router.get('/sets/:id', authMiddleware, (req, res) => {
  const set = db.prepare('SELECT * FROM question_sets WHERE id = ?').get(req.params.id);
  if (!set) return res.status(404).json({ error: '题集不存在' });
  const questions = db.prepare('SELECT * FROM questions WHERE set_id = ? ORDER BY sort_order, question_no').all(req.params.id);
  const parsed = questions.map(q => ({
    ...q,
    options: q.options ? JSON.parse(q.options) : null,
    answer: JSON.parse(q.answer)
  }));
  res.json({ ...set, questions: parsed });
});

// 创建题集（管理员/教师）
router.post('/sets', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const { title, is_single } = req.body;
  const result = db.prepare(
    'INSERT INTO question_sets (title, is_single, created_by) VALUES (?, ?, ?)'
  ).run(title || null, is_single ? 1 : 0, req.user.id);
  res.json({ id: result.lastInsertRowid, title, is_single });
});

// 更新题集标题
router.put('/sets/:id', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const { title } = req.body;
  db.prepare('UPDATE question_sets SET title = ? WHERE id = ?').run(title, req.params.id);
  res.json({ success: true });
});

// 删除题集
router.delete('/sets/:id', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const used = db.prepare('SELECT id FROM sessions WHERE question_set_id = ?').get(req.params.id);
  if (used) return res.status(400).json({ error: '该题集已被课堂使用，请先删除相关课堂再删除题集' });
  const del = db.transaction(() => {
    db.prepare('DELETE FROM questions WHERE set_id = ?').run(req.params.id);
    db.prepare('DELETE FROM question_sets WHERE id = ?').run(req.params.id);
  });
  del();
  res.json({ success: true });
});

// 创建题目
router.post('/sets/:set_id/questions', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const { question_no, type, content, options, answer, score, sort_order } = req.body;
  if (!type || !content || answer === undefined) {
    return res.status(400).json({ error: '题目类型、内容和答案不能为空' });
  }
  const set = db.prepare('SELECT id FROM question_sets WHERE id = ?').get(req.params.set_id);
  if (!set) return res.status(404).json({ error: '题集不存在' });

  // 自动计算sort_order（取当前最大值+1）
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM questions WHERE set_id = ?').get(req.params.set_id);
  const nextOrder = sort_order !== undefined ? sort_order : ((maxOrder.m || 0) + 1);

  const result = db.prepare(`
    INSERT INTO questions (set_id, question_no, type, content, options, answer, score, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.set_id,
    question_no || String(nextOrder),
    type,
    content,
    options ? JSON.stringify(options) : null,
    JSON.stringify(answer),
    score || 0,
    nextOrder
  );
  res.json({ id: result.lastInsertRowid });
});

// 更新题目
router.put('/questions/:id', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const { question_no, type, content, options, answer, score, sort_order } = req.body;
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!q) return res.status(404).json({ error: '题目不存在' });

  db.prepare(`
    UPDATE questions SET
      question_no = ?, type = ?, content = ?, options = ?,
      answer = ?, score = ?, sort_order = ?
    WHERE id = ?
  `).run(
    question_no ?? q.question_no,
    type ?? q.type,
    content ?? q.content,
    options !== undefined ? JSON.stringify(options) : q.options,
    answer !== undefined ? JSON.stringify(answer) : q.answer,
    score ?? q.score,
    sort_order ?? q.sort_order,
    req.params.id
  );
  res.json({ success: true });
});

// 删除题目
router.delete('/questions/:id', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// 批量更新题目排序
router.post('/sets/:set_id/reorder', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const { orders } = req.body; // [{id, sort_order}]
  const update = db.transaction(() => {
    for (const o of orders) {
      db.prepare('UPDATE questions SET sort_order = ? WHERE id = ?').run(o.sort_order, o.id);
    }
  });
  update();
  res.json({ success: true });
});

module.exports = router;

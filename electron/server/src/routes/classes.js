const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

// 获取所有班级（公开，用于注册/登录下拉）
router.get('/', (req, res) => {
  const classes = db.prepare('SELECT id, name FROM classes ORDER BY id').all();
  res.json(classes);
});

// 创建班级（管理员）
router.post('/', authMiddleware, requireRole('admin'), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '班级名称不能为空' });
  const exists = db.prepare('SELECT id FROM classes WHERE name = ?').get(name);
  if (exists) return res.status(400).json({ error: '班级名称已存在' });
  const result = db.prepare('INSERT INTO classes (name) VALUES (?)').run(name);
  res.json({ id: result.lastInsertRowid, name });
});

// 修改班级名称（管理员）
router.put('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '班级名称不能为空' });
  const cls = db.prepare('SELECT id FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: '班级不存在' });
  db.prepare('UPDATE classes SET name = ? WHERE id = ?').run(name, req.params.id);
  res.json({ success: true });
});

// 删除班级（管理员）
router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// 获取班级内学生列表
router.get('/:id/students', authMiddleware, (req, res) => {
  const students = db.prepare(
    "SELECT id, username FROM users WHERE class_id = ? AND role = 'student' ORDER BY id"
  ).all(req.params.id);
  res.json(students);
});

module.exports = router;

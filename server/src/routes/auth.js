const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');

// 登录
router.post('/login', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: '用户名不存在' });

  if (role && user.role !== role) {
    return res.status(401).json({ error: '用户类型不匹配' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: '密码错误' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, class_id: user.class_id },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, class_id: user.class_id }
  });
});

// 学生注册
router.post('/register', (req, res) => {
  const { username, password, class_id } = req.body;
  if (!username || !class_id) {
    return res.status(400).json({ error: '用户名和班级不能为空' });
  }

  const cls = db.prepare('SELECT id FROM classes WHERE id = ?').get(class_id);
  if (!cls) return res.status(400).json({ error: '班级不存在' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(400).json({ error: '用户名已存在' });

  const hash = bcrypt.hashSync(password || '123456', 10);
  const result = db.prepare(
    "INSERT INTO users (username, password, role, class_id) VALUES (?, ?, 'student', ?)"
  ).run(username, hash, class_id);

  res.json({ id: result.lastInsertRowid, username, role: 'student', class_id });
});

// 修改密码（教师）
router.post('/change-password', authMiddleware, (req, res) => {
  const { old_password, new_password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(old_password, user.password)) {
    return res.status(400).json({ error: '旧密码错误' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true });
});

// 获取当前用户信息
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, role, class_id FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

module.exports = router;

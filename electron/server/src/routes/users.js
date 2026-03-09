const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

// 获取所有教师列表（管理员）
router.get('/teachers', authMiddleware, requireRole('admin'), (req, res) => {
  const teachers = db.prepare("SELECT id, username FROM users WHERE role = 'teacher' ORDER BY id").all();
  const result = teachers.map(t => {
    const classes = db.prepare(`
      SELECT c.id, c.name, tc.permission, tc.is_head_teacher
      FROM teacher_classes tc JOIN classes c ON tc.class_id = c.id
      WHERE tc.teacher_id = ?
    `).all(t.id);
    return { ...t, classes };
  });
  res.json(result);
});

// 获取所有学生列表（管理员/教师）
router.get('/students', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const { class_id } = req.query;
  let students;
  if (class_id) {
    students = db.prepare(`
      SELECT u.id, u.username, u.class_id, c.name as class_name
      FROM users u LEFT JOIN classes c ON u.class_id = c.id
      WHERE u.role = 'student' AND u.class_id = ?
      ORDER BY u.id
    `).all(class_id);
  } else {
    students = db.prepare(`
      SELECT u.id, u.username, u.class_id, c.name as class_name
      FROM users u LEFT JOIN classes c ON u.class_id = c.id
      WHERE u.role = 'student'
      ORDER BY u.id
    `).all();
  }
  res.json(students);
});

// 获取班级内用户名列表（用于登录下拉搜索）
router.get('/students/by-class/:class_id', (req, res) => {
  const { search } = req.query;
  let students;
  if (search) {
    students = db.prepare(
      "SELECT id, username FROM users WHERE role = 'student' AND class_id = ? AND username LIKE ? ORDER BY username"
    ).all(req.params.class_id, `%${search}%`);
  } else {
    students = db.prepare(
      "SELECT id, username FROM users WHERE role = 'student' AND class_id = ? ORDER BY username"
    ).all(req.params.class_id);
  }
  res.json(students);
});

// 创建教师账号（管理员）
router.post('/teachers', authMiddleware, requireRole('admin'), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(400).json({ error: '用户名已存在' });
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'teacher')").run(username, hash);
  res.json({ id: result.lastInsertRowid, username, role: 'teacher' });
});

// 创建学生账号（管理员/教师）
router.post('/students', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const { username, class_id } = req.body;
  if (!username) return res.status(400).json({ error: '用户名不能为空' });
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(400).json({ error: '用户名已存在' });
  const hash = bcrypt.hashSync('123456', 10);
  const result = db.prepare(
    "INSERT INTO users (username, password, role, class_id) VALUES (?, ?, 'student', ?)"
  ).run(username, hash, class_id || null);
  res.json({ id: result.lastInsertRowid, username, role: 'student', class_id });
});

// 更新教师班级和权限（管理员）
router.put('/teachers/:id/classes', authMiddleware, requireRole('admin'), (req, res) => {
  const { classes } = req.body; // [{class_id, permission, is_head_teacher}]
  const teacherId = req.params.id;
  const updateClasses = db.transaction(() => {
    db.prepare('DELETE FROM teacher_classes WHERE teacher_id = ?').run(teacherId);
    for (const c of (classes || [])) {
      db.prepare(
        'INSERT INTO teacher_classes (teacher_id, class_id, permission, is_head_teacher) VALUES (?, ?, ?, ?)'
      ).run(teacherId, c.class_id, c.permission || 'view', c.is_head_teacher ? 1 : 0);
    }
  });
  updateClasses();
  res.json({ success: true });
});

// 更新学生班级（管理员）
router.put('/students/:id/class', authMiddleware, requireRole('admin'), (req, res) => {
  const { class_id } = req.body;
  db.prepare('UPDATE users SET class_id = ? WHERE id = ? AND role = \'student\'').run(class_id || null, req.params.id);
  res.json({ success: true });
});

// 删除用户（管理员/教师）
router.delete('/:id', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.role === 'admin') return res.status(403).json({ error: '不能删除管理员' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// 重置学生密码为123456（管理员/教师）
router.post('/:id/reset-password', authMiddleware, requireRole('admin', 'teacher'), (req, res) => {
  const hash = bcrypt.hashSync('123456', 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ success: true });
});

module.exports = router;

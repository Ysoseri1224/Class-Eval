const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'zxz.db');

// 确保data目录存在
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// 开启WAL模式提升并发性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 初始化数据库表
db.exec(`
  -- 班级表
  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 用户表
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 教师-班级关联表（教师可管理多个班级）
  CREATE TABLE IF NOT EXISTS teacher_classes (
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'view' CHECK(permission IN ('view', 'edit')),
    is_head_teacher INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (teacher_id, class_id)
  );

  -- 套题/单题集合表
  CREATE TABLE IF NOT EXISTS question_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    is_single INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 题目表
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES question_sets(id) ON DELETE CASCADE,
    question_no TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('choice', 'judge', 'fill', 'match', 'image_match')),
    content TEXT NOT NULL,
    options TEXT,
    answer TEXT NOT NULL,
    score REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 课堂/发布记录表
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    class_id INTEGER REFERENCES classes(id),
    question_set_id INTEGER REFERENCES question_sets(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'open', 'closed')),
    exam_open INTEGER NOT NULL DEFAULT 0,
    self_eval_open INTEGER NOT NULL DEFAULT 0,
    peer_eval_open INTEGER NOT NULL DEFAULT 0,
    duration_minutes INTEGER,
    start_time DATETIME,
    end_time DATETIME,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 学生答题记录表
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    student_id INTEGER NOT NULL REFERENCES users(id),
    answers TEXT NOT NULL DEFAULT '{}',
    score REAL DEFAULT 0,
    submitted_at DATETIME,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'submitted')),
    UNIQUE(session_id, student_id)
  );

  -- 自评维度配置表
  CREATE TABLE IF NOT EXISTS self_eval_dimensions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    dimension_name TEXT NOT NULL,
    level_20 TEXT NOT NULL DEFAULT '初步了解',
    level_40 TEXT NOT NULL DEFAULT '基本掌握',
    level_60 TEXT NOT NULL DEFAULT '较好掌握',
    level_80 TEXT NOT NULL DEFAULT '熟练掌握',
    level_100 TEXT NOT NULL DEFAULT '完全掌握',
    sort_order INTEGER DEFAULT 0
  );

  -- 学生自评记录表
  CREATE TABLE IF NOT EXISTS self_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    student_id INTEGER NOT NULL REFERENCES users(id),
    dimension_id INTEGER NOT NULL REFERENCES self_eval_dimensions(id),
    score INTEGER NOT NULL CHECK(score IN (20, 40, 60, 80, 100)),
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, student_id, dimension_id)
  );

  -- 互评分配表
  CREATE TABLE IF NOT EXISTS peer_eval_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    reviewer_id INTEGER NOT NULL REFERENCES users(id),
    reviewee_id INTEGER NOT NULL REFERENCES users(id),
    score REAL,
    comment TEXT,
    submitted_at DATETIME,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'submitted')),
    UNIQUE(session_id, reviewer_id, reviewee_id)
  );
`);

// 初始化管理员账号
const bcrypt = require('bcryptjs');
const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  const hash = bcrypt.hashSync('248064', 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')").run('zxz', hash);
  console.log('管理员账号已初始化: zxz / 248064');
}

module.exports = db;

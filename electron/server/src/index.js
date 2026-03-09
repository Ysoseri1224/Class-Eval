const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Electron 打包后 __dirname 为 server/src，根目录为 server 上一层
const ROOT_DIR = path.join(__dirname, '..', '..');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件（上传图片）
const uploadsDir = path.join(ROOT_DIR, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/users', require('./routes/users'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/evaluations', require('./routes/evaluations'));

// 图片上传路由
const multer = require('multer');
const uploadDir = uploadsDir;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ========== Socket.io 在线状态管理 ==========
const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  socket.on('user_login', (userId) => {
    onlineUsers.set(String(userId), socket.id);
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });

  socket.on('disconnect', () => {
    for (const [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(uid);
        break;
      }
    }
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });
});

// 提供在线用户列表API
app.get('/api/online-users', (req, res) => {
  res.json(Array.from(onlineUsers.keys()).map(Number));
});

// 健康检查
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 服务前端静态文件（生产/Electron 模式）
// 依次查找：../client/dist（开发）、../../client-dist（Electron）
const candidates = [
  path.join(__dirname, '..', '..', 'client', 'dist'),
  path.join(ROOT_DIR, 'client-dist'),
];
const clientDist = candidates.find(p => fs.existsSync(p));
if (clientDist) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  课堂评测系统服务端已启动`);
  console.log(`  访问地址: http://localhost:${PORT}`);
  console.log(`  局域网地址: http://[本机IP]:${PORT}`);
  console.log(`  管理员账号: zxz / 248064`);
  console.log(`========================================\n`);
});

module.exports = { app, io };

# 课堂评测系统

基于 Node.js + React 的课堂答题、自评、互评综合管理系统。

---

## 技术栈

- **后端**：Node.js + Express + SQLite (better-sqlite3) + Socket.io
- **前端**：React + TypeScript + Tailwind CSS + Vite + Zustand

---

## 项目结构

```
zxz/
├── server/          # 后端
│   ├── src/
│   │   ├── index.js         # 主入口
│   │   ├── database.js      # 数据库初始化
│   │   ├── middleware/auth.js
│   │   └── routes/          # API 路由
│   ├── uploads/             # 上传图片目录（自动创建）
│   └── package.json
└── client/          # 前端
    ├── src/
    │   ├── pages/
    │   │   ├── admin/       # 管理员端
    │   │   ├── teacher/     # 教师端
    │   │   └── student/     # 学生端
    │   ├── api/             # API 封装
    │   ├── store/           # Zustand 状态管理
    │   └── types/           # TypeScript 类型定义
    └── package.json
```

---

## 启动说明

### 前置要求

- Node.js v18+
- Yarn

### 开发模式（前后端分离）

```powershell
# 终端1：启动后端
cd server
yarn install --ignore-scripts
node src/index.js        # http://localhost:3001

# 终端2：启动前端开发服务器
cd client
yarn install
yarn dev                 # http://localhost:5173
```

### 生产模式（单进程）

```powershell
# 先构建前端
cd client
yarn build

# 再启动后端（自动服务前端静态文件）
cd ../server
node src/index.js        # http://localhost:3001（前后端合一）
```

---

## better-sqlite3 预编译文件说明

由于 Windows 环境编译限制，需手动下载预编译文件：

1. 查看 Node.js modules 版本：
   ```powershell
   node -e "console.log(process.versions.modules)"
   ```

2. 从以下地址下载对应版本（以 v127 为例）：
   ```
   https://github.com/WiseLibs/better-sqlite3/releases/download/v11.9.1/better-sqlite3-v11.9.1-node-v127-win32-x64.tar.gz
   ```

3. 解压后将 `better_sqlite3.node` 放入：
   ```
   server/node_modules/better-sqlite3/build/Release/
   ```

---

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | zxz | 248064 |

---

## 功能说明

### 管理员端 `/admin`

| 页面 | 功能 |
|------|------|
| 班级管理 | 创建/编辑/删除班级，查看班级学生 |
| 用户管理 | 管理教师和学生账号，重置密码，分配班级 |
| 试题管理 | 创建题集（套题/单题），支持选择、判断、填空、连线、图片配对五种题型 |
| 课堂管理 | 创建课堂，控制答题/自评开关，分配随机互评 |
| 成绩管理 | 查看各课堂答题统计、学生成绩及自评/互评等级 |

### 教师端 `/teacher`

- 学生管理、试题管理、课堂管理、成绩查看（与管理员功能相同）
- 修改密码

### 学生端 `/student`

| 页面 | 功能 |
|------|------|
| 答题 | 选择开放课堂作答，自动保存，提交后显示得分和答案解析 |
| 自评 | 按维度选择等级（5级），提交后显示自评等级（A/B/C） |
| 互评 | 查看分配到的同学答卷，0-100分任意打分，提交后显示互评等级 |

---

## 等级计算规则

- **自评等级**：（答题得分 + 各维度自评分之和）/ 满分 ≥ 85% → A，≥ 75% → B，其余 → C
- **互评等级**：（答题得分 + 互评平均分）/ 200 ≥ 85% → A，≥ 75% → B，其余 → C

---

## API 说明

后端监听 `3001` 端口，前端通过 Vite 代理转发 `/api` 请求。

Socket.io 用于实时在线状态感知，学生登录后自动上线，离线自动下线。

const { app, BrowserWindow, Tray, Menu, shell, dialog } = require('electron')
const path = require('path')
const os = require('os')

let tray = null
let win = null
let serverStarted = false

// 获取局域网 IP
function getLocalIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

// 启动内嵌 Express 服务器
function startServer() {
  // 开发时: __dirname/server/node_modules
  // 打包后: process.resourcesPath/server_modules（extraResources 放置位置）
  const serverNodeModules = app.isPackaged
    ? path.join(process.resourcesPath, 'server_modules')
    : path.join(__dirname, 'server', 'node_modules')

  // 设置 NODE_PATH 并重新初始化模块路径
  process.env.NODE_PATH = serverNodeModules
  require('module')._initPaths()

  // 监听端口占用事件（server.listen 是异步的，错误通过 process 事件传递）
  process.once('EADDRINUSE', () => {
    dialog.showMessageBox({
      type: 'warning',
      title: '程序已在运行',
      message: '课堂评测系统已在运行中',
      detail: '端口 3001 已被占用，请检查系统托盘是否已有运行中的实例。\n如需重启，请先右键托盘图标退出，再重新启动。',
      buttons: ['确定']
    })
  })

  const serverPath = path.join(__dirname, 'server', 'src', 'index.js')
  try {
    require(serverPath)
    serverStarted = true
    console.log('服务器启动成功')
  } catch (e) {
    console.error('服务器启动失败:', e)
    dialog.showErrorBox('启动失败', '服务器启动失败：' + e.message)
  }
}

function createWindow() {
  const ip = getLocalIP()
  const port = 3001
  const url = `http://localhost:${port}`

  win = new BrowserWindow({
    width: 480,
    height: 320,
    resizable: false,
    title: '课堂评测系统',
    webPreferences: { nodeIntegration: false }
  })

  win.loadFile(path.join(__dirname, 'splash.html'))
  win.setMenuBarVisibility(false)

  // 注入局域网地址到窗口
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      document.getElementById('ip').textContent = '${ip}';
      document.getElementById('port').textContent = '${port}';
    `)
  })

  win.on('close', (e) => {
    e.preventDefault()
    win.hide()
  })
}

function createTray() {
  const ip = getLocalIP()
  const port = 3001

  // 无图标时用默认
  try {
    tray = new Tray(path.join(__dirname, 'icon.ico'))
  } catch {
    tray = new Tray(path.join(process.resourcesPath || __dirname, 'icon.ico'))
  }

  const menu = Menu.buildFromTemplate([
    { label: `课堂评测系统  运行中`, enabled: false },
    { label: `局域网地址: http://${ip}:${port}`, enabled: false },
    { type: 'separator' },
    { label: '打开控制面板', click: () => { win ? win.show() : createWindow() } },
    { label: '用浏览器打开', click: () => shell.openExternal(`http://${ip}:${port}`) },
    { type: 'separator' },
    { label: '退出', click: () => { app.exit(0) } }
  ])

  tray.setToolTip(`课堂评测系统\nhttp://${ip}:${port}`)
  tray.setContextMenu(menu)
  tray.on('double-click', () => { win ? win.show() : createWindow() })
}

app.whenReady().then(() => {
  startServer()
  createWindow()
  createTray()
})

app.on('window-all-closed', (e) => {
  // 保持后台运行
})

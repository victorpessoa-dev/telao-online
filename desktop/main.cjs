const { app, BrowserWindow, ipcMain, net: electronNet, protocol, safeStorage, session, shell } = require('electron')
const { spawn } = require('node:child_process')
const { randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const fsSync = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const net = require('node:net')

const PORT = Number(process.env.V_PLAYCAST_DESKTOP_PORT || 3107)
const OVERLAY_PORT = Number(process.env.V_PLAYCAST_OVERLAY_PORT || 17850)
const HOST = '127.0.0.1'
const origin = `http://${HOST}:${PORT}`
const desktopStartUrl = `${origin}/admin`
const desktopToken = process.env.V_PLAYCAST_DESKTOP_TOKEN || randomUUID()

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'vplaycast-media',
    privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true },
  },
])

let mainWindow
let nextProcess
let overlayRuntime
const overlayClients = new Set()

function secureSessionPath() {
  return path.join(app.getPath('userData'), 'supabase-session.bin')
}

function desktopConfigPath() {
  return path.join(app.getPath('userData'), 'desktop-config.json')
}

async function readDesktopConfig() {
  try {
    const config = JSON.parse(await fs.readFile(desktopConfigPath(), 'utf8'))
    return {
      theme: config?.theme === 'light' ? 'light' : 'dark',
      siteUrl: typeof config?.siteUrl === 'string' ? config.siteUrl : '',
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') console.warn('Não foi possível ler a configuração local:', error.message)
    return { theme: 'dark', siteUrl: '' }
  }
}

async function writeDesktopConfig(config) {
  const target = desktopConfigPath()
  const temporary = `${target}.${randomUUID()}.tmp`
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(temporary, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: 0o600 })
  await fs.rename(temporary, target)
}

function validatePublicSiteUrl(siteUrl, slug) {
  const parsed = new URL(String(siteUrl || '').trim())
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('Informe uma URL pública HTTP(S), sem usuário ou senha.')
  }
  const host = parsed.hostname.toLowerCase()
  if (host === 'localhost' || host === '::1' || /^(127|10)\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw new Error('Use o domínio público do site, não um endereço local.')
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(String(slug || ''))) {
    throw new Error('O slug da igreja ainda não está disponível para validar a rota.')
  }
  parsed.pathname = `${parsed.pathname.replace(/\/$/, '')}/${slug}/ads-telao`.replace(/\/+/g, '/')
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString()
}

const overlayIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function overlaysRoot() {
  return path.join(app.getPath('userData'), 'overlays')
}

function assertOverlayId(id) {
  if (typeof id !== 'string' || !overlayIdPattern.test(id)) throw new Error('ID de overlay inválido.')
}

function overlayDirectory(id) {
  assertOverlayId(id)
  return path.join(overlaysRoot(), id)
}

function overlayManifestPath(id) {
  return path.join(overlayDirectory(id), 'overlay.json')
}

async function readOverlay(id) {
  const raw = await fs.readFile(overlayManifestPath(id), 'utf8')
  const overlay = JSON.parse(raw)
  if (overlay.id !== id || !Array.isArray(overlay.data?.elements)) throw new Error('Projeto de overlay inválido.')
  return overlay
}

async function writeOverlay(overlay) {
  const target = overlayManifestPath(overlay.id)
  const temporary = `${target}.${randomUUID()}.tmp`
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(temporary, JSON.stringify(overlay, null, 2), 'utf8')
  await fs.rename(temporary, target)
}

async function listLocalOverlays() {
  await fs.mkdir(overlaysRoot(), { recursive: true })
  const entries = await fs.readdir(overlaysRoot(), { withFileTypes: true })
  const overlays = await Promise.all(entries.filter((entry) => entry.isDirectory() && overlayIdPattern.test(entry.name)).map(async (entry) => {
    try { return await readOverlay(entry.name) } catch { return null }
  }))
  return overlays.filter(Boolean).sort((left, right) => right.updated_at.localeCompare(left.updated_at))
}

function overlayUrl(id) {
  assertOverlayId(id)
  return `http://${HOST}:${OVERLAY_PORT}/overlay/${id}`
}

function notifyOverlayRuntime(id, type = 'updated') {
  const payload = `event: overlay\ndata: ${JSON.stringify({ id, type })}\n\n`
  for (const client of overlayClients) client.write(payload)
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase()
  return ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm' })[extension] || 'application/octet-stream'
}

function overlayHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body,#root{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}#root{position:relative} .el{position:absolute;overflow:hidden}.el img,.el video{width:100%;height:100%;object-fit:contain}.text{width:100%;height:100%;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.2;text-shadow:0 2px 4px #0008}</style></head><body><div id="root"></div><script>const id=location.pathname.split('/').pop(),root=document.getElementById('root');async function render(){let r=await fetch('/overlay/'+id+'/state');if(!r.ok){root.replaceChildren();return}let o=await r.json();root.style.width=o.width+'px';root.style.height=o.height+'px';root.replaceChildren(...o.data.elements.filter(e=>e.visible!==false).sort((a,b)=>(a.zIndex||0)-(b.zIndex||0)).map(e=>{let n=document.createElement('div');n.className='el';Object.assign(n.style,{left:e.x+'px',top:e.y+'px',width:e.width+'px',height:e.height+'px',zIndex:e.zIndex||0});if(e.type==='text'){let t=document.createElement('div');t.className='text';t.textContent=e.text||'';Object.assign(t.style,{fontSize:(e.fontSize||24)+'px',color:e.fontColor||'#fff',fontFamily:e.fontFamily||'sans-serif'});n.append(t)}else if(e.src){let m=document.createElement(e.src.match(/\\.(mp4|webm)(?:$|\\?)/i)?'video':'img');m.src=e.src;m.autoplay=true;m.loop=true;m.muted=true;m.playsInline=true;n.append(m)}return n}))}new EventSource('/events').addEventListener('overlay',e=>{if(JSON.parse(e.data).id===id)render()});render()</script></body></html>`
}

function startOverlayRuntime() {
  overlayRuntime = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${HOST}:${OVERLAY_PORT}`)
    if (url.pathname === '/events') {
      response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
      response.write(': connected\n\n')
      overlayClients.add(response)
      request.on('close', () => overlayClients.delete(response))
      return
    }
    const match = url.pathname.match(/^\/overlay\/([0-9a-f-]{36})(?:\/(state|assets\/(.+))?)?$/i)
    if (!match) { response.writeHead(404).end(); return }
    const [, id, action, asset] = match
    try {
      assertOverlayId(id)
      if (!action) { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(overlayHtml()); return }
      if (action === 'state') { response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(await readOverlay(id))); return }
      const target = path.resolve(overlayDirectory(id), 'assets', asset)
      if (!target.startsWith(`${path.join(overlayDirectory(id), 'assets')}${path.sep}`)) throw new Error('Invalid asset')
      response.writeHead(200, { 'Content-Type': contentType(target), 'Cache-Control': 'no-store' })
      fsSync.createReadStream(target).on('error', () => response.destroy()).pipe(response)
    } catch { response.writeHead(404).end() }
  })
  overlayRuntime.listen(OVERLAY_PORT, HOST)
}

function sanitizeAssetName(name) {
  return String(name || 'media').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120)
}

async function readSecureSessionStore() {
  if (!safeStorage.isEncryptionAvailable()) return { remember: false, values: {} }

  try {
    const encrypted = await fs.readFile(secureSessionPath())
    const plainText = safeStorage.decryptString(encrypted)
    const parsed = JSON.parse(plainText)
    return {
      remember: parsed?.remember === true,
      values: parsed?.values && typeof parsed.values === 'object' ? parsed.values : {},
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') console.warn('Não foi possível ler a sessão segura:', error.message)
    return { remember: false, values: {} }
  }
}

async function writeSecureSessionStore(store) {
  if (!safeStorage.isEncryptionAvailable()) {
    if (!store.remember) return
    throw new Error('A criptografia do Windows não está disponível para salvar a sessão.')
  }

  const encrypted = safeStorage.encryptString(JSON.stringify(store))
  await fs.mkdir(path.dirname(secureSessionPath()), { recursive: true })
  await fs.writeFile(secureSessionPath(), encrypted, { mode: 0o600 })
}

function assertSessionKey(key) {
  if (typeof key !== 'string' || !key.startsWith('sb-') || key.length > 200) {
    throw new Error('Chave de sessão inválida.')
  }
}

function getProjectRoot() {
  return app.isPackaged ? path.join(process.resourcesPath, 'app') : path.resolve(__dirname, '..')
}

function getNextBin(projectRoot) {
  return path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next')
}

function canConnect() {
  return new Promise((resolve) => {
    const socket = net.connect({ host: HOST, port: PORT })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

async function waitForServer(timeoutMs = 45_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnect()) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`O servidor local não iniciou em ${origin}.`)
}

function startNextServer() {
  if (process.env.ELECTRON_START_URL) return

  const projectRoot = getProjectRoot()
  const nextArgs = app.isPackaged
    ? [getNextBin(projectRoot), 'start', '--hostname', HOST, '--port', String(PORT)]
    : [getNextBin(projectRoot), 'dev', '--hostname', HOST, '--port', String(PORT)]

  nextProcess = spawn(process.execPath, nextArgs, {
    cwd: projectRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: app.isPackaged ? 'production' : 'development',
      V_PLAYCAST_DESKTOP_TOKEN: desktopToken,
    },
    stdio: 'inherit',
  })

  nextProcess.once('error', (error) => {
    console.error('Falha ao iniciar o Next.js local:', error)
  })
}

function isAllowedNavigation(url) {
  return url === origin || url.startsWith(`${origin}/`)
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#020617',
    title: 'V Playcast',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) event.preventDefault()
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())
  await mainWindow.loadURL(process.env.ELECTRON_START_URL || desktopStartUrl)
}

function registerIpc() {
  function assertDesktopSender(event) {
    if (event.senderFrame.url && !isAllowedNavigation(event.senderFrame.url)) {
      throw new Error('Origem não autorizada.')
    }
  }

  ipcMain.handle('desktop:get-info', (event) => {
    assertDesktopSender(event)
    return {
      isDesktop: true,
      version: app.getVersion(),
      platform: process.platform,
    }
  })

  ipcMain.handle('desktop-auth:get-remember', async (event) => {
    assertDesktopSender(event)
    return (await readSecureSessionStore()).remember
  })

  ipcMain.handle('desktop-auth:set-remember', async (event, remember) => {
    assertDesktopSender(event)
    const store = await readSecureSessionStore()
    store.remember = remember === true
    if (!store.remember) {
      store.values = {}
      await fs.rm(secureSessionPath(), { force: true })
      return
    }
    await writeSecureSessionStore(store)
  })

  ipcMain.handle('desktop-auth:get-session', async (event, key) => {
    assertDesktopSender(event)
    assertSessionKey(key)
    const store = await readSecureSessionStore()
    return store.remember ? store.values[key] || null : null
  })

  ipcMain.handle('desktop-auth:set-session', async (event, key, value) => {
    assertDesktopSender(event)
    assertSessionKey(key)
    if (typeof value !== 'string' || value.length > 50_000) throw new Error('Sessão inválida.')
    const store = await readSecureSessionStore()
    if (!store.remember) return
    store.values[key] = value
    await writeSecureSessionStore(store)
  })

  ipcMain.handle('desktop-auth:clear-session', async (event, key) => {
    assertDesktopSender(event)
    assertSessionKey(key)
    const store = await readSecureSessionStore()
    delete store.values[key]
    if (!store.remember) return
    await writeSecureSessionStore(store)
  })

  ipcMain.handle('desktop-config:get', async (event) => {
    assertDesktopSender(event)
    return readDesktopConfig()
  })

  ipcMain.handle('desktop-config:validate-site', async (event, siteUrl, slug) => {
    assertDesktopSender(event)
    const routeUrl = validatePublicSiteUrl(siteUrl, slug)
    try {
      const response = await electronNet.fetch(routeUrl, { redirect: 'manual' })
      return {
        valid: response.status >= 200 && response.status < 400,
        status: response.status,
        routeUrl,
      }
    } catch {
      return { valid: false, status: 0, routeUrl }
    }
  })

  ipcMain.handle('desktop-config:save', async (event, config, slug) => {
    assertDesktopSender(event)
    const theme = config?.theme === 'light' ? 'light' : 'dark'
    const routeUrl = validatePublicSiteUrl(config?.siteUrl, slug)
    const response = await electronNet.fetch(routeUrl, { redirect: 'manual' })
    if (response.status < 200 || response.status >= 400) throw new Error(`A rota pública retornou HTTP ${response.status}.`)
    const siteUrl = new URL(String(config.siteUrl).trim())
    siteUrl.pathname = siteUrl.pathname.replace(/\/$/, '')
    siteUrl.search = ''
    siteUrl.hash = ''
    await writeDesktopConfig({ theme, siteUrl: siteUrl.toString() })
    return { theme, siteUrl: siteUrl.toString(), routeUrl }
  })

  ipcMain.handle('desktop-overlay:list', async (event) => {
    assertDesktopSender(event)
    return listLocalOverlays()
  })

  ipcMain.handle('desktop-overlay:create', async (event, payload) => {
    assertDesktopSender(event)
    const name = String(payload?.name || '').trim()
    if (!name || name.length > 120) throw new Error('Nome de overlay inválido.')
    const now = new Date().toISOString()
    const overlay = {
      id: randomUUID(),
      name,
      width: Math.max(1, Math.min(7680, Number(payload?.width) || 1920)),
      height: Math.max(1, Math.min(7680, Number(payload?.height) || 1080)),
      data: { elements: [] },
      created_at: now,
      updated_at: now,
      format_version: 1,
    }
    await writeOverlay(overlay)
    await fs.mkdir(path.join(overlayDirectory(overlay.id), 'assets'), { recursive: true })
    await fs.mkdir(path.join(overlayDirectory(overlay.id), 'backups'), { recursive: true })
    notifyOverlayRuntime(overlay.id, 'created')
    return overlay
  })

  ipcMain.handle('desktop-overlay:update', async (event, id, payload) => {
    assertDesktopSender(event)
    assertOverlayId(id)
    const current = await readOverlay(id)
    const next = {
      ...current,
      name: typeof payload?.name === 'string' ? payload.name.trim().slice(0, 120) : current.name,
      width: Number.isFinite(payload?.width) ? payload.width : current.width,
      height: Number.isFinite(payload?.height) ? payload.height : current.height,
      data: payload?.data && Array.isArray(payload.data.elements) ? payload.data : current.data,
      updated_at: new Date().toISOString(),
    }
    if (!next.name || next.width < 1 || next.height < 1 || next.width > 7680 || next.height > 7680) throw new Error('Dados de overlay inválidos.')
    await writeOverlay(next)
    notifyOverlayRuntime(id)
    return next
  })

  ipcMain.handle('desktop-overlay:delete', async (event, id) => {
    assertDesktopSender(event)
    assertOverlayId(id)
    await fs.rm(overlayDirectory(id), { recursive: true, force: true })
    notifyOverlayRuntime(id, 'deleted')
  })

  ipcMain.handle('desktop-overlay:save-asset', async (event, id, name, bytes) => {
    assertDesktopSender(event)
    assertOverlayId(id)
    const data = Buffer.from(bytes)
    if (data.length === 0 || data.length > 100 * 1024 * 1024) throw new Error('Arquivo local inválido.')
    const safeName = `${randomUUID()}-${sanitizeAssetName(name)}`
    const relativePath = path.posix.join('assets', safeName)
    const target = path.join(overlayDirectory(id), relativePath)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, data)
    return `${overlayUrl(id)}/assets/${encodeURIComponent(safeName)}`
  })

  ipcMain.handle('desktop-overlay:url', (event, id) => {
    assertDesktopSender(event)
    return overlayUrl(id)
  })
}

app.whenReady().then(async () => {
  registerIpc()
  startOverlayRuntime()
  protocol.handle('vplaycast-media', async (request) => {
    try {
      const url = new URL(request.url)
      assertOverlayId(url.hostname)
      const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '')
      if (!relativePath.startsWith('assets/') || relativePath.includes('..')) return new Response('Not found', { status: 404 })
      const target = path.resolve(overlayDirectory(url.hostname), relativePath)
      if (!target.startsWith(`${overlayDirectory(url.hostname)}${path.sep}`)) return new Response('Not found', { status: 404 })
      return electronNet.fetch(require('node:url').pathToFileURL(target).toString())
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (details.url === origin || details.url.startsWith(`${origin}/`)) {
      details.requestHeaders['x-v-playcast-desktop'] = desktopToken
    }
    callback({ requestHeaders: details.requestHeaders })
  })
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (!details.url.startsWith(origin)) return callback({ responseHeaders: details.responseHeaders })
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; img-src 'self' data: blob: http://127.0.0.1:17850; media-src 'self' data: blob: http://127.0.0.1:17850; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval'; connect-src 'self' ws://127.0.0.1:3107 http://127.0.0.1:17850; frame-src 'self'",
        ],
      },
    })
  })
  startNextServer()

  try {
    await waitForServer()
    await createWindow()
  } catch (error) {
    console.error(error)
    app.quit()
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (nextProcess && !nextProcess.killed) nextProcess.kill()
  overlayRuntime?.close()
})

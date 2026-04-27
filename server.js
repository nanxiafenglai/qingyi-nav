import { existsSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

const port = Number(process.env.PORT || 5173)
const adminUser = process.env.ADMIN_USER || 'admin'
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
const root = process.cwd()
const dataDir = join(root, 'data')
if (!existsSync(dataDir)) mkdirSync(dataDir)
const db = new DatabaseSync(join(dataDir, 'nav.sqlite'))
const sha256 = (text) => createHash('sha256').update(text).digest('hex')
const makeToken = () => randomBytes(24).toString('hex')


const json = (res, data, code = 200) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_config (
      id INTEGER PRIMARY KEY CHECK (id = 1), title TEXT NOT NULL, subtitle TEXT,
      logo_text TEXT DEFAULT '清', footer TEXT
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
      sort INTEGER DEFAULT 0, visible INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL,
      name TEXT NOT NULL, url TEXT NOT NULL, icon TEXT DEFAULT 'Sparkles', color TEXT DEFAULT '#4f8cff',
      description TEXT, sort INTEGER DEFAULT 0, visible INTEGER DEFAULT 1,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, token TEXT
    );
  `)
  db.prepare(`INSERT OR IGNORE INTO site_config (id,title,subtitle,logo_text,footer) VALUES (1,?,?,?,?)`)
    .run('清漪导航', '前台优雅展示，后台自由配置；让工具、文档与灵感各归其位。', '清', 'Powered by Vue 3 + Node.js + SQLite')
  db.prepare(`INSERT OR IGNORE INTO admin_users (username,password_hash) VALUES (?,?)`).run(adminUser, sha256(adminPassword))

  const count = db.prepare('SELECT COUNT(*) AS total FROM categories').get().total
  if (count) return
  const cats = ['常用工具', '开发文档', 'AI 助手', '服务器', '设计灵感']
  cats.forEach((name, i) => db.prepare('INSERT INTO categories (name,sort) VALUES (?,?)').run(name, i + 1))
  const catMap = Object.fromEntries(db.prepare('SELECT id,name FROM categories').all().map((x) => [x.name, x.id]))
  const rows = [
    ['GitHub', 'https://github.com', 'Code2', '#24292f', '代码托管与协作平台', '常用工具'],
    ['Vercel', 'https://vercel.com', 'Cloud', '#111827', '前端项目快速部署', '常用工具'],
    ['Vue Docs', 'https://vuejs.org', 'Code2', '#42b883', 'Vue 3 官方文档与生态', '开发文档'],
    ['MDN Web Docs', 'https://developer.mozilla.org', 'ShieldCheck', '#2563eb', 'Web 标准与浏览器 API', '开发文档'],
    ['ChatGPT', 'https://chat.openai.com', 'Sparkles', '#10a37f', '灵感、代码与知识助手', 'AI 助手'],
    ['Claude', 'https://claude.ai', 'Sparkles', '#d97706', '长文本分析与创作辅助', 'AI 助手'],
    ['Portainer', 'https://www.portainer.io', 'Gauge', '#13bef9', 'Docker 可视化管理面板', '服务器'],
    ['Cloudflare', 'https://cloudflare.com', 'Cloud', '#f6821f', 'DNS、CDN 与安全防护', '服务器'],
    ['Dribbble', 'https://dribbble.com', 'Palette', '#ea4c89', '界面与视觉设计灵感', '设计灵感'],
    ['Figma', 'https://figma.com', 'Palette', '#a855f7', '协同设计与原型工具', '设计灵感'],
  ]
  rows.forEach((r, i) => db.prepare('INSERT INTO links (name,url,icon,color,description,category_id,sort) VALUES (?,?,?,?,?,?,?)').run(r[0], r[1], r[2], r[3], r[4], catMap[r[5]], i + 1))
}

function getPublicData() {
  const site = db.prepare('SELECT title,subtitle,logo_text,footer FROM site_config WHERE id=1').get()
  const categories = db.prepare('SELECT id,name,sort FROM categories WHERE visible=1 ORDER BY sort,id').all()
  const links = db.prepare(`SELECT l.id,l.name,l.url,l.icon,l.color,l.description,l.category_id,c.name AS category
    FROM links l JOIN categories c ON c.id=l.category_id WHERE l.visible=1 AND c.visible=1 ORDER BY c.sort,l.sort,l.id`).all()
  return { site, categories, links }
}

async function body(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
}
function isAuthed(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  return token && db.prepare('SELECT id FROM admin_users WHERE token=?').get(token)
}


async function api(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/nav') return json(res, getPublicData())
  if (req.method === 'POST' && pathname === '/api/admin/login') {
    const d = await body(req)
    const user = db.prepare('SELECT id FROM admin_users WHERE username=? AND password_hash=?').get(d.username, sha256(d.password || ''))
    if (!user) return json(res, { message: '账号或密码错误' }, 401)
    const token = makeToken()
    db.prepare('UPDATE admin_users SET token=? WHERE id=?').run(token, user.id)
    return json(res, { token })
  }
  if (pathname.startsWith('/api/admin/') && !isAuthed(req)) return json(res, { message: '未登录' }, 401)

  if (req.method === 'POST' && pathname === '/api/admin/logout') {
    const token = (req.headers.authorization || '').replace('Bearer ', '')
    db.prepare('UPDATE admin_users SET token=NULL WHERE token=?').run(token)
    return json(res, { success: true })
  }
  if (req.method === 'PUT' && pathname === '/api/admin/password') {
    const d = await body(req)
    const token = (req.headers.authorization || '').replace('Bearer ', '')
    const user = db.prepare('SELECT id,password_hash FROM admin_users WHERE token=?').get(token)
    if (!user || user.password_hash !== sha256(d.oldPassword || '')) return json(res, { message: '旧密码不正确' }, 400)
    db.prepare('UPDATE admin_users SET password_hash=?,token=NULL WHERE id=?').run(sha256(d.newPassword || ''), user.id)
    return json(res, { success: true })
  }

  if (req.method === 'PUT' && pathname === '/api/admin/site-config') {
    const d = await body(req)
    db.prepare('UPDATE site_config SET title=?,subtitle=?,logo_text=?,footer=? WHERE id=1')
      .run(d.title, d.subtitle ?? '', d.logo_text ?? '清', d.footer ?? '')
    return json(res, { success: true })
  }

  if (req.method === 'POST' && pathname === '/api/admin/categories') {
    const data = await body(req)
    const info = db.prepare('INSERT INTO categories (name,sort,visible) VALUES (?,?,?)').run(data.name, data.sort ?? 99, data.visible ?? 1)
    return json(res, { id: info.lastInsertRowid })
  }
  const categoryMatch = pathname.match(/^\/api\/admin\/categories\/([0-9]+)$/)
  if (categoryMatch && req.method === 'PUT') {
    const d = await body(req)
    db.prepare('UPDATE categories SET name=?,sort=?,visible=? WHERE id=?').run(d.name, d.sort ?? 99, d.visible ?? 1, Number(categoryMatch[1]))
    return json(res, { success: true })
  }
  if (categoryMatch && req.method === 'DELETE') {
    const count = db.prepare('SELECT COUNT(*) AS total FROM links WHERE category_id=?').get(Number(categoryMatch[1])).total
    if (count > 0) return json(res, { message: '该分类下还有入口，请先移动或删除入口' }, 400)
    db.prepare('DELETE FROM categories WHERE id=?').run(Number(categoryMatch[1]))
    return json(res, { success: true })
  }
  if (req.method === 'POST' && pathname === '/api/admin/links') {
    const d = await body(req)
    const info = db.prepare('INSERT INTO links (category_id,name,url,icon,color,description,sort,visible) VALUES (?,?,?,?,?,?,?,?)')
      .run(d.category_id, d.name, d.url, d.icon ?? 'Sparkles', d.color ?? '#4f8cff', d.description ?? '', d.sort ?? 99, d.visible ?? 1)
    return json(res, { id: info.lastInsertRowid })
  }
  const linkMatch = pathname.match(/^\/api\/admin\/links\/([0-9]+)$/)
  if (linkMatch && req.method === 'PUT') {
    const d = await body(req)
    db.prepare('UPDATE links SET category_id=?,name=?,url=?,icon=?,color=?,description=?,visible=? WHERE id=?')
      .run(d.category_id, d.name, d.url, d.icon ?? 'Sparkles', d.color ?? '#4f8cff', d.description ?? '', d.visible ?? 1, Number(linkMatch[1]))
    return json(res, { success: true })
  }
  if (linkMatch && req.method === 'DELETE') {
    db.prepare('DELETE FROM links WHERE id=?').run(Number(linkMatch[1]))
    return json(res, { success: true })
  }
  if (req.method === 'PUT' && pathname === '/api/admin/links/sort') {
    const { ids = [] } = await body(req)
    const update = db.prepare('UPDATE links SET sort=? WHERE id=?')
    ids.forEach((id, index) => update.run(index + 1, id))
    return json(res, { success: true })
  }
  json(res, { message: 'Not Found' }, 404)
}

async function staticFile(res, pathname) {
  const target = pathname === '/' ? '/index.html' : pathname
  const filePath = normalize(join(root, target))
  if (!filePath.startsWith(root)) return json(res, { message: 'Forbidden' }, 403)
  const map = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }
  try {
    const file = await readFile(filePath)
    res.writeHead(200, { 'Content-Type': map[extname(filePath)] || 'application/octet-stream' })
    res.end(file)
  } catch { await staticFile(res, '/index.html') }
}

initDb()
createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`)
  if (pathname.startsWith('/api/')) return api(req, res, pathname).catch((e) => json(res, { message: e.message }, 500))
  await staticFile(res, pathname)
}).listen(port, () => console.log(`清漪导航已启动：http://localhost:${port}`))

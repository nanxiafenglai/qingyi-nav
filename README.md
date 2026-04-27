# 清漪导航

Vue 3 + Node.js + SQLite 的个人导航站 MVP。

## 本地启动
支持环境变量：

```text
PORT=5173
ADMIN_USER=admin
ADMIN_PASSWORD=admin123
```

注意：管理员账号只会在数据库里不存在管理员时初始化；如果 `data/nav.sqlite` 已存在，请在后台修改密码。



```bash
node server.js
```

打开：

```text
前台：http://localhost:5173
后台：http://localhost:5173/admin.html
登录：http://localhost:5173/login.html
```

可先复制环境变量示例：

```bash
cp .env.example .env
```

然后修改 `.env` 里的 `ADMIN_PASSWORD`。


## Docker 部署

```bash
docker compose up -d --build
```

停止：

```bash
docker compose down
```

数据会持久化到：

```text
./data/nav.sqlite
```

后台默认账号取决于首次启动时的环境变量，默认是：

```text
admin / admin123
```

首次启动会自动创建 SQLite 数据库；Docker 部署时请保留 `./data` 目录以持久化数据。

## 当前接口

```text
GET  /api/nav
POST /api/admin/login
POST /api/admin/logout
PUT  /api/admin/password
PUT  /api/admin/site-config
POST /api/admin/categories
PUT  /api/admin/categories/:id
DELETE /api/admin/categories/:id
POST /api/admin/links
PUT  /api/admin/links/:id
DELETE /api/admin/links/:id
PUT  /api/admin/links/sort
```

入口卡片在前台只负责访问；后台 `/admin.html` 中支持拖拽排序，拖动后会写回 SQLite 的 `links.sort` 字段。

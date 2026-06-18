# wx_channel_hub

`wx_channel_hub` 是从 `wx_channel/hub_server` 拆分出来的独立 Hub 服务端仓库。

它现在包含两套前端入口：

- `frontend/`: 默认前端。Vue + Vite，Hub 二进制启动后默认服务 `frontend/dist`
- `sites_hub_frontend/`: 独立 Sites / Vinext 控制台。通过 `HUB_API_BASE` 连接 Hub API

## 仓库结构

- `main.go`: Hub HTTP / WebSocket 入口
- `controllers/`, `services/`, `database/`, `middleware/`, `models/`, `ws/`: Hub 后端代码
- `frontend/`: 默认自托管前端
- `sites_hub_frontend/`: 可选独立控制台
- `scripts/`: SQL 和运维脚本
- `docs/`: 数据库管理和性能相关文档

## 运行默认 Hub

先构建默认 Vue 前端：

```bash
cd frontend
npm ci
npm run build
```

再启动 Hub：

```bash
set HUB_JWT_SECRET=0123456789abcdef0123456789abcdef
go run .
```

默认行为：

- Hub 地址: `:8080`
- 数据库路径: `hub_server.db`
- 默认前端目录: `frontend/dist`

启动后访问：

- `http://127.0.0.1:8080/`
- `http://127.0.0.1:8080/login`

## 关键环境变量

- `HUB_JWT_SECRET`: 必填，JWT 密钥
- `HUB_ADDR`: 可选，监听地址，默认 `:8080`
- `HUB_DB_PATH`: 可选，数据库路径，默认 `hub_server.db`
- `HUB_FRONTEND_DIST`: 可选，默认前端目录，默认 `frontend/dist`

## 构建与验证

后端：

```bash
go test ./...
go build ./...
```

默认前端：

```bash
cd frontend
npm run build
```

Sites 前端：

```bash
cd sites_hub_frontend
npm run lint
npm run build
```

## Sites 前端

`sites_hub_frontend/` 不是 Hub 二进制默认启动所需，但它是完整可构建的独立控制台。

本地开发通常需要：

```bash
cd sites_hub_frontend
set HUB_API_BASE=http://127.0.0.1:8080
npm install
npm run build
```

## 数据库文档

- [数据库管理功能使用指南](docs/database-management-guide.md)
- [数据库管理功能测试指南](docs/database-management-testing.md)
- [数据库性能优化指南](docs/database-performance.md)

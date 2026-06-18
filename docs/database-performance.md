# 数据库性能优化指南

## 当前状态

- 数据库类型：SQLite
- 默认数据库文件：`hub_server.db`

## 已实施的优化

### 1. WAL 模式

```sql
PRAGMA journal_mode=WAL;
```

### 2. 连接池限制

SQLite 写入并发有限，连接池需要保持保守配置。

### 3. 索引配置

按 `machine_id`、时间字段等主查询路径建立索引。

## 建议的额外优化

### 1. 增加缓存大小

```sql
PRAGMA cache_size=-64000;
```

### 2. 内存映射

```sql
PRAGMA mmap_size=268435456;
```

### 3. 定期维护

```sql
ANALYZE;
VACUUM;
```

## 执行优化

```bash
sqlite3 hub_server.db < scripts/optimize-database.sql
```

## 何时考虑迁移数据库

可关注这些信号：

- 数据库体积明显增长
- 并发用户显著增加
- 查询响应时间持续恶化
- 频繁出现 `database is locked`

## 数据归档建议

- 浏览记录保留最近 6 个月
- 下载记录保留最近 1 年
- 同步历史保留最近 3 个月

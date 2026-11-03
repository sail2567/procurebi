# ProcureBI 项目说明

个人学习 / 简历项目：面向企业大模型采购的 BI 数据智能体平台。非商业用途。

## 技术栈

Vue 3 + Vite + TypeScript + Pinia + ECharts · FastAPI · SQLAlchemy 2 async · PostgreSQL 17 · Redis · LangChain + LangGraph · DeepSeek（OpenAI 兼容接口）。

## 已实现能力

- Excel / CSV 上传后动态建表注册到 PostgreSQL `ds` schema，不依赖固定表结构。
- 数据集页「查看数据」弹窗分页浏览原始行（每页 20 行，支持页码跳转），`GET /datasets/{id}/rows` 只读查询已注册物理表。
- 上传 PDF / DOCX / TXT 合同，解析、切块、中文 bigram + IDF 检索，支持合同条款问答。
- LangGraph 问数链路：生成 SQL → 安全校验 → 只读执行 → 构建图表 → 总结；失败可重试。SQL 折叠块显示所用数据集与返回行数（超 500 行标注截断），答案正文与 SQL 均可一键复制。
- BI 报表：按字段语义自动识别账单、配额、模型清单、价目表，生成 KPI、供应商/应用/月度图表、风险洞察。
- 报表支持账单数据集切换，默认最新账期；配额表自动匹配同年度；展示当前在售模型价格结构。
- 报表期间筛选：全部账期 / 最新月份 / 上月 / 最新季度 / 上季度 / 本年度 / 自定义日期范围，KPI、图表、导出均按期间重算；带起止日期时计算上一等长周期环比（`mom`）。
- 报表下钻：点击供应商柱状图按 `provider` 重新汇总，模型图替换供应商图；可保存为报表视图。
- 预算与采购底表：识别年度预算数据集并对比期间支出（`budget`），汇总报价单 / 套餐 / 限流（`purchasing`）。
- 多币种：账单含币种列时，USD 按 `FX_USD_CNY` 折算为 CNY，报表与导出标注口径（`currency_note`）。
- 报表视图：复用 `reports` 表保存数据集 + 期间 + 供应商；管理员可见全部，viewer 仅自己。
- 上传质量：预览返回源行 / 可导入 / 空行 / 重复行 / 异常单元格与问题清单；相同 SHA-256 文件返回 409，`force=true` 可强制导入。
- 报表导出：Excel（多工作表、原生图表）与 PDF（reportlab + STSong-Light 中文），文件名带实际账期。
- 分享链接：绑定数据集、期间与供应商，可选 7 / 30 / 90 天；仅存 token SHA-256 哈希，可撤销，公开接口按 IP + token 限流并统计次数；响应带 `Referrer-Policy: no-referrer`。
- 条款引用：问数 SSE 的 `sources` 事件返回文档与页码，前端弹窗读取 `/documents/{id}/pages` 展示原文。
- 登录与权限：JWT（HttpOnly Cookie）+ bcrypt，角色 `admin` / `viewer`；不开放注册，管理员在后台创建账号；Redis 登录失败限流；禁用 / 改角色 / 重置密码后旧会话立即失效。
- 后台管理：概览、用户 CRUD、合同文档管理、审计日志查询；数据集在「数据集」页维护。
- Redis 缓存 schema；前端 Mock / 真实 API 通过 `frontend/.env.local` 切换。
- 生产部署：`docker-compose.prod.yml` + `deploy/`（nginx + FastAPI + PostgreSQL + Redis），说明见 `deploy/README.md`。

## 当前数据状态（本地库）

已上传的关键数据集：

- `bills_2026`：39,312 行，2026-01-01 ~ 2026-09-30，当前默认报表账期（当前模型：GPT-6 Astra、Claude Fable 5.1 / Opus 5.5、Gemini 4 Argon、Kimi K3 等）。
- `bills_2025`：26,280 行，2025 全年历史账单。
- `bills_dirty_sample`：60 行脏数据样本。
- `quotas` / `quotas_2026`：合同配额，报表会按账单年份选择。
- `model_catalog`：54 个 active 模型；`price_book`：含目录价/错峰价/促销价等。
- `quotes`、`subscription_plans`、`rate_limits`：报价、套餐、限流底表。

## 本地启动

```bash
# PostgreSQL + Redis（便携版）
bash scripts/start_services.sh

# 后端
cd backend
NO_PROXY='*' PYTHONIOENCODING=utf-8 .venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# 前端
npm --prefix frontend run dev -- --host 127.0.0.1
```

- 前端真实后端模式需要 `frontend/.env.local` 中 `VITE_USE_MOCK=false`；不设置时默认 Mock。
- 前端端口若 5173 被占用会自动顺延（例如 5174）。
- API 文档：http://127.0.0.1:8000/docs
- 本地首次启动会用 `.env` 的 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 创建管理员（开发环境默认为 `admin / admin123456`）。
- Mock 模式演示账号：`admin / admin123456`、`viewer / viewer123456`。
- 忘记密码：`cd backend && .venv/Scripts/python.exe -m app.cli reset-password admin`。

## 测试与构建

```bash
cd backend
NO_PROXY='*' PYTHONIOENCODING=utf-8 .venv/Scripts/python.exe -m pytest -q

npm --prefix frontend run build
```

当前状态：后端 151 个测试通过；前端构建通过。

## 关键代码

- `backend/app/agent/graph.py`：LangGraph 问数链路。
- `backend/app/services/query.py`：SQL 安全校验与只读执行。
- `backend/app/services/reports.py`：报表汇总、期间筛选（`_period_where` / `period_label`）、环比、供应商下钻、多币种折算（`_amount_expr`）、预算与采购底表、配额年度匹配、模型价格结构。
- `backend/app/services/report_views.py`：保存的报表视图（创建 / 列表 / 删除与权限）。
- `backend/app/services/report_export.py`：Excel / PDF 导出构建（含预算、采购底表工作表）。
- `backend/app/services/report_shares.py`：分享 token 生成、哈希、有效期与撤销。
- `backend/app/api/v1/reports.py` / `shared.py`：报表、导出、视图、分享接口与公开只读端点。
- `backend/app/infra/rate_limit.py`：登录与分享链接限流。
- `backend/migrations/versions/0005_report_views_quality_currency.py`：`reports.provider`、`report_shares.provider`、`datasets.content_hash` / `quality`。
- `backend/app/core/security.py`：JWT、bcrypt、认证依赖与管理员校验。
- `backend/app/services/users.py` / `backend/app/services/audit.py`：用户规则与审计。
- `backend/app/api/v1/auth.py` / `admin.py`：登录与后台管理接口。
- `backend/app/cli.py`：运维命令（重置密码）。
- `backend/app/ingest/`：Excel / 文档解析。
- `frontend/src/views/LoginView.vue` / `AdminView.vue` / `views/admin/`：登录页与后台。
- `frontend/src/stores/auth.ts` / `frontend/src/router/index.ts`：认证状态与路由守卫。
- `frontend/src/views/ReportsView.vue`：报表页、数据集 / 期间 / 供应商筛选、报表视图、导出与分享入口。
- `frontend/src/components/ReportBody.vue`：报表正文（登录页与分享页共用），含环比、预算、采购底表与下钻事件。
- `frontend/src/components/ChartRenderer.vue`：ECharts 渲染，`clickable` 时抛出 `item-click`。
- `frontend/src/components/ReportShareDialog.vue`：分享创建 / 列表 / 撤销弹窗。
- `frontend/src/components/DocumentPreviewDialog.vue`：合同原文按页预览（条款引用）。
- `frontend/src/views/SharedReportView.vue`：公开只读分享页（路由 `/share/:token`）。
- `frontend/src/api/mock/`：Mock 数据，`report-2026.json` 为 2026 报表快照。
- `deploy/`：生产 Dockerfile、nginx 配置与部署手册；`scripts/seed_demo_data.py` 批量导入示例数据。

## 约定与注意事项

- `.env` / `.env.prod` 含数据库密码、LLM API Key 和 JWT_SECRET，已被 gitignore；不要提交、不要输出密钥。
- 登录态使用 HttpOnly Cookie；写操作需 admin，读操作需登录；新增写接口要同时补审计。
- API 请求体使用 snake_case，响应使用 camelCase（Pydantic `serialization_alias`），前端 client 负责映射。
- LLM 只从后端调用，前端不接触 API Key。
- `tools/` 是便携版 PostgreSQL / Redis 与数据目录，不提交。
- Windows 下中文输出需要 `PYTHONIOENCODING=utf-8`；本机访问 LLM 需 `NO_PROXY='*'`。
- 本机 Git 仓库目前还没有提交；用户未要求时不要主动 commit / push。
- 报表 `GET /api/v1/reports/summary?dataset_id=&start_date=&end_date=&provider=`，数据集列表 `GET /api/v1/reports/datasets`，报表视图 `GET/POST /api/v1/reports/views`。
- 上传重复文件返回 409，前端通过 `ApiError.status`（`frontend/src/api/errors.ts`）识别并提供「仍然导入副本」。
- Mock 导出只有 CSV，界面在 Mock 模式显示「导出 CSV（演示）」，不要标注成 Excel / PDF。
- 导出 `GET /api/v1/reports/export?format=`；分享公开路由 `/share/:token` 使用 `meta.public + allowAuthenticated`，接口在 `/api/v1/shared/reports/{token}`。
- 分享链接只在创建时返回一次明文 token，数据库只存哈希；不要在日志或响应中回显 token。

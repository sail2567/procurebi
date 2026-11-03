export type ColumnType = 'text' | 'number' | 'date'

export interface ColumnMeta {
  name: string
  type: ColumnType
  sample: string
}

export interface ImportQuality {
  sourceRows: number
  importedRows: number
  blankRows: number
  duplicateRows: number
  invalidCells: number
  issues: string[]
}

export interface Dataset {
  id: string
  name: string
  sourceFile: string
  sheetName?: string
  rowCount: number
  columns: ColumnMeta[]
  createdAt: string
  status: 'active' | 'archived'
  ownerId?: string | null
  quality?: ImportQuality | null
}

export type CellValue = string | number | null

export interface DatasetRows {
  columns: string[]
  rows: CellValue[][]
  total: number
  offset: number
  limit: number
}

export interface TableResult {
  columns: string[]
  rows: CellValue[][]
  /** 结果超过安全上限（500 行）时由后端标记。 */
  truncated?: boolean
}

export interface DocumentItem {
  id: string
  name: string
  sourceFile: string
  docType: string
  pageCount: number
  charCount: number
  chunkCount: number
  createdAt: string
  status: 'active' | 'archived'
}

export interface PreviewResult {
  sheetName: string
  rowCount: number
  columns: ColumnMeta[]
  rows: CellValue[][]
  quality?: ImportQuality | null
}

export interface DocumentPages {
  id: string
  name: string
  pageCount: number
  pages: { page: number; content: string }[]
}

export interface ChatSource {
  documentId: string
  document: string
  page: number | null
  snippet: string
}

export interface ChartSeries {
  name: string
  data: number[]
}

export interface ChartSpec {
  type: 'bar' | 'line' | 'pie'
  title: string
  x?: string[]
  series?: ChartSeries[]
  data?: { name: string; value: number }[]
  unit?: string
}

export type ChatEvent =
  | { type: 'status'; data: { stage: string } }
  | { type: 'sql'; data: { sql: string; datasets?: string[] } }
  | { type: 'table'; data: TableResult }
  | { type: 'chart'; data: ChartSpec }
  | { type: 'text'; data: { delta: string } }
  | { type: 'sources'; data: { items: ChatSource[] } }
  | { type: 'error'; data: { message: string } }
  | { type: 'done'; data: Record<string, never> }

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sql?: string
  datasets?: string[]
  table?: TableResult
  chart?: ChartSpec
  sources?: ChatSource[]
  status?: string
  loading?: boolean
  error?: string
}

export interface ReportKpi {
  label: string
  value: string
  unit: string
  delta: string
  warn: boolean
}

export interface ReportInsight {
  title: string
  meta: string
  tag: string
}

export interface ReportDataset {
  id: string
  name: string
  sourceFile: string
  rowCount: number
  periodStart: string
  periodEnd: string
}

export interface ReportDatasetOption {
  id: string
  name: string
  rowCount: number
  periodStart: string
  periodEnd: string
}

export interface ReportCatalog {
  totalModels: number
  providerCount: number
  summary: string
  table: TableResult
}

export type Role = 'admin' | 'viewer'

export interface AuthUser {
  id: string
  username: string
  displayName: string
  role: Role
  isActive: boolean
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface AdminOverview {
  users: number
  activeUsers: number
  admins: number
  datasets: number
  activeDatasets: number
  documents: number
  auditEvents24h: number
  recentAudit: AuditLogItem[]
}

export interface AuditLogItem {
  id: string
  actorUsername: string
  action: string
  targetType: string | null
  targetId: string | null
  status: 'success' | 'failure'
  detail: Record<string, unknown> | null
  ip: string | null
  createdAt: string
}

export interface ListUsersParams {
  page?: number
  pageSize?: number
  q?: string
  role?: Role
  isActive?: boolean
}

export interface AuditLogParams {
  page?: number
  pageSize?: number
  action?: string
  status?: 'success' | 'failure'
  actor?: string
  start?: string
  end?: string
}

export interface CreateUserInput {
  username: string
  password: string
  role: Role
  displayName?: string
}

export interface UpdateUserInput {
  displayName?: string
  role?: Role
  isActive?: boolean
}

export interface ReportMom {
  previousStart: string
  previousEnd: string
  previousAmount: number
  changePct: number | null
}

export interface ReportBudget {
  summary: string
  table: TableResult
  annualTotal: number
  usedTotal: number
  usagePct: number
}

export interface ReportPurchasing {
  summary: string
  quoteTable: TableResult
  planCount: number
  rateLimitCount: number
}

export interface ReportSummary {
  generatedAt: string
  dataset: ReportDataset
  kpis: ReportKpi[]
  providerChart: ChartSpec
  appChart?: ChartSpec
  monthlyChart?: ChartSpec
  quotaTable: TableResult
  catalog?: ReportCatalog
  providerSummary: string
  appSummary: string
  monthlySummary: string
  quotaSummary: string
  insights: ReportInsight[]
  modelCount: number
  appCount: number
  providerFilter?: string | null
  mom?: ReportMom
  budget?: ReportBudget
  purchasing?: ReportPurchasing
  currencyNote?: string | null
}

export type ReportExportFormat = 'xlsx' | 'pdf'

export interface ReportExportInput {
  datasetId?: string
  startDate?: string
  endDate?: string
  provider?: string
  format: ReportExportFormat
}

export interface ReportShareInput {
  datasetId: string
  startDate?: string
  endDate?: string
  provider?: string
  expiresInDays: number
}

export interface ReportShare {
  id: string
  datasetId: string
  datasetName: string
  periodStart?: string | null
  periodEnd?: string | null
  provider?: string | null
  /** 创建时返回，列表接口为空字符串。 */
  path: string
  active: boolean
  expiresAt: string
  createdAt: string
  createdByUsername: string
  viewCount: number
  lastViewedAt?: string | null
}

export interface ReportViewInput {
  title: string
  datasetId: string
  startDate?: string
  endDate?: string
  provider?: string
}

export interface ReportView {
  id: string
  title: string
  datasetId: string
  datasetName: string
  periodStart?: string | null
  periodEnd?: string | null
  provider?: string | null
  createdByUsername: string
  createdAt: string
  updatedAt: string
}

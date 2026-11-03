import type {
  AdminOverview,
  AuditLogItem,
  AuditLogParams,
  AuthUser,
  ChatEvent,
  CreateUserInput,
  Dataset,
  DatasetRows,
  DocumentItem,
  DocumentPages,
  ListUsersParams,
  Paginated,
  PreviewResult,
  ReportDatasetOption,
  ReportExportFormat,
  ReportExportInput,
  ReportShare,
  ReportShareInput,
  ReportSummary,
  ReportView,
  ReportViewInput,
  UpdateUserInput,
} from './types'

import { ApiError } from './errors'
import { UNAUTHORIZED_EVENT } from './events'

const BASE = '/api/v1'

interface RequestOptions {
  /** 401 时通知全局登录态失效；login / me 自身除外。 */
  redirectOn401?: boolean
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: unknown }
    if (typeof payload.detail === 'string' && payload.detail) return payload.detail
    if (Array.isArray(payload.detail)) {
      const messages = payload.detail
        .map((item) => (typeof item === 'object' && item && 'msg' in item ? String(item.msg) : ''))
        .filter(Boolean)
      if (messages.length) return messages.join('；')
    }
  } catch {
    // 非 JSON 响应时忽略
  }
  return `${fallback}：${response.status}`
}

function notifyUnauthorized(options: RequestOptions) {
  if (options.redirectOn401 !== false) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }
}

async function request<T>(
  path: string,
  init: RequestInit,
  fallback: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { ...init, credentials: 'include' })
  if (!response.ok) {
    if (response.status === 401) notifyUnauthorized(options)
    throw new ApiError(await errorMessage(response, fallback), response.status)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

function jsonBody(payload: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }
}

function filenameFrom(disposition: string, fallback: string): string {
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  if (!match?.[1]) return fallback
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function download(
  path: string,
  fallbackFilename: string,
  fallbackMessage: string,
): Promise<void> {
  const response = await fetch(`${BASE}${path}`, { credentials: 'include' })
  if (!response.ok) {
    if (response.status === 401) notifyUnauthorized({})
    throw new ApiError(await errorMessage(response, fallbackMessage), response.status)
  }
  const blob = await response.blob()
  const filename = filenameFrom(
    response.headers.get('Content-Disposition') ?? '',
    fallbackFilename,
  )
  triggerDownload(blob, filename)
}

export async function listDatasets(): Promise<Dataset[]> {
  return request<Dataset[]>('/datasets', {}, '加载数据集失败')
}

export async function getDatasetRows(
  id: string,
  limit = 20,
  offset = 0,
): Promise<DatasetRows> {
  return request<DatasetRows>(
    `/datasets/${id}/rows${query({ limit, offset })}`,
    {},
    '加载数据集数据失败',
  )
}

export async function uploadDataset(file: File, force = false): Promise<Dataset> {
  const form = new FormData()
  form.append('file', file)
  return request<Dataset>(
    `/datasets${query({ force: force || undefined })}`,
    { method: 'POST', body: form },
    '上传失败',
  )
}

export async function previewDataset(file: File): Promise<PreviewResult> {
  const form = new FormData()
  form.append('file', file)
  return request<PreviewResult>(
    '/datasets/preview',
    { method: 'POST', body: form },
    '解析失败',
  )
}

export async function removeDataset(id: string): Promise<void> {
  await request<void>(`/datasets/${id}`, { method: 'DELETE' }, '删除失败')
}

export async function listDocuments(): Promise<DocumentItem[]> {
  return request<DocumentItem[]>('/documents', {}, '加载文档失败')
}

export async function uploadDocument(file: File): Promise<DocumentItem> {
  const form = new FormData()
  form.append('file', file)
  return request<DocumentItem>('/documents', { method: 'POST', body: form }, '文档解析失败')
}

export async function removeDocument(id: string): Promise<void> {
  await request<void>(`/documents/${id}`, { method: 'DELETE' }, '删除文档失败')
}

export async function getDocumentPages(id: string): Promise<DocumentPages> {
  return request<DocumentPages>(`/documents/${id}/pages`, {}, '加载文档内容失败')
}

export async function getReportSummary(
  datasetId?: string,
  startDate?: string,
  endDate?: string,
  provider?: string,
): Promise<ReportSummary> {
  return request<ReportSummary>(
    `/reports/summary${query({
      dataset_id: datasetId,
      start_date: startDate,
      end_date: endDate,
      provider,
    })}`,
    {},
    '生成报表失败',
  )
}

export async function listReportDatasets(): Promise<ReportDatasetOption[]> {
  return request<ReportDatasetOption[]>('/reports/datasets', {}, '加载账单数据集失败')
}

export async function downloadReportExport(input: ReportExportInput): Promise<void> {
  const period = [input.startDate, input.endDate].filter(Boolean).join('-')
  const filename = `procurebi-report${period ? `-${period}` : ''}.${input.format}`
  await download(
    `/reports/export${query({
      dataset_id: input.datasetId,
      start_date: input.startDate,
      end_date: input.endDate,
      provider: input.provider,
      format: input.format,
    })}`,
    filename,
    '导出报表失败',
  )
}

export async function createReportShare(input: ReportShareInput): Promise<ReportShare> {
  return request<ReportShare>(
    '/reports/shares',
    jsonBody({
      dataset_id: input.datasetId,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      provider: input.provider ?? null,
      expires_in_days: input.expiresInDays,
    }),
    '创建分享链接失败',
  )
}

export async function listReportViews(): Promise<ReportView[]> {
  return request<ReportView[]>('/reports/views', {}, '加载报表视图失败')
}

export async function createReportView(input: ReportViewInput): Promise<ReportView> {
  return request<ReportView>(
    '/reports/views',
    jsonBody({
      title: input.title,
      dataset_id: input.datasetId,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      provider: input.provider ?? null,
    }),
    '保存报表视图失败',
  )
}

export async function deleteReportView(id: string): Promise<void> {
  await request<void>(`/reports/views/${id}`, { method: 'DELETE' }, '删除报表视图失败')
}

export async function listReportShares(datasetId?: string): Promise<ReportShare[]> {
  return request<ReportShare[]>(
    `/reports/shares${query({ dataset_id: datasetId })}`,
    {},
    '加载分享链接失败',
  )
}

export async function revokeReportShare(id: string): Promise<void> {
  await request<void>(`/reports/shares/${id}`, { method: 'DELETE' }, '撤销分享链接失败')
}

export async function getSharedReport(token: string): Promise<ReportSummary> {
  return request<ReportSummary>(
    `/shared/reports/${encodeURIComponent(token)}`,
    {},
    '加载分享报表失败',
    { redirectOn401: false },
  )
}

export async function downloadSharedReportExport(
  token: string,
  format: ReportExportFormat,
): Promise<void> {
  await download(
    `/shared/reports/${encodeURIComponent(token)}/export${query({ format })}`,
    `procurebi-report.${format}`,
    '导出报表失败',
  )
}

export async function login(username: string, password: string): Promise<AuthUser> {
  return request<AuthUser>('/auth/login', jsonBody({ username, password }), '登录失败', {
    redirectOn401: false,
  })
}

export async function logout(): Promise<void> {
  await request<void>('/auth/logout', { method: 'POST' }, '退出失败', { redirectOn401: false })
}

export async function me(): Promise<AuthUser> {
  return request<AuthUser>('/auth/me', {}, '登录状态已失效', { redirectOn401: false })
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<AuthUser> {
  return request<AuthUser>(
    '/auth/change-password',
    jsonBody({ current_password: currentPassword, new_password: newPassword }),
    '修改密码失败',
  )
}

export async function getAdminOverview(): Promise<AdminOverview> {
  return request<AdminOverview>('/admin/overview', {}, '加载概览失败')
}

export async function listUsers(params: ListUsersParams = {}): Promise<Paginated<AuthUser>> {
  const search = query({
    page: params.page,
    page_size: params.pageSize,
    q: params.q,
    role: params.role,
    is_active: params.isActive,
  })
  return request<Paginated<AuthUser>>(`/admin/users${search}`, {}, '加载用户失败')
}

export async function createUser(input: CreateUserInput): Promise<AuthUser> {
  return request<AuthUser>(
    '/admin/users',
    jsonBody({
      username: input.username,
      password: input.password,
      role: input.role,
      display_name: input.displayName ?? '',
    }),
    '创建用户失败',
  )
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<AuthUser> {
  const body: Record<string, unknown> = {}
  if (input.displayName !== undefined) body.display_name = input.displayName
  if (input.role !== undefined) body.role = input.role
  if (input.isActive !== undefined) body.is_active = input.isActive
  return request<AuthUser>(
    `/admin/users/${id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    '更新用户失败',
  )
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  await request<void>(
    `/admin/users/${id}/reset-password`,
    jsonBody({ new_password: newPassword }),
    '重置密码失败',
  )
}

export async function deleteUser(id: string): Promise<void> {
  await request<void>(`/admin/users/${id}`, { method: 'DELETE' }, '删除用户失败')
}

export async function listAuditLogs(
  params: AuditLogParams = {},
): Promise<Paginated<AuditLogItem>> {
  const search = query({
    page: params.page,
    page_size: params.pageSize,
    action: params.action,
    status: params.status,
    actor: params.actor,
    start: params.start,
    end: params.end,
  })
  return request<Paginated<AuditLogItem>>(`/admin/audit-logs${search}`, {}, '加载操作日志失败')
}

export async function askQuestion(
  question: string,
  onEvent: (event: ChatEvent) => void,
  signal?: AbortSignal,
  datasetIds: string[] = [],
): Promise<void> {
  const response = await fetch(`${BASE}/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, dataset_ids: datasetIds }),
    signal,
  })
  if (!response.ok || !response.body) {
    if (response.status === 401) notifyUnauthorized({})
    throw new ApiError(await errorMessage(response, '问数请求失败'), response.status)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''

    for (const block of blocks) {
      const eventLine = block.split('\n').find((line) => line.startsWith('event:'))
      const dataLine = block.split('\n').find((line) => line.startsWith('data:'))
      if (!eventLine || !dataLine) continue

      const type = eventLine.replace('event:', '').trim() as ChatEvent['type']
      const payload = JSON.parse(dataLine.replace('data:', '').trim())
      onEvent({ type, data: payload } as ChatEvent)
    }
  }
}

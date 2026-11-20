import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import './styles.css'

type TextItem = {
  id: string
  title: string
  content: string
}

type Notice = {
  tone: 'success' | 'error' | 'info'
  text: string
} | null

const STORAGE_KEY = 'textforge-draft-v1'
const DEFAULT_RECIPIENT = 'rd02navc2@gmail.com'

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function makeDefaultItems(): TextItem[] {
  return Array.from({ length: 20 }, (_, index) => ({
    id: makeId(),
    title: `文字片段 ${String(index + 1).padStart(2, '0')}`,
    content: '',
  }))
}

function getInitialItems(): TextItem[] {
  if (typeof window === 'undefined') return makeDefaultItems()
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return makeDefaultItems()
    const parsed = JSON.parse(saved) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return makeDefaultItems()
    const validItems = parsed.filter((item): item is TextItem => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Record<string, unknown>
      return typeof candidate.id === 'string' && typeof candidate.title === 'string' && typeof candidate.content === 'string'
    })
    return validItems.length > 0 ? validItems : makeDefaultItems()
  } catch {
    return makeDefaultItems()
  }
}

function formatDate() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
}

function buildTextContent(items: TextItem[]) {
  return items
    .map((item, index) => `【${String(index + 1).padStart(2, '0')}｜${item.title}】\n${item.content.trim() || '（尚未輸入內容）'}`)
    .join('\n\n────────────────────────\n\n')
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  const paths: Record<string, ReactNode> = {
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    minus: <><path d="M5 12h14" /></>,
    maximize: <><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" /><path d="M21 16v3a2 2 0 0 1-2 2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="m8 8-5 5" /><path d="m16 8 5 5" /><path d="m8 16-5-5" /><path d="m16 16 5-5" /></>,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h5" /></>,
    spreadsheet: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h8M8 19h8M12 7v12" /></>,
    spark: <><path d="m12 3-1.4 5.6L5 10l5.6 1.4L12 17l1.4-5.6L19 10l-5.6-1.4z" /><path d="m19 16-.6 2.4L16 19l2.4.6L19 22l.6-2.4L22 19l-2.4-.6z" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    shield: <><path d="M12 3 5 6v5c0 4.4 2.9 8.3 7 10 4.1-1.7 7-5.6 7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
  }
  return <svg {...common}>{paths[name] ?? paths.info}</svg>
}

function App() {
  const [items, setItems] = useState<TextItem[]>(getInitialItems)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [recipient, setRecipient] = useState(DEFAULT_RECIPIENT)
  const [smtpPassword, setSmtpPassword] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [showMailPanel, setShowMailPanel] = useState(false)

  const activeItem = items.find((item) => item.id === activeId) ?? null
  const totalCharacters = useMemo(() => items.reduce((total, item) => total + item.content.length, 0), [items])
  const filledCount = useMemo(() => items.filter((item) => item.content.trim().length > 0).length, [items])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const updateItem = (id: string, patch: Partial<TextItem>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  const addItem = () => {
    const nextNumber = items.length + 1
    const newItem: TextItem = { id: makeId(), title: `文字片段 ${String(nextNumber).padStart(2, '0')}`, content: '' }
    setItems((current) => [...current, newItem])
    window.setTimeout(() => document.getElementById(`item-${newItem.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30)
    setNotice({ tone: 'info', text: '已在工作台末端新增一個文字片段。' })
  }

  const removeItem = (id: string) => {
    if (items.length <= 1) return
    const target = items.find((item) => item.id === id)
    if (!target) return
    if (!window.confirm(`確定要刪除「${target.title}」嗎？此操作無法復原。`)) return
    setItems((current) => current.filter((item) => item.id !== id))
    if (activeId === id) setActiveId(null)
    setNotice({ tone: 'info', text: '文字片段已刪除。' })
  }

  const downloadText = () => {
    const blob = new Blob([`TextForge 文字工作台\n匯出時間：${new Date().toLocaleString('zh-TW')}\n\n${buildTextContent(items)}`], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `textforge-${formatDate()}.txt`
    link.click()
    URL.revokeObjectURL(url)
    setNotice({ tone: 'success', text: 'TXT 文字檔已開始下載。' })
  }

  const downloadExcel = async () => {
    const XLSX = await import('xlsx')
    const rows = items.map((item, index) => ({
      序號: index + 1,
      標題: item.title,
      內容: item.content,
      字數: item.content.length,
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet['!cols'] = [{ wch: 8 }, { wch: 22 }, { wch: 72 }, { wch: 10 }]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '文字內容')
    XLSX.writeFile(workbook, `textforge-${formatDate()}.xlsx`)
    setNotice({ tone: 'success', text: 'Excel 檔案已開始下載。' })
  }

  const sendTextByEmail = async () => {
    if (!recipient.trim() || !recipient.includes('@')) {
      setNotice({ tone: 'error', text: '請輸入有效的收件信箱。' })
      return
    }
    if (!smtpPassword) {
      setNotice({ tone: 'error', text: '寄送前請輸入 Gmail 應用程式密碼。' })
      return
    }
    setIsSending(true)
    setNotice({ tone: 'info', text: '正在建立安全連線並寄送文字檔⋯' })
    try {
      const response = await fetch('/api/send-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient.trim(),
          password: smtpPassword,
          filename: `textforge-${formatDate()}.txt`,
          content: buildTextContent(items),
        }),
      })
      const result = await response.json() as { ok?: boolean; message?: string }
      if (!response.ok || !result.ok) throw new Error(result.message || '寄送失敗，請稍後再試。')
      setSmtpPassword('')
      setNotice({ tone: 'success', text: '文字檔已寄出，密碼未被保存。' })
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : '寄送失敗，請確認 Gmail 設定。' })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="app-shell">
      <aside className="side-rail">
        <div className="brand-mark" aria-label="TextForge">
          <span>TF</span>
          <i />
        </div>
        <div className="rail-label">文字工作台</div>
        <div className="rail-line" />
        <div className="rail-meta">
          <span className="status-dot" />
          <span>草稿自動保存</span>
        </div>
        <div className="rail-bottom">2026<br /><strong>TEXTFORGE</strong></div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="eyebrow"><span>01</span> YOUR EDITING DESK</div>
          <div className="top-actions">
            <span className="saved-status"><Icon name="check" size={15} /> 已保存</span>
            <button className="button button-quiet" onClick={() => setShowMailPanel((current) => !current)}>
              <Icon name="mail" size={17} /> 寄送文字檔
            </button>
          </div>
        </header>

        <section className="hero">
          <div>
            <p className="kicker">CONTENT, COMPOSED</p>
            <h3>今天的文字，<em>先放在這裡。</em></h3>
            <p className="hero-copy">把零散的句子整理成可交付的文字。每一格都能放大、編輯。</p>
          </div>
          <div className="hero-note">
            <span>現在進度</span>
            <strong>{filledCount}<small> / {items.length}</small></strong>
            <p>已填入文字片段</p>
          </div>
        </section>

        <section className="toolbar" aria-label="工作台工具列">
          <div className="toolbar-summary">
            <span className="section-index">A</span>
            <div><strong>文字片段</strong><span>{items.length} 個欄位 · {totalCharacters.toLocaleString()} 字</span></div>
          </div>
          <div className="toolbar-actions">
            <button className="button button-outline" onClick={downloadText}><Icon name="file" size={16} /> 匯出 TXT</button>
            <button className="button button-outline" onClick={downloadExcel}><Icon name="spreadsheet" size={16} /> 匯出 Excel</button>
            <button className="button button-primary" onClick={addItem}><Icon name="plus" size={17} /> 新增文字框</button>
          </div>
        </section>

        <section className="editor-grid" aria-label="文字輸入框清單">
          {items.map((item, index) => (
            <article className={`note-card ${item.content.trim() ? 'has-content' : ''}`} id={`item-${item.id}`} key={item.id}>
              <div className="note-card-head">
                <span className="note-number">{String(index + 1).padStart(2, '0')}</span>
                <input className="note-title" value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} aria-label={`文字框 ${index + 1} 標題`} />
                <button className="icon-button" onClick={() => setActiveId(item.id)} aria-label={`放大編輯 ${item.title}`} title="放大編輯"><Icon name="maximize" size={16} /></button>
              </div>
              <textarea value={item.content} onChange={(event) => updateItem(item.id, { content: event.target.value })} onFocus={() => setNotice(null)} placeholder="把想法放進這一格⋯" aria-label={`${item.title} 內容`} />
              <div className="note-card-foot">
                <span>{item.content.length} 字</span>
                <button className="text-button" onClick={() => removeItem(item.id)} disabled={items.length <= 1}>刪除 <Icon name="minus" size={14} /></button>
              </div>
            </article>
          ))}
          <button className="add-card" onClick={addItem} aria-label="新增文字框">
            <span className="add-card-icon"><Icon name="plus" size={20} /></span>
            <strong>再放一格</strong>
            <span>新增文字輸入框</span>
          </button>
        </section>

        {showMailPanel && (
          <section className="mail-panel" aria-label="寄送文字檔設定">
            <div className="mail-panel-intro">
              <div className="section-index amber">B</div>
              <div>
                <p className="kicker">SEND IT FORWARD</p>
                <h2>把文字寄到信箱</h2>
                <p>系統會將目前全部內容整理成 TXT 附件寄出。</p>
              </div>
            </div>
            <div className="mail-form">
              <label>收件信箱<input type="email" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="name@gmail.com" /></label>
              <label>Gmail 應用程式密碼<input type="password" value={smtpPassword} onChange={(event) => setSmtpPassword(event.target.value)} placeholder="只在這次寄送使用" autoComplete="new-password" /></label>
              <button className="button button-primary mail-submit" onClick={sendTextByEmail} disabled={isSending}><Icon name="mail" size={17} /> {isSending ? '寄送中⋯' : '寄送文字檔'}</button>
            </div>
            <div className="security-note"><Icon name="shield" size={18} /><p><strong>安全提醒</strong> Gmail 一般密碼可能無法用於 SMTP。建議先開啟兩步驟驗證，再建立「應用程式密碼」。密碼只會用於這次寄送，不會寫入瀏覽器或伺服器保存。</p></div>
          </section>
        )}

        <footer className="workspace-footer">
          <span><Icon name="spark" size={15} /> Keep the good lines.</span>
          <span>TextForge / personal editing desk</span>
        </footer>
      </main>

      {notice && <div className={`toast toast-${notice.tone}`} role="status"><Icon name={notice.tone === 'success' ? 'check' : notice.tone === 'error' ? 'info' : 'spark'} size={17} /><span>{notice.text}</span><button onClick={() => setNotice(null)} aria-label="關閉提示"><Icon name="close" size={15} /></button></div>}

      {activeItem && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveId(null) }}>
          <div className="focus-modal" role="dialog" aria-modal="true" aria-labelledby="focus-title">
            <div className="focus-head">
              <div><span className="note-number">{String(items.findIndex((item) => item.id === activeItem.id) + 1).padStart(2, '0')}</span><span className="focus-eyebrow">FOCUS EDITOR</span><h2 id="focus-title">{activeItem.title}</h2></div>
              <button className="icon-button close-button" onClick={() => setActiveId(null)} aria-label="關閉放大編輯"><Icon name="close" size={19} /></button>
            </div>
            <textarea autoFocus value={activeItem.content} onChange={(event) => updateItem(activeItem.id, { content: event.target.value })} placeholder="在這裡專心寫下完整內容⋯" />
            <div className="focus-foot"><span>{activeItem.content.length} 字 · 自動保存中</span><button className="button button-primary" onClick={() => setActiveId(null)}>完成編輯 <Icon name="arrow" size={16} /></button></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

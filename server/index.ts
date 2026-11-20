import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import nodemailer from 'nodemailer'
import { createServer as createViteServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const port = Number(process.env.PORT || 3000)
const app = express()

app.disable('x-powered-by')
app.use(express.json({ limit: '600kb' }))

app.get('/api/health', (_request, response) => response.json({ ok: true }))

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const safeFilename = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 100) || 'textforge.txt'

app.post('/api/send-text', async (request, response) => {
  const body = request.body as { to?: unknown; password?: unknown; filename?: unknown; content?: unknown }
  const to = typeof body.to === 'string' ? body.to.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const content = typeof body.content === 'string' ? body.content : ''
  const filename = typeof body.filename === 'string' ? safeFilename(body.filename) : 'textforge.txt'

  if (!isValidEmail(to)) return response.status(400).json({ ok: false, message: '請輸入有效的收件信箱。' })
  if (!password) return response.status(400).json({ ok: false, message: '請輸入 Gmail 應用程式密碼。' })
  if (!content.trim()) return response.status(400).json({ ok: false, message: '目前沒有可寄送的文字內容。' })
  if (content.length > 450_000) return response.status(413).json({ ok: false, message: '文字內容過大，請分批寄送。' })

  const sender = process.env.GMAIL_SENDER || 'rd02navc@gmail.com'
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: sender, pass: password },
  })

  try {
    await transporter.sendMail({
      from: sender,
      to,
      subject: `TextForge 文字檔｜${new Date().toLocaleDateString('zh-TW')}`,
      text: '這封信由 TextForge 文字工作台寄出，文字內容請見附件。',
      attachments: [{ filename, content, contentType: 'text/plain; charset=utf-8' }],
    })
    return response.json({ ok: true, message: '文字檔已寄出。' })
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'SMTP_ERROR'
    console.error(`[send-text] Gmail delivery failed: ${code}`)
    const raw = error instanceof Error ? error.message.toLowerCase() : ''
    const message = raw.includes('authentication') || raw.includes('invalid login') || raw.includes('535')
      ? 'Gmail 驗證失敗。請確認你輸入的是應用程式密碼，而不是一般帳戶密碼。'
      : '寄送失敗，請稍後再試或確認 Gmail 的 SMTP 設定。'
    return response.status(502).json({ ok: false, message })
  } finally {
    transporter.close()
  }
})

const isProduction = process.env.NODE_ENV === 'production'
if (!isProduction) {
  const vite = await createViteServer({
    root,
    server: { middlewareMode: true },
    appType: 'spa',
  })
  app.use(vite.middlewares)
} else {
  app.use(express.static(path.join(root, 'dist')))
  app.use((_request, response) => response.sendFile(path.join(root, 'dist', 'index.html')))
}

app.listen(port, '0.0.0.0', () => {
  console.log(`TextForge listening on http://0.0.0.0:${port}`)
})

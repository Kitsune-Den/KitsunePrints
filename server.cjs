/**
 * KitsunePrints Express Server
 *
 * Serves the Vite-built frontend. Unlike KitsunePaint, this tool has no
 * server-side image processing ~ all composition and zip generation runs
 * in the browser. The server's only job is to ship dist/, serve the
 * static KitsunePrints.dll under /reference/, and keep a small build
 * counter for the public stats line.
 */

const express = require('express')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 9003
const LOG_PATH = path.join(__dirname, 'build-log.jsonl')

app.use(express.json({ limit: '4kb' }))

// Serve static frontend
app.use(express.static(path.join(__dirname, 'dist')))

/**
 * POST /api/built
 *
 * Fire-and-forget ping the client sends after successfully generating a
 * pack zip. Logs only an anonymous timestamp + slot count ~ no images,
 * no filenames, no IP, no user data.
 */
app.post('/api/built', (req, res) => {
  try {
    const slots = Number.isInteger(req.body?.slots) ? req.body.slots : null
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      slots,
    })
    fs.appendFileSync(LOG_PATH, entry + '\n')
  } catch (_) {
    // Non-critical; never block the client.
  }
  res.json({ ok: true })
})

/**
 * GET /api/stats
 *
 * Returns the cumulative build count.
 */
app.get('/api/stats', (_req, res) => {
  if (!fs.existsSync(LOG_PATH)) {
    return res.json({ totalBuilds: 0 })
  }
  try {
    const lines = fs.readFileSync(LOG_PATH, 'utf-8').trim().split('\n').filter(Boolean)
    res.json({ totalBuilds: lines.length })
  } catch (_) {
    res.json({ totalBuilds: 0 })
  }
})

// SPA fallback: any non-asset path returns index.html so client-side
// routing (/, /app, /terms) works on direct navigation / refresh.
app.get(/^(?!\/assets|\/reference|\/frames|\/screenshots|\/api).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`🐱 KitsunePrints listening on http://localhost:${PORT}`)
})

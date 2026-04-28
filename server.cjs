/**
 * KitsunePrints Express Server
 *
 * Serves the Vite-built frontend. Unlike KitsunePaint, this tool has no
 * server-side image processing ~ all composition and zip generation runs
 * in the browser. The server's only job is to ship dist/ + the static
 * KitsunePrints.dll under /reference/.
 *
 * Could in theory be replaced with pure Apache static hosting; keeping
 * Express around for parity with KitsunePaint's deploy model and to leave
 * room for future endpoints (build counter, etc.).
 */

const express = require('express')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 9003

// Serve static frontend
app.use(express.static(path.join(__dirname, 'dist')))

// SPA fallback: any non-asset path returns index.html so client-side
// routing (/, /app, /terms) works on direct navigation / refresh.
app.get(/^(?!\/assets|\/reference|\/frames|\/screenshots).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`🐱 KitsunePrints listening on http://localhost:${PORT}`)
})

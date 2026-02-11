// Build statico per Netlify: genera HTML + copia file statici
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'fs'

const source = readFileSync('src/index.tsx', 'utf-8')

// Estrai HTML tra i backtick delle funzioni template
function extractTemplate(src, funcName) {
  const startMarker = `function ${funcName}(): string {\n  return \``
  const startIdx = src.indexOf(startMarker)
  if (startIdx === -1) {
    console.error(`ERRORE: ${funcName}() non trovata`)
    process.exit(1)
  }
  const htmlStart = startIdx + startMarker.length
  const endMarker = '`\n}'
  const htmlEnd = src.indexOf(endMarker, htmlStart)
  if (htmlEnd === -1) {
    console.error(`ERRORE: fine di ${funcName}() non trovata`)
    process.exit(1)
  }
  return src.slice(htmlStart, htmlEnd)
}

const loginHTML = extractTemplate(source, 'loginPage')
const dashboardHTML = extractTemplate(source, 'dashboardPage')

// Pulisci e prepara dist/
mkdirSync('dist', { recursive: true })
cpSync('public/static', 'dist/static', { recursive: true })

// Copia favicon
try { cpSync('public/favicon.svg', 'dist/favicon.svg') } catch(e) {}

// Crea _redirects (più affidabile di netlify.toml per i proxy a Functions)
const redirects = [
  '/login  /login.html  200',
  '/dashboard  /dashboard.html  200',
  '/api/*  /.netlify/functions/:splat  200!',
].join('\n')
writeFileSync('dist/_redirects', redirects)

// Scrivi pagine HTML
writeFileSync('dist/index.html', loginHTML)
writeFileSync('dist/login.html', loginHTML)  
writeFileSync('dist/dashboard.html', dashboardHTML)

console.log('Build Netlify completato:')
console.log(`  dist/index.html     (${loginHTML.length} bytes)`)
console.log(`  dist/dashboard.html (${dashboardHTML.length} bytes)`)
console.log('  dist/static/*')

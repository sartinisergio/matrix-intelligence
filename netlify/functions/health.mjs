export default async (req) => {
  return new Response(JSON.stringify({
    status: 'ok',
    version: '0.1.0',
    name: 'MATRIX Intelligence'
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

export const config = { path: '/api/health' }

export default async (req) => {
  return new Response(JSON.stringify({
    status: 'ok',
    version: '0.1.0',
    name: 'MATRIX Intelligence',
    platform: 'netlify'
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}

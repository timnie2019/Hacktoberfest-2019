// Dating Profile AI — local proxy server
// Usage: node server.js
// Then open: http://localhost:3000
//
// Optional: set your API key as env var so you don't have to paste it every time:
//   ANTHROPIC_API_KEY=sk-ant-... node server.js

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT    = 3000;
const ENV_KEY = process.env.ANTHROPIC_API_KEY || '';

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Serve the HTML app
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.writeHead(200);
    res.end(html);
    return;
  }

  // Proxy POST /api/chat → Anthropic
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const apiKey = req.headers['x-api-key'] || ENV_KEY;
      if (!apiKey) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'No API key provided. Enter it in the app or set ANTHROPIC_API_KEY env var.' } }));
        return;
      }

      const opts = {
        hostname: 'api.anthropic.com',
        path:     '/v1/messages',
        method:   'POST',
        headers:  {
          'Content-Type':      'application/json',
          'Content-Length':    Buffer.byteLength(body),
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01'
        }
      };

      const proxy = https.request(opts, upstream => {
        res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json' });
        upstream.pipe(res);
      });

      proxy.on('error', err => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: `Proxy error: ${err.message}` } }));
      });

      proxy.write(body);
      proxy.end();
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');

}).listen(PORT, () => {
  console.log('');
  console.log('  💘 Dating Profile AI is running!');
  console.log(`  Open: http://localhost:${PORT}`);
  console.log('');
  if (ENV_KEY) {
    console.log('  API key: loaded from ANTHROPIC_API_KEY env var');
  } else {
    console.log('  API key: paste it into the app (or restart with ANTHROPIC_API_KEY=sk-ant-...)');
  }
  console.log('');
});

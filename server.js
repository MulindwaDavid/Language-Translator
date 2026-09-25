const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
loadEnvironment(path.join(root, '.env'));
const port = Number(process.env.PORT) || 3000;
const fallbackFasiriUrl = 'https://api.fasiri-ai.com/api/v1/translate';
const fasiriUrl = resolveFasiriUrl();
const supportedLanguages = [
  { code: 'lug', name: 'Luganda' },
  { code: 'nyn', name: 'Runyankore' },
  { code: 'sw', name: 'Kiswahili' }
];
const contentTypes = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.jpeg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8' };

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/health') return sendJson(res, 200, { message: 'Server is healthy.' });
  if (req.url === '/api/languages') return sendJson(res, 200, { source: { code: 'en', name: 'English' }, targets: supportedLanguages });
  if (req.url === '/api/translate' && req.method === 'POST') {
    try {
      const body = await readJson(req);
      const text = String(body.text || '').trim();
      const targetLang = String(body.target_lang || '').trim();
      if (!text || !targetLang) return sendJson(res, 400, { error: 'Text and a target language are required.' });
      if (text.length > 5000) return sendJson(res, 400, { error: 'Text must be 5,000 characters or fewer.' });
      if (!supportedLanguages.some(language => language.code === targetLang)) return sendJson(res, 400, { error: 'That target language is not supported.' });
      if (!process.env.FASIRI_API_KEY || process.env.FASIRI_API_KEY.includes('replace_with')) return sendJson(res, 500, { error: 'Add your FASIRI_API_KEY to .env before translating.' });
      const requestBody = { text, source_lang: String(body.source_lang || '').trim() || undefined, target_lang: targetLang };
      if (targetLang === 'sw') {
        const kiswahiliText = await translateKiswahili(text);
        if (kiswahiliText) return sendJson(res, 200, { translated_text: kiswahiliText, provider: 'mymemory' });
      }
      let apiResponse = await fetch(fasiriUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.FASIRI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

        if (!apiResponse.ok) {
          const retryResponse = await fetch(fasiriUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.FASIRI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
          if (retryResponse.ok || fasiriUrl === fallbackFasiriUrl) apiResponse = retryResponse;
        }

        if (!apiResponse.ok && fasiriUrl !== fallbackFasiriUrl) {
          apiResponse = await fetch(fallbackFasiriUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.FASIRI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
      }

      const data = await apiResponse.json().catch(() => ({}));
        if (!apiResponse.ok) return sendJson(res, apiResponse.status, { error: getApiError(data) });
      const translatedText = data.translated_text || data.translation || data.text;
      if (!translatedText) return sendJson(res, 502, { error: 'Fasiri returned no translated text.' });
      return sendJson(res, 200, { translated_text: translatedText, provider: data.provider });
    } catch (error) { return sendJson(res, 500, { error: error.message || 'Unable to reach Fasiri.' }); }
  }
  const requestedPath = req.url === '/' ? '/index.html' : decodeURIComponent(req.url);
  const filePath = path.resolve(root, `.${requestedPath}`);
  if (!filePath.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, (error, file) => {
    if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); return res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error'); }
    res.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' }); res.end(file);
  });
});
server.listen(port, () => console.log(`Fasiri Translate is running at http://localhost:${port}`));
  function getApiError(data) {
    if (data.detail && typeof data.detail === 'object') return data.detail.message || data.detail.error || 'The translation service rejected this request.';
    return data.detail || data.message || data.error || 'The translation service could not translate this request.';
  }


function loadEnvironment(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}
function resolveFasiriUrl() {
  const configuredUrl = (process.env.FASIRI_TRANSLATE_URL || process.env.FASIRI_API_ENDPOINT || '').trim().replace(/\/+$/, '');
  return configuredUrl || 'https://api.fasiri-ai.com/api/v1/translate';
}
async function translateKiswahili(text) {
  try {
    const url = new URL('https://api.mymemory.translated.net/get');
    url.searchParams.set('q', text);
    url.searchParams.set('langpair', 'en|sw');
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.responseStatus === 200 && data.responseData?.translatedText ? data.responseData.translatedText : null;
  } catch {
    return null;
  }
}
function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => { body += chunk; if (body.length > 20_000) request.destroy(); });
    request.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid request.')); } });
    request.on('error', reject);
  });
}
function sendJson(response, status, data) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(data)); }

const supportedLanguages = [
  { code: 'lug', name: 'Luganda' },
  { code: 'nyn', name: 'Runyankore' },
  { code: 'sw', name: 'Kiswahili' }
];

exports.handler = async (event) => {
  if (event.httpMethod === 'GET' && event.path.endsWith('/languages')) {
    return json(200, { source: { code: 'en', name: 'English' }, targets: supportedLanguages });
  }

  if (event.httpMethod !== 'POST' || !event.path.endsWith('/translate')) {
    return json(404, { error: 'API route not found.' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const text = String(body.text || '').trim();
    const targetLang = String(body.target_lang || '').trim();
    if (!text || !targetLang) return json(400, { error: 'Text and a target language are required.' });
    if (text.length > 5000) return json(400, { error: 'Text must be 5,000 characters or fewer.' });
    if (!supportedLanguages.some(language => language.code === targetLang)) return json(400, { error: 'That target language is not supported.' });
    if (!process.env.FASIRI_API_KEY) return json(500, { error: 'The FASIRI_API_KEY environment variable is missing on Netlify.' });

    if (targetLang === 'sw') {
      const kiswahiliText = await translateKiswahili(text);
      if (kiswahiliText) return json(200, { translated_text: kiswahiliText, provider: 'mymemory' });
    }

    const requestBody = { text, source_lang: String(body.source_lang || '').trim() || undefined, target_lang: targetLang };
    let response = await requestTranslation(requestBody);
    if (!response.ok) response = await requestTranslation(requestBody);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return json(response.status, { error: getApiError(data) });

    const translatedText = data.translated_text || data.translation || data.text;
    if (!translatedText) return json(502, { error: 'The translation service returned no translated text.' });
    return json(200, { translated_text: translatedText, provider: data.provider });
  } catch (error) {
    return json(500, { error: error.message || 'Unable to reach the translation service.' });
  }
};

async function requestTranslation(body) {
  return fetch(process.env.FASIRI_TRANSLATE_URL || process.env.FASIRI_API_ENDPOINT || 'https://api.fasiri-ai.com/api/v1/translate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.FASIRI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
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

function getApiError(data) {
  if (data.detail && typeof data.detail === 'object') return data.detail.message || data.detail.error || 'The translation service rejected this request.';
  return data.detail || data.message || data.error || 'The translation service could not translate this request.';
}

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
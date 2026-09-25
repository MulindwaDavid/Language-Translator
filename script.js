const form = document.querySelector('#translation-form');
const sourceLanguage = document.querySelector('#source-lang');
const targetLanguage = document.querySelector('#target-lang');
const chatMessages = document.querySelector('#chat-messages');
const sourceText = document.querySelector('#source-text');
const submit = document.querySelector('#translate-button');
const swapButton = document.querySelector('#swap-languages');

loadLanguages();

if (swapButton) {
  swapButton.addEventListener('click', () => {
    [sourceLanguage.value, targetLanguage.value] = [targetLanguage.value, sourceLanguage.value];
  });
}

sourceLanguage.value = 'en';
sourceLanguage.disabled = true;

async function loadLanguages() {
  try {
    const response = await fetch('/api/languages');
    if (!response.ok) return;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return;
    const data = await response.json();
    if (!Array.isArray(data.targets) || !data.targets.length) return;
    targetLanguage.replaceChildren(...data.targets.map(language => new Option(language.name, language.code)));
    targetLanguage.value = data.targets[0].code;
  } catch {
    // Keep the server-rendered options when the language list cannot be loaded.
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = sourceText.value.trim();
  if (!text) return;
  appendMessage('user', text);
  sourceText.value = '';
  submit.disabled = true;
  submit.textContent = '…';
  try {
    const response = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, source_lang: sourceLanguage.value, target_lang: targetLanguage.value }) });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : {};
    if (!response.ok) throw new Error(data.error || 'Translation could not be completed.');
    appendMessage('assistant', data.translated_text || 'I could not translate that text.');
  } catch (error) {
    appendMessage('assistant', error.message || 'I could not translate that text.');
  } finally {
    submit.disabled = false;
    submit.textContent = 'Send';
    sourceText.focus();
  }
});

function appendMessage(role, text) {
  chatMessages.querySelector('.empty-state')?.remove();
  const message = document.createElement('p');
  message.className = `chat-message ${role}`;
  message.textContent = text;
  chatMessages.append(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

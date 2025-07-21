/* global LanguageModel */

import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { _createP, _downloadMarkdownAutomatically, _downloadScreenshotAutomatically, _getPageHTML, _promifySendMessage } from '../lib/util';

const inputPrompt = document.body.querySelector('#input-prompt');
const buttonPrompt = document.body.querySelector('#button-prompt');
const buttonReset = document.body.querySelector('#button-reset');
const elementResponse = document.body.querySelector('#response');
const elementLoading = document.body.querySelector('#loading');
const elementError = document.body.querySelector('#error');
const sliderTemperature = document.body.querySelector('#temperature');
const sliderTopK = document.body.querySelector('#top-k');
const labelTemperature = document.body.querySelector('#label-temperature');
const labelTopK = document.body.querySelector('#label-top-k');

let session;

async function runPrompt(prompt, params) {
  try {
    if (!session) session = await LanguageModel.create(params);
    return session.prompt(prompt);
  } catch (e) {
    reset();
    throw e;
  }
}

async function reset() {
  if (session) {
    session.destroy();
  }
  session = null;
}

async function initDefaults() {
  const defaults = await LanguageModel.params();
  if (!('LanguageModel' in self)) {
    showResponse('Model not available');
    return;
  }
  sliderTemperature.value = defaults.defaultTemperature;
  // Pending https://issues.chromium.org/issues/367771112.
  // sliderTemperature.max = defaults.maxTemperature;
  if (defaults.defaultTopK > 3) {
    // limit default topK to 3
    sliderTopK.value = 3;
    labelTopK.textContent = 3;
  } else {
    sliderTopK.value = defaults.defaultTopK;
    labelTopK.textContent = defaults.defaultTopK;
  }
  sliderTopK.max = defaults.maxTopK;
  labelTemperature.textContent = defaults.defaultTemperature;
}

initDefaults();

buttonReset.addEventListener('click', () => {
  hide(elementLoading);
  hide(elementError);
  hide(elementResponse);
  reset();
  buttonReset.setAttribute('disabled', '');
});

sliderTemperature.addEventListener('input', (event) => {
  labelTemperature.textContent = event.target.value;
  reset();
});

sliderTopK.addEventListener('input', (event) => {
  labelTopK.textContent = event.target.value;
  reset();
});

inputPrompt.addEventListener('input', () => {
  if (inputPrompt.value.trim()) {
    buttonPrompt.removeAttribute('disabled');
  } else {
    buttonPrompt.setAttribute('disabled', '');
  }
});

buttonPrompt.addEventListener('click', async () => {
  const prompt = inputPrompt.value.trim();
  showLoading();
  try {
    const params = {
      initialPrompts: [
        { role: 'system', content: 'You are a helpful and friendly assistant.' },
        { role: 'assistant', content: 'Summarize the main points of this page.' }
      ],
      temperature: sliderTemperature.value,
      topK: sliderTopK.value
    };
    const response = await runPrompt(prompt, params);
    showResponse(response);
  } catch (e) {
    showError(e);
  }
});

function showLoading() {
  buttonReset.removeAttribute('disabled');
  hide(elementResponse);
  hide(elementError);
  show(elementLoading);
}

function showResponse(response) {
  hide(elementLoading);
  show(elementResponse);
  elementResponse.innerHTML = DOMPurify.sanitize(marked.parse(response));
}

function showError(error) {
  show(elementError);
  hide(elementResponse);
  hide(elementLoading);
  elementError.textContent = error;
}

function show(element) {
  element.removeAttribute('hidden');
}

function hide(element) {
  element.setAttribute('hidden', '');
}


document.getElementById('button-parse').addEventListener('click', async () => {
  // const btn = document.getElementById('button-parse');
  // btn.disabled = true;
  // btn.textContent = 'Elaborando...';
  const status = document.getElementById('status');
  status.textContent = 'Elaborazione in corso...';

  try {
    const html = await _getPageHTML();
    console.log(html)
    const [responseScreenshot, pageContentMDServiceWorker, pageContentMDClient] = await Promise.all([
      _promifySendMessage("screenshot"),
      _promifySendMessage("convertToMarkdownSW", html),
      _promifySendMessage("convertToMarkdownInContentScript")
    ]);

    console.log("Risposta screenshot:", responseScreenshot);
    console.log("Risposta Markdown Service Worker:", pageContentMDServiceWorker);
    console.log("Risposta Markdown Content Script:", pageContentMDClient);

    if (responseScreenshot && responseScreenshot.success) {
      status.appendChild(_createP('Screenshot: ok ✅'));
      _downloadScreenshotAutomatically(responseScreenshot.screenshotUrl);
    } else {
      status.appendChild(_createP('Errore screenshot: ' + (responseScreenshot?.error + " ❌" || "Errore sconosciuto ❌")));
    }

    if (pageContentMDServiceWorker && pageContentMDServiceWorker.success) {
      if (pageContentMDServiceWorker.markdown) {
        status.appendChild(_createP('Markdown convertito con successo (Service Worker) ✅'));
        _downloadMarkdownAutomatically(pageContentMDServiceWorker.markdown);
        // set markdown to the input field
        const markdownInput = document.getElementById('input-prompt');
        markdownInput.value = pageContentMDServiceWorker.markdown;
      }
    } else {
      status.appendChild(_createP('Errore conversione Markdown: ' + (pageContentMDServiceWorker?.error + " ❌" || "Errore sconosciuto ❌")));
    }

    if (pageContentMDClient && pageContentMDClient.success) {
      if (pageContentMDClient.markdown) {
        status.appendChild(_createP('Markdown convertito con successo (Content Script) ✅'));
        _downloadMarkdownAutomatically(pageContentMDClient.markdown);
      }
    } else {
      status.appendChild(_createP('Errore conversione Markdown (Content Script): ' + (pageContentMDClient?.error + " ❌" || "Errore sconosciuto ❌")));
    }

  } catch (error) {
    console.error("Errore durante l'elaborazione:", error);
    status.appendChild(_createP('Errore generale: ' + (error.message || "Errore sconosciuto ❌")));
    status.style.color = '#f44336';
  } finally {
    // status.textContent = 'Elaborazione completata.';
    // status.style.color = '#4CAF50'; // Verde per successo
  }
});
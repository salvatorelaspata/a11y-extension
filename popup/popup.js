document.getElementById('elaborate').addEventListener('click', async () => {
  const btn = document.getElementById('elaborate');
  btn.disabled = true;
  btn.textContent = 'Elaborando...';
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
    } else {
      status.appendChild(_createP('Errore screenshot: ' + (responseScreenshot?.error + " ❌" || "Errore sconosciuto ❌")));
    }

    if (pageContentMDServiceWorker && pageContentMDServiceWorker.success) {
      status.appendChild(_createP('Markdown convertito con successo (Service Worker) ✅'));
      const markdownToUse = pageContentMDServiceWorker.markdown;

      if (markdownToUse) {
        // try { await navigator.clipboard.writeText(markdownToUse) }
        // catch (clipboardError) { status.appendChild(_createP('Conversione ok, ma errore copia clipboard ⚠️')) }
        _downloadMarkdownAutomatically(markdownToUse);
      }
    } else {
      status.appendChild(_createP('Errore conversione Markdown: ' + (pageContentMDServiceWorker?.error + " ❌" || "Errore sconosciuto ❌")));
    }

    if (pageContentMDClient && pageContentMDClient.success) {
      status.appendChild(_createP('Markdown convertito con successo (Content Script) ✅'));
      const markdownToUseClient = pageContentMDClient.markdown;

      if (markdownToUseClient) {
        // try { await navigator.clipboard.writeText(markdownToUseClient) }
        // catch (clipboardError) { status.appendChild(_createP('Conversione ok, ma errore copia clipboard (Content Script) ⚠️')); }
        _downloadMarkdownAutomatically(markdownToUseClient);
      }
    } else {
      status.appendChild(_createP('Errore conversione Markdown (Content Script): ' + (pageContentMDClient?.error + " ❌" || "Errore sconosciuto ❌")));
    }

  } catch (error) {
    console.error("Errore durante l'elaborazione:", error);
    status.appendChild(_createP('Errore generale: ' + (error.message || "Errore sconosciuto ❌")));
    status.style.color = '#f44336';
  } finally {
    // Riabilita il pulsante
    btn.disabled = false;
    btn.textContent = 'Elabora Pagina';
  }
});

document.getElementById('ascolta').addEventListener('click', () => {
  const btn = document.getElementById('ascolta');
  const status = document.getElementById('status');

  btn.disabled = true;
  btn.textContent = 'Parlando...';
  status.appendChild(_createP('Riproduzione audio in corso...'));

  const textToSpeak = "Ciao mondo! Questa è una prova del sistema text-to-speech dell'estensione di accessibilità.";

  chrome.tts.speak(textToSpeak, {
    lang: 'it-IT',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  }, () => {
    btn.disabled = false;
    btn.textContent = 'Ascolta!';

    if (chrome.runtime.lastError) {
      console.error("Errore TTS:", chrome.runtime.lastError.message);
      status.appendChild(_createP('Errore riproduzione audio ❌'));
      status.style.color = '#f44336';
    } else {
      status.appendChild(_createP('Riproduzione completata ✅'));
    }
  });
});

// Funzione per ottenere l'HTML della pagina attiva
async function _getPageHTML() {
  return new Promise((resolve, reject) => {
    // Ottieni il tab attivo
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!tabs[0]) {
        reject(new Error('Nessun tab attivo trovato'));
        return;
      }

      // Inietta uno script nel tab attivo per ottenere l'HTML
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          return document.documentElement.outerHTML;
        }
      }, (results) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (results && results[0] && results[0].result) {
          resolve(results[0].result);
        } else {
          reject(new Error('Nessun risultato ottenuto dallo script'));
        }
      });
    });
  });
}

function _promifySendMessage(action, html, args = []) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, html, arguments: args }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

function _createP(text) {
  const p = document.createElement('p');
  p.textContent = text;
  p.style.margin = '2px 0';
  p.style.fontSize = '12px';
  return p;
}

function _downloadMarkdownAutomatically(markdownContent) {
  const blob = new Blob([markdownContent], { type: 'text/markdown' });
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = `page-content-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.md`;
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(downloadLink.href);
}

function _downloadScreenshotAutomatically(screenshotUrl) {
  const downloadLink = document.createElement('a');
  downloadLink.href = screenshotUrl;
  downloadLink.download = `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}
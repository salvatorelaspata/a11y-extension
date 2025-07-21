export async function _getPageHTML() {
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

export function _promifySendMessage(action, html, args = []) {
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

export function _createP(text) {
  const p = document.createElement('p');
  p.textContent = text;
  p.style.margin = '2px 0';
  p.style.fontSize = '12px';
  return p;
}

export function _downloadMarkdownAutomatically(markdownContent) {
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

export function _downloadScreenshotAutomatically(screenshotUrl) {
  const downloadLink = document.createElement('a');
  downloadLink.href = screenshotUrl;
  downloadLink.download = `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}
import { convertHtmlToMarkdownInPage, htmlToMarkdownRegex } from "./lib/util";

console.log("Service Worker avviato");

chrome.runtime.onInstalled.addListener(({ reason }) => {
  console.log("Service Worker installato o aggiornato", reason);
  if (reason === 'install') {
    console.log("Estensione installata per la prima volta");
  } else if (reason === 'update') {
    console.log("Estensione aggiornata");
  } else {
    console.log("Service Worker avviato per un altro motivo:", reason);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Ricevuto messaggio:", request);
  if (request.action === "screenshot") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (screenshotUrl) => {
      if (chrome.runtime.lastError) {
        console.log("Errore durante la cattura dello screenshot:", chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      console.log("Screenshot catturato!");
      sendResponse({ success: true, screenshotUrl: screenshotUrl });
    });
    return true;

  } else if (request.action === 'convertToMarkdownSW') {
    try {
      const regexMarkdown = htmlToMarkdownRegex(request.html);
      if (!regexMarkdown) {
        throw new Error('Conversione Markdown fallita');
      }
      console.log('Conversione HTML->Markdown richiesta nel service worker (regex)');
      sendResponse({
        success: true,
        markdown: regexMarkdown,
        method: 'regex'
      });
    } catch (error) {
      console.log('Errore nella conversione:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  } else if (request.action === 'convertToMarkdownInContentScript') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log("Richiesta di conversione Markdown in content script");
      if (chrome.runtime.lastError || !tabs[0]) {
        sendResponse({ success: false, error: 'Nessun tab attivo' });
        return;
      }

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: convertHtmlToMarkdownInPage
      }, (results) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }

        if (results && results[0] && results[0].result) {
          console.log("Markdown convertito con successo in content script:", results[0].result);
          sendResponse({
            success: true,
            markdown: results[0].result,
            method: 'contentScript'
          });
        } else {
          console.log("Nessun risultato dalla conversione in content script");
          sendResponse({ success: false, error: 'Nessun risultato dalla conversione' });
        }
      });
    });
    return true;
  } else if (request.action === "getInputs") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs[0]) {
        sendResponse({ success: false, error: 'Nessun tab attivo' });
        return;
      }
      console.log("Richiesta di ricerca degli input nella pagina");
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: findInputs
      }, (results) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        if (results) {
          sendResponse({
            success: true,
            inputs: results
          });
        } else {
          sendResponse({ success: false, error: 'Nessun input trovato nella pagina' });
        }
      })
    });

    return true;
  }
});

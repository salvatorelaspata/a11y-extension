import { createP, getPageHTML, promifySendMessage } from '../lib/util';

const buttonParse = document.body.querySelector('#button-parse');
const buttonInteract = document.body.querySelector('#button-interact');

const responseMarkdown = document.body.querySelector('#response');
const responseMarkdown2 = document.body.querySelector('#response2');
const screenshotElement = document.body.querySelector('#screenshot');

buttonInteract.addEventListener('click', async () => {
  buttonInteract.disabled = true;
  buttonInteract.textContent = 'Interacting...';
  const status = document.getElementById('status');
  status.textContent = 'Interacting with the page...';
  try {
    const inputList = document.getElementById('input-list');
    const html = await getPageHTML();
    const response = await promifySendMessage("getInputs", { html });
    console.log("Inputs from content script:", response);
    if (response.success && response.inputs && response.inputs.length > 0) {
      inputList.innerHTML = ''; // Pulisce la lista esistente
      response.inputs[0].result.forEach(input => {
        const li = document.createElement('li');
        li.textContent = `${input.name || input.id} (${input.type}): ${input.value}`;
        // insert text into input field
        // send message to content script to fill the input
        li.addEventListener('click', async () => {
          console.log("🚀 Popup - Tentativo di riempire input:", input);

          try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log("📋 Popup - Tab attivi:", tabs);

            if (!tabs[0]) {
              console.error("❌ Popup - Nessun tab attivo trovato");
              return;
            }

            const tab = tabs[0];
            console.log("📋 Popup - Tab corrente:", tab.url);

            // Controlla se siamo su una pagina valida per i content script
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
              console.error("❌ Popup - Content script non supportato su questa pagina:", tab.url);
              alert("Content script non supportato su questa pagina. Prova su una pagina web normale.");
              return;
            }

            // Prima prova a verificare se il content script è attivo
            console.log("🧪 Popup - Test connessione content script...");

            try {
              const testResponse = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { action: "test" }, (response) => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                  } else {
                    resolve(response);
                  }
                });
              });
              console.log("✅ Popup - Content script attivo:", testResponse);
            } catch (testError) {
              console.warn("⚠️ Popup - Content script non attivo, provo a iniettarlo:", testError.message);

              // Prova a iniettare il content script manualmente
              try {
                await chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  files: ['content.js']
                });
                console.log("✅ Popup - Content script iniettato manualmente");

                // Aspetta un momento per permettere al content script di inizializzarsi
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (injectError) {
                console.error("❌ Popup - Errore iniezione content script:", injectError);
                alert("Impossibile iniettare il content script. Ricarica la pagina e riprova.");
                return;
              }
            }

            // Ora prova a inviare il messaggio di riempimento
            console.log("📤 Popup - Invio messaggio al tab:", tab.id);
            const message = {
              action: "fillInput",
              input: input,
              value: 'antani x2'
            };
            console.log("📤 Popup - Messaggio:", message);

            const response = await new Promise((resolve, reject) => {
              chrome.tabs.sendMessage(tab.id, message, (response) => {
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                } else {
                  resolve(response);
                }
              });
            });

            console.log("✅ Popup - Input filled successfully:", response);

          } catch (error) {
            console.error("❌ Popup - Errore generale:", error);
            alert("Errore: " + error.message);
          }
        });
        inputList.appendChild(li);
      });
    } else {
      inputList.innerHTML = '<li>Nessun input trovato</li>';
    }

  } catch (error) {
    console.error("Error during interaction:", error);
    status.textContent = 'Error during interaction: ' + (error.message || "Unknown error ❌");
    status.style.color = '#f44336';
  } finally {
    buttonInteract.disabled = false;
    buttonInteract.textContent = 'Interact';
    status.textContent = 'Interaction completed.';
    status.style.color = '#4CAF50'; // Green for success
  }
});

buttonParse.addEventListener('click', async () => {
  buttonParse.disabled = true;
  buttonParse.textContent = 'Elaborando...';
  const status = document.getElementById('status');
  status.textContent = 'Elaborazione in corso...';

  try {
    const html = await getPageHTML();
    const [responseScreenshot, pageContentMDServiceWorker, pageContentMDClient] = await Promise.all([
      promifySendMessage("screenshot"),
      promifySendMessage("convertToMarkdownSW", html),
      promifySendMessage("convertToMarkdownInContentScript")
    ]);

    console.log("Risposta screenshot:", responseScreenshot);
    console.log("Risposta Markdown Service Worker:", pageContentMDServiceWorker);
    console.log("Risposta Markdown Content Script:", pageContentMDClient);

    if (responseScreenshot && responseScreenshot.success) {
      status.appendChild(createP('Screenshot: ok ✅'));
      // downloadScreenshotAutomatically(responseScreenshot.screenshotUrl);
      screenshotElement.src = responseScreenshot.screenshotUrl;
      screenshotElement.style.display = 'block';
    } else {
      status.appendChild(createP('Errore screenshot: ' + (responseScreenshot?.error + " ❌" || "Errore sconosciuto ❌")));
      screenshotElement.style.display = 'none';
    }

    if (pageContentMDServiceWorker && pageContentMDServiceWorker.success) {
      if (pageContentMDServiceWorker.markdown) {
        status.appendChild(createP('Markdown convertito con successo (Service Worker) ✅'));
        // downloadMarkdownAutomatically(pageContentMDServiceWorker.markdown);
        responseMarkdown.textContent = pageContentMDServiceWorker.markdown;
      }
    } else {
      status.appendChild(createP('Errore conversione Markdown: ' + (pageContentMDServiceWorker?.error + " ❌" || "Errore sconosciuto ❌")));
    }

    if (pageContentMDClient && pageContentMDClient.success) {
      if (pageContentMDClient.markdown) {
        status.appendChild(createP('Markdown convertito con successo (Content Script) ✅'));
        // downloadMarkdownAutomatically(pageContentMDClient.markdown);
        responseMarkdown2.textContent = pageContentMDClient.markdown;
      }
    } else {
      status.appendChild(createP('Errore conversione Markdown (Content Script): ' + (pageContentMDClient?.error + " ❌" || "Errore sconosciuto ❌")));
    }

  } catch (error) {
    console.error("Errore durante l'elaborazione:", error);
    status.appendChild(createP('Errore generale: ' + (error.message || "Errore sconosciuto ❌")));
    status.style.color = '#f44336';
  } finally { }
});

async function initDefaults() { }

initDefaults();
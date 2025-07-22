/* global LanguageModel */

import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { _createP, _downloadMarkdownAutomatically, _downloadScreenshotAutomatically, _getPageHTML, _promifySendMessage } from '../lib/util';
// input
// const inputPrompt = document.body.querySelector('#input-prompt');
// buttons
// const buttonPrompt = document.body.querySelector('#button-prompt');
// const buttonReset = document.body.querySelector('#button-reset');
const buttonParse = document.body.querySelector('#button-parse');
const buttonInteract = document.body.querySelector('#button-interact');
// elements
const elementResponse = document.body.querySelector('#response');
const elementLoading = document.body.querySelector('#loading');
// const elementError = document.body.querySelector('#error');
// sliders
// const sliderTemperature = document.body.querySelector('#temperature');
// const sliderTopK = document.body.querySelector('#top-k');
// labels
// const labelTemperature = document.body.querySelector('#label-temperature');
// const labelTopK = document.body.querySelector('#label-top-k');

const responseMarkdown = document.body.querySelector('#response');
const responseMarkdown2 = document.body.querySelector('#response2');
const screenshotElement = document.body.querySelector('#screenshot');
// let session;

// async function runPrompt(prompt, params) {
//   try {
//     if (!session) session = await LanguageModel.create(params);
//     return session.prompt(prompt);
//   } catch (e) {
//     reset();
//     throw e;
//   }
// }

// async function reset() {
//   if (session) {
//     session.destroy();
//   }
//   session = null;
// }

// event listeners for sliders and input
// sliderTemperature.addEventListener('input', (event) => {
//   labelTemperature.textContent = event.target.value;
//   reset();
// });

// sliderTopK.addEventListener('input', (event) => {
//   labelTopK.textContent = event.target.value;
//   reset();
// });

// inputPrompt.addEventListener('input', () => {
//   if (inputPrompt.value.trim()) {
//     buttonPrompt.removeAttribute('disabled');
//   } else {
//     buttonPrompt.setAttribute('disabled', '');
//   }
// });


// function showLoading() {
//   buttonReset.removeAttribute('disabled');
//   hide(elementResponse);
//   hide(elementError);
//   show(elementLoading);
// }

function showResponse(response) {
  hide(elementLoading);
  show(elementResponse);
  elementResponse.innerHTML = DOMPurify.sanitize(marked.parse(response));
}

// function showError(error) {
//   show(elementError);
//   hide(elementResponse);
//   hide(elementLoading);
//   elementError.textContent = error;
// }

function show(element) {
  element.removeAttribute('hidden');
}

function hide(element) {
  element.setAttribute('hidden', '');
}

// event listeners for buttons

// buttonReset.addEventListener('click', () => {
//   hide(elementLoading);
//   hide(elementError);
//   hide(elementResponse);
//   reset();
//   buttonReset.setAttribute('disabled', '');
// });

buttonInteract.addEventListener('click', async () => {
  buttonInteract.disabled = true;
  buttonInteract.textContent = 'Interacting...';
  const status = document.getElementById('status');
  status.textContent = 'Interacting with the page...';
  try {
    const inputList = document.getElementById('input-list');

    // Richiede gli input al content script quando la sidebar si apre

    const html = await _getPageHTML();
    const response = await _promifySendMessage("getInputs", { html });
    console.log("Inputs from content script:", response);
    if (response.success && response.inputs && response.inputs.length > 0) {
      inputList.innerHTML = ''; // Pulisce la lista esistente
      response.inputs[0].result.forEach(input => {
        const li = document.createElement('li');
        li.textContent = `${input.name || input.id} (${input.type}): ${input.value}`;
        // insert text into input field
        // send message to content script to fill the input
        li.addEventListener('click', () => {
          chrome.runtime.sendMessage({
            action: "fillInput",
            input: input,
            value: 'antani x2'
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("❌ Errore comunicazione con content script:", chrome.runtime.lastError.message);
            } else {
              console.log("✅ Input filled successfully:", response);
            }
          });
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


// buttonPrompt.addEventListener('click', async () => {
//   const prompt = inputPrompt.value.trim();
//   showLoading();
//   try {
//     const params = {
//       initialPrompts: [
//         { role: 'system', content: 'You are a helpful and friendly assistant.' },
//         { role: 'assistant', content: 'Summarize the main points of this page.' }
//       ],
//       temperature: sliderTemperature.value,
//       topK: sliderTopK.value
//     };
//     const response = await runPrompt(prompt, params);
//     showResponse(response);
//   } catch (e) {
//     showError(e);
//   }
// });

buttonParse.addEventListener('click', async () => {
  buttonParse.disabled = true;
  buttonParse.textContent = 'Elaborando...';
  const status = document.getElementById('status');
  status.textContent = 'Elaborazione in corso...';

  try {
    const html = await _getPageHTML();
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
      // _downloadScreenshotAutomatically(responseScreenshot.screenshotUrl);
      screenshotElement.src = responseScreenshot.screenshotUrl;
    } else {
      status.appendChild(_createP('Errore screenshot: ' + (responseScreenshot?.error + " ❌" || "Errore sconosciuto ❌")));
    }

    if (pageContentMDServiceWorker && pageContentMDServiceWorker.success) {
      if (pageContentMDServiceWorker.markdown) {
        status.appendChild(_createP('Markdown convertito con successo (Service Worker) ✅'));
        // _downloadMarkdownAutomatically(pageContentMDServiceWorker.markdown);
        responseMarkdown.textContent = pageContentMDServiceWorker.markdown;
      }
    } else {
      status.appendChild(_createP('Errore conversione Markdown: ' + (pageContentMDServiceWorker?.error + " ❌" || "Errore sconosciuto ❌")));
    }

    if (pageContentMDClient && pageContentMDClient.success) {
      if (pageContentMDClient.markdown) {
        status.appendChild(_createP('Markdown convertito con successo (Content Script) ✅'));
        // _downloadMarkdownAutomatically(pageContentMDClient.markdown);
        responseMarkdown2.textContent = pageContentMDClient.markdown;
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

// Init
async function initDefaults() {
  // const defaults = await LanguageModel.params();
  if (!('LanguageModel' in self)) {
    showResponse('Model not available');
    return;
  }
  // sliderTemperature.value = defaults.defaultTemperature;
  // // Pending https://issues.chromium.org/issues/367771112.
  // // sliderTemperature.max = defaults.maxTemperature;
  // if (defaults.defaultTopK > 3) {
  //   // limit default topK to 3
  //   sliderTopK.value = 3;
  //   labelTopK.textContent = 3;
  // } else {
  //   sliderTopK.value = defaults.defaultTopK;
  //   labelTopK.textContent = defaults.defaultTopK;
  // }
  // sliderTopK.max = defaults.maxTopK;
  // labelTemperature.textContent = defaults.defaultTemperature;
}

initDefaults();
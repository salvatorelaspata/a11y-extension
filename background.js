// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "screenshot") {
    // Esegui la cattura dello screenshot
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (screenshotUrl) => {
      // Controlla se si è verificato un errore durante la cattura (molto importante!)
      if (chrome.runtime.lastError) {
        console.error("Errore durante la cattura dello screenshot:", chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }

      // Se tutto è andato bene, invia l'URL dello screenshot
      console.log("Screenshot catturato, invio la risposta...");
      sendResponse({ success: true, screenshotUrl: screenshotUrl });
    });

    // Importante: restituisce true per indicare che la risposta sarà asincrona
    return true;
  }
});

// function getPageContent() {
//   return document.documentElement.outerHTML;
// }

// async function sendToAI(html, screenshot) {
//   const apiKey = 'LA_TUA_API_KEY_OPENAI';
//   const endpoint = 'https://api.openai.com/v1/chat/completions';

//   const payload = {
//     model: "gpt-4o",
//     messages: [
//       {
//         role: "user",
//         content: [
//           {
//             type: "text",
//             text: `Analizza questa pagina web per l'accessibilità. Fornisci un riassunto del contenuto. Inoltre, identifica tutti gli elementi interattivi come form, input e pulsanti. Questo è l'HTML della pagina: ${html}`
//           },
//           {
//             type: "image_url",
//             image_url: {
//               url: screenshot
//             }
//           }
//         ]
//       }
//     ],
//     max_tokens: 1000
//   };

//   try {
//     const response = await fetch(endpoint, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${apiKey}`
//       },
//       body: JSON.stringify(payload)
//     });

//     if (!response.ok) {
//       throw new Error(`Errore API: ${response.statusText}`);
//     }

//     const result = await response.json();
//     const summary = result.choices[0].message.content;

//     // Ora hai il riassunto e l'analisi. Passali al content script o al popup.
//     console.log(summary);

//   } catch (error) {
//     console.error("Errore durante la chiamata all'API AI:", error);
//   }
// }



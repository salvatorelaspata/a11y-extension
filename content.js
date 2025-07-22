// Content script per l'estensione A11y
console.log("🚀 Content script caricato con successo!");
console.log("📍 URL corrente:", window.location.href);
console.log("📄 Titolo pagina:", document.title);

// Invia un messaggio al background script per confermare il caricamento
try {
  chrome.runtime.sendMessage({
    action: "content_script_loaded",
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString()
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("❌ Errore comunicazione con background:", chrome.runtime.lastError.message);
    } else {
      console.log("✅ Messaggio inviato al background script:", response);
    }
  });
} catch (error) {
  console.error("❌ Errore invio messaggio:", error);
}

try {
  const indicator = document.createElement('div');
  indicator.textContent = '✅ A11y Extension Active';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #4CAF50;
    opacity: 0.4;
    color: white;
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 12px;
    z-index: 10000;
    font-family: Arial, sans-serif;
  `;
  document.body.appendChild(indicator);
  console.log("✅ Indicatore visivo aggiunto con successo");
} catch (error) {
  console.error("❌ Errore nel content script:", error);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("🔔 Messaggio ricevuto dal background script:", request);
  if (request.action === "fillInput") {
    const { input } = request;
    const targetInput = document.querySelector(`input[id="${input.id}"], input[name="${input.name}"]`);
    if (targetInput) {
      targetInput.value = input.value;
      targetInput.dispatchEvent(new Event('input')); // Trigger input event to enable button
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Input non trovato" });
    }
    return true; // Indica che la risposta sarà inviata in modo asincrono
  }

});
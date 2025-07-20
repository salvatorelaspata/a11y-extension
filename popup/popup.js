document.getElementById('screenshotBtn').addEventListener('click', () => {
  const btn = document.getElementById('screenshotBtn');
  const status = document.getElementById('status');

  // Disabilita il pulsante e mostra lo stato di caricamento
  btn.disabled = true;
  btn.textContent = 'Catturando...';
  status.textContent = 'Cattura dello screenshot in corso...';

  chrome.runtime.sendMessage({ action: "screenshot" }, (response) => {
    // Riabilita il pulsante
    btn.disabled = false;
    btn.textContent = 'Cattura Screenshot';

    if (response && response.success) {
      // Mostra un messaggio di successo
      status.textContent = 'ok ✅';
      downloadScreenshotAutomatically(response.screenshotUrl);
    } else {
      console.error("Errore durante la cattura dello screenshot:", response?.error);
      status.textContent = 'Errore durante la cattura: ' + (response?.error + " ❌" || "Errore sconosciuto ❌");
      status.style.color = '#f44336';
    }
  });
});

function downloadScreenshotAutomatically(screenshotUrl) {
  const downloadLink = document.createElement('a');
  downloadLink.href = screenshotUrl;
  downloadLink.download = `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// function displaySummaryAndEnableTTS(summaryText) {
//   const summaryContainer = document.getElementById('summaryContainer'); // Aggiungi questo div in popup.html
//   summaryContainer.textContent = summaryText;

//   const speakButton = document.getElementById('speakBtn'); // Aggiungi questo pulsante in popup.html
//   speakButton.addEventListener('click', () => {
//     chrome.tts.speak(summaryText, { lang: 'it-IT', rate: 1.0 });
//   });
// }
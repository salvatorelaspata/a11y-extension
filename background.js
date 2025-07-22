// Initializzazione del service worker
console.log("Service Worker avviato");

// Registra programmaticamente il content script come backup
async function registerContentScript() {
  try {
    await chrome.scripting.registerContentScripts([{
      id: "a11y-content-script",
      matches: ["<all_urls>"],
      js: ["content.js"],
      runAt: "document_end"
    }]);
    console.log("✅ Content script registrato programmaticamente");
  } catch (error) {
    console.log("ℹ️ Content script già registrato o errore:", error.message);
  }
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  console.log("Service Worker installato o aggiornato", reason);

  // Registra il content script programmaticamente
  registerContentScript();

  if (reason === 'install') {
    console.log("Estensione installata per la prima volta");
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.log(error));
  } else if (reason === 'update') {
    console.log("Estensione aggiornata");
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.log(error));
  } else {
    console.log("Service Worker avviato per un altro motivo:", reason);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Ricevuto messaggio:", request);

  if (request.action === "content_script_loaded") {
    console.log("🎉 Content script caricato su:", request.url);
    console.log("📄 Titolo pagina:", request.title);
    console.log("⏰ Timestamp:", request.timestamp);
    sendResponse({ success: true, message: "Content script registrato con successo" });
    return true;
  } else if (request.action === "screenshot") {
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
      const regexMarkdown = _htmlToMarkdownRegex(request.html);
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

  if (request.action === "fillInput") {
    const inputToFill = document.getElementById(request.inputId);
    if (inputToFill) {
      inputToFill.value = request.value;
    }
  }
});

function findInputs() {
  const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
  return inputs.map((input, index) => ({
    id: input.id || `input-${index}`,
    type: input.type,
    name: input.name,
    placeholder: input.placeholder,
    value: input.value
  }));
}

// Funzione che sarà iniettata nella pagina per la conversione
function convertHtmlToMarkdownInPage() {
  function htmlToMarkdown(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    function convertNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.replace(/\s+/g, ' ').trim();
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const tag = node.tagName.toLowerCase();
      const children = Array.from(node.childNodes)
        .map(convertNode)
        .join('')
        .trim();

      switch (tag) {
        case 'h1': return children ? `# ${children}\n\n` : '';
        case 'h2': return children ? `## ${children}\n\n` : '';
        case 'h3': return children ? `### ${children}\n\n` : '';
        case 'h4': return children ? `#### ${children}\n\n` : '';
        case 'h5': return children ? `##### ${children}\n\n` : '';
        case 'h6': return children ? `###### ${children}\n\n` : '';
        case 'p': return children ? `${children}\n\n` : '';
        case 'div': return children ? `${children}\n` : '';
        case 'span': return children;
        case 'strong':
        case 'b': return children ? `**${children}**` : '';
        case 'em':
        case 'i': return children ? `*${children}*` : '';
        case 'a': {
          const href = node.getAttribute('href');
          return children ? `[${children}](${href || '#'})` : '';
        }
        case 'img': {
          const alt = node.getAttribute('alt') || '';
          const src = node.getAttribute('src') || '';
          return `![${alt}](${src})`;
        }
        case 'code': return children ? `\`${children}\`` : '';
        case 'pre': return children ? `\`\`\`\n${children}\n\`\`\`\n\n` : '';
        case 'ul': return children ? `${children}\n` : '';
        case 'ol': return children ? `${children}\n` : '';
        case 'li': return children ? `- ${children}\n` : '';
        case 'br': return '\n';
        case 'hr': return '---\n\n';
        case 'blockquote': return children ? `> ${children}\n\n` : '';
        case 'table': return children ? `${children}\n\n` : '';
        case 'tr': return children ? `${children}\n` : '';
        case 'td':
        case 'th': return children ? `| ${children} ` : '| ';
        case 'script':
        case 'style':
        case 'meta':
        case 'link':
        case 'head':
        case 'noscript':
          return '';
        default: return children;
      }
    }

    const targetElement = doc.body || doc.documentElement;
    const result = convertNode(targetElement).trim();
    return result.replace(/\n{3,}/g, '\n\n');
  }

  // Ottieni l'HTML della pagina corrente e convertilo
  const pageHtml = document.documentElement.outerHTML;
  return htmlToMarkdown(pageHtml);
}

// Funzione di fallback usando regex (limitata ma funzionante nei service workers)
function _htmlToMarkdownRegex(html) {
  console.log('Conversione HTML->Markdown con regex');
  console.log('HTML da convertire:', html);
  if (!html) return '';

  try {
    let markdown = html;

    // Rimuovi script, style, comments
    markdown = markdown.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    markdown = markdown.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    markdown = markdown.replace(/<!--[\s\S]*?-->/g, '');

    // Headers
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
    markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
    markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

    // Paragraphs
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');

    // Links
    markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

    // Images
    markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
    markdown = markdown.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '![$1]($2)');
    markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)');

    // Bold and Italic
    markdown = markdown.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');
    markdown = markdown.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');

    // Code
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```\n\n');

    // Lists
    markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    markdown = markdown.replace(/<\/?[uo]l[^>]*>/gi, '\n');

    // Line breaks
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
    markdown = markdown.replace(/<hr\s*\/?>/gi, '---\n\n');

    // Remove remaining HTML tags
    markdown = markdown.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    markdown = markdown.replace(/&nbsp;/g, ' ');
    markdown = markdown.replace(/&amp;/g, '&');
    markdown = markdown.replace(/&lt;/g, '<');
    markdown = markdown.replace(/&gt;/g, '>');
    markdown = markdown.replace(/&quot;/g, '"');
    markdown = markdown.replace(/&#39;/g, "'");

    // Clean up whitespace
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    markdown = markdown.replace(/\s+/g, ' ');
    markdown = markdown.trim();

    return markdown;

  } catch (error) {
    console.log('Errore nella conversione regex:', error);
    return `Errore nella conversione: ${error.message}`;
  }
}
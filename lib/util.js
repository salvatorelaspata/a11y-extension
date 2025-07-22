export async function getPageHTML() {
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

export function promifySendMessage(action, html, args = []) {
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

export function createP(text) {
  const p = document.createElement('p');
  p.textContent = text;
  p.style.margin = '2px 0';
  p.style.fontSize = '12px';
  return p;
}

export function downloadMarkdownAutomatically(markdownContent) {
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

export function downloadScreenshotAutomatically(screenshotUrl) {
  const downloadLink = document.createElement('a');
  downloadLink.href = screenshotUrl;
  downloadLink.download = `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

/* background.js */

export function findInputs() {
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
export function convertHtmlToMarkdownInPage() {
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
export function htmlToMarkdownRegex(html) {
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
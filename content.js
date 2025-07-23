console.log("content script loaded on:", window.location.href);

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

  const pageHtml = document.documentElement.outerHTML;
  return htmlToMarkdown(pageHtml);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getInputs") {
    sendResponse({ success: true, inputs: findInputs() });
  } else if (request.action === "fillInput") {
    const { input, value } = request;
    const element = document.getElementById(input.id);
    if (element) {
      element.value = value;
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Element not found" });
    }
  } else if (request.action === "test") {
    sendResponse({ success: true, message: "Content script is active" });
  } else if (request.action === "convertToMarkdown") {
    const markdown = convertHtmlToMarkdownInPage();
    sendResponse({ success: true, markdown });
  }
});
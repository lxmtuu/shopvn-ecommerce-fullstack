import sanitizeHtml from 'sanitize-html';

/** Làm sạch HTML từ rich text editor trước khi lưu DB (chống stored XSS) */
export const cleanHtml = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div'],
    allowedAttributes: { a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'width', 'height'], '*': ['style'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }) },
  });

export const cleanText = (text: string) => sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });

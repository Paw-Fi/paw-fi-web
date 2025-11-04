// Enhanced HTML to text converter for email plain-text parts
import { sanitizeUrl } from './email-security.ts';

export function htmlToText(html: string): string {
  // Remove noisy blocks entirely
  let text = html
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<canvas[^>]*>[\s\S]*?<\/canvas>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<template[^>]*>[\s\S]*?<\/template>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, ''); // Strip comments

  // Preserve <pre> and <code> blocks with placeholders
  const codeBlocks: string[] = [];
  text = text.replace(/<(pre|code)[^>]*>[\s\S]*?<\/\1>/gi, (match) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(match);
    return placeholder;
  });

  // Convert anchors to "text (URL)" format with proper newline handling
  text = text.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, url, linkText) => {
    const cleanText = linkText.replace(/<[^>]+>/g, '').trim();
    const safeUrl = sanitizeUrl(url);
    // If URL is blocked, return only text (or nothing if no text)
    if (safeUrl === '#') {
      return cleanText || '';
    }
    return cleanText && safeUrl !== '#' ? `${cleanText} (${safeUrl})` : safeUrl;
  });

  // Add bullets for list items with nesting support and ordered list numbering
  const listDepth: number[] = [0]; // Track depth for each nesting level
  const olCounters: number[] = [0]; // Track ol counter for each nesting level
  
  text = text.replace(/<\/(ol|ul)>/gi, (_, listType) => {
    listDepth.pop();
    if (listType === 'ol') {
      olCounters.pop();
    }
    return '\n';
  });
  
  text = text.replace(/<(ol|ul)[^>]*>/gi, (_, listType) => {
    listDepth.push((listDepth[listDepth.length - 1] || 0) + 1);
    if (listType === 'ol') {
      olCounters.push(0);
    }
    return '\n';
  });
  
  text = text.replace(/<li[^>]*>/gi, () => {
    const currentDepth = Math.max(0, listDepth.length - 1);
    const indent = '  '.repeat(currentDepth);
    const isInOl = currentDepth > 0 && olCounters.length > currentDepth;
    
    if (isInOl) {
      olCounters[currentDepth] = (olCounters[currentDepth] || 0) + 1;
      return `\n${indent}${olCounters[currentDepth]}. `;
    } else {
      return `\n${indent}• `;
    }
  });
  text = text.replace(/<\/li>/gi, '\n');

  // Block elements - add line breaks for both open and close tags
  const blockTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'section', 'header', 'footer', 'article', 'tr'];
  blockTags.forEach(tag => {
    text = text.replace(new RegExp(`<${tag}[^>]*>`, 'gi'), '\n');
    text = text.replace(new RegExp(`</${tag}>`, 'gi'), '\n');
  });

  // Table-specific formatting with visible column separator
  text = text
    .replace(/<\/(td|th)>/gi, ' | ')
    .replace(/<\/(table)>/gi, '\n\n')
    .replace(/<tr[^>]*>/gi, '\n');

  // Line breaks and separators
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities with astral plane support
  const entityMap: Record<string, string> = {
    'nbsp': ' ', 'ensp': ' ', 'emsp': ' ',
    'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'",
    'ndash': '–', 'mdash': '—', 'hellip': '…',
    'lsquo': '\u2018', 'rsquo': '\u2019', 'ldquo': '\u201C', 'rdquo': '\u201D',
    'copy': '\u00A9', 'reg': '\u00AE', 'trade': '\u2122', 'euro': '\u20AC',
    'bull': '\u2022', 'middot': '\u00B7',
  };

  // Named entities
  text = text.replace(/&([a-z]+);/gi, (match, entity) => {
    return entityMap[entity.toLowerCase()] || match;
  });

  // Numeric entities with safe code point handling
  text = text.replace(/&#(\d+);/g, (_, code) => {
    const codePoint = parseInt(code, 10);
    if (codePoint === 10) return '\n'; // LF
    if (codePoint === 13) return '\n'; // CR
    if (codePoint <= 0x1F || (codePoint >= 0x7F && codePoint <= 0x9F)) {
      return ' '; // Replace control characters with space
    }
    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return ' ';
    }
  });

  text = text.replace(/&#x([0-9a-f]+);/gi, (_, code) => {
    const codePoint = parseInt(code, 16);
    if (codePoint === 10) return '\n'; // LF
    if (codePoint === 13) return '\n'; // CR
    if (codePoint <= 0x1F || (codePoint >= 0x7F && codePoint <= 0x9F)) {
      return ' '; // Replace control characters with space
    }
    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return ' ';
    }
  });

  // Restore code blocks with original whitespace preserved and full entity decoding
  codeBlocks.forEach((block, index) => {
    // Extract content from code block and decode all entities (named, numeric, hex)
    let content = block.replace(/<\/?(pre|code)[^>]*>/gi, '');
    
    // Decode named entities
    content = content.replace(/&([a-z]+);/gi, (match, entity) => {
      return entityMap[entity.toLowerCase()] || match;
    });
    
    // Decode numeric entities with special handling for control characters
    content = content.replace(/&#(\d+);/g, (_, code) => {
      const codePoint = parseInt(code, 10);
      if (codePoint === 10) return '\n'; // LF
      if (codePoint === 13) return '\n'; // CR
      if (codePoint <= 0x1F || (codePoint >= 0x7F && codePoint <= 0x9F)) {
        return ' '; // Replace control characters with space
      }
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return ' ';
      }
    });

    content = content.replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const codePoint = parseInt(code, 16);
      if (codePoint === 10) return '\n'; // LF
      if (codePoint === 13) return '\n'; // CR
      if (codePoint <= 0x1F || (codePoint >= 0x7F && codePoint <= 0x9F)) {
        return ' '; // Replace control characters with space
      }
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return ' ';
      }
    });
    
    // Replace placeholder with content surrounded by blank lines
    text = text.replace(`__CODE_BLOCK_${index}__`, `\n${content}\n`);
  });

  // Clean up trailing spaces only, preserve leading spaces after newlines
  // Strip trailing table separators first
  text = text.replace(/[ \t]+\|[ \t]*$/gm, ''); // Remove trailing pipes
  
  // Then cleanup other spaces (but be careful with code blocks)
  text = text
    .replace(/[ \t]+$/gm, '') // Remove trailing spaces on each line
    .replace(/\n{3,}/g, '\n\n'); // Collapse multiple newlines

  return text.trim();
}

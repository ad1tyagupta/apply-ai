#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

const [inputArg, outputArg, titleArg] = process.argv.slice(2);

if (!inputArg || !outputArg) {
  console.error('Usage: node career_ops_core/render-markdown-html.mjs <input.md> <output.html> [title]');
  process.exit(1);
}

const inputPath = resolve(inputArg);
const outputPath = resolve(outputArg);
const title = titleArg || 'Application Document';
const markdown = readFileSync(inputPath, 'utf-8').replace(/\r/g, '');
const docType = detectDocType({ inputPath, outputPath, title, markdown });

function detectDocType({ inputPath: inPath, outputPath: outPath, title: docTitle, markdown: md }) {
  const haystack = `${inPath} ${outPath} ${docTitle}`.toLowerCase();
  if (haystack.includes('cover-letter')) return 'cover-letter';
  if (haystack.includes('-cv')) return 'cv';
  if (/^dear\s+/im.test(md)) return 'cover-letter';
  return 'generic';
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderInline(text) {
  const escaped = escapeHtml(text);

  return escaped
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(?<!["'>])(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function normalizePipeText(text) {
  return text.replaceAll('\\|', '|').trim();
}

function renderMarkdownBlocks(md) {
  const lines = md.split('\n');
  const parts = [];
  let listItems = [];
  let paragraph = [];

  function flushList() {
    if (listItems.length === 0) return;
    parts.push(`<ul>${listItems.join('')}</ul>`);
    listItems = [];
  }

  function flushParagraph() {
    if (paragraph.length === 0) return;
    parts.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
    paragraph = [];
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed === '') {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith('# ')) {
      flushParagraph();
      flushList();
      parts.push(`<h1>${renderInline(trimmed.slice(2))}</h1>`);
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushParagraph();
      flushList();
      parts.push(`<h2>${renderInline(trimmed.slice(3))}</h2>`);
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushParagraph();
      flushList();
      parts.push(`<h3>${renderInline(trimmed.slice(4))}</h3>`);
      continue;
    }

    if (trimmed.startsWith('- ')) {
      flushParagraph();
      listItems.push(`<li>${renderInline(trimmed.slice(2))}</li>`);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  return parts.join('\n');
}

function renderCv(md) {
  const rawLines = md.split('\n');
  const contentLines = [...rawLines];
  const nonEmpty = rawLines.map((line, index) => ({ line: line.trim(), index })).filter(item => item.line);

  let identityHtml = '';
  const firstHeadingIndex = rawLines.findIndex(line => line.trim().startsWith('## ') || line.trim().startsWith('# '));

  if (nonEmpty.length >= 2 && firstHeadingIndex > 1) {
    const nameLine = normalizePipeText(nonEmpty[0].line);
    const detailLine = normalizePipeText(nonEmpty[1].line);
    const detailParts = detailLine.split('|').map(part => part.trim()).filter(Boolean);
    const allParts = [nameLine, ...detailParts];
    identityHtml = `
      <section class="identity">
        <div class="identity-line">${allParts.map(renderInline).join('<span class="divider">|</span>')}</div>
      </section>
    `;

    contentLines[nonEmpty[0].index] = '';
    contentLines[nonEmpty[1].index] = '';
  }

  return identityHtml + renderMarkdownBlocks(contentLines.join('\n'));
}

function renderCoverLetter(md) {
  const blocks = md.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
  if (blocks.length === 0) return '';

  const addressLines = [];
  while (blocks.length > 0 && !/^dear\b/i.test(blocks[0])) {
    const nextLines = blocks.shift().split('\n').map(line => line.trim()).filter(Boolean);
    addressLines.push(...nextLines);
  }

  let greeting = '';
  if (blocks.length > 0 && /^dear\b/i.test(blocks[0])) {
    greeting = blocks.shift();
  }

  let signoffBlock = '';
  if (blocks.length > 0) {
    const lastBlock = blocks[blocks.length - 1];
    const lines = lastBlock.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines[0] && /^best regards,?$/i.test(lines[0])) {
      blocks.pop();
      const [signoff, name = '', email = '', phone = ''] = lines;
      signoffBlock = `
        <div class="signoff">${renderInline(signoff)}
<strong>${renderInline(name)}</strong>
${renderInline(email)}
${renderInline(phone)}</div>
      `;
    }
  }

  const bodyHtml = blocks.map(block => `<p>${renderInline(block.replace(/\n+/g, ' '))}</p>`).join('\n');

  return `
    ${addressLines.length ? `<div class="address">${addressLines.map(renderInline).join('\n')}</div>` : ''}
    ${greeting ? `<p>${renderInline(greeting)}</p>` : ''}
    ${bodyHtml}
    ${signoffBlock}
  `;
}

function getStyles(type) {
  const shared = `
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: "DM Sans", Arial, sans-serif;
      color: #1d2433;
      background: #f7f5ef;
    }
    .page {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      padding: 40px 44px 44px;
      background: #fffdf8;
    }
    h1, h2, h3 {
      font-family: "Space Grotesk", Arial, sans-serif;
      margin: 0 0 12px;
      color: #122033;
    }
    h1 {
      font-size: 28px;
      line-height: 1.15;
      margin-bottom: 18px;
      border-bottom: 2px solid #d9d1bf;
      padding-bottom: 10px;
    }
    h2 { font-size: 18px; margin-top: 20px; }
    h3 { font-size: 15px; margin-top: 14px; }
    p, li {
      font-size: 12.5px;
      line-height: 1.62;
      margin: 0 0 10px;
    }
    ul {
      margin: 0 0 10px 18px;
      padding: 0;
    }
    strong { color: #0f1726; }
  `;

  if (type === 'cv') {
    return `${shared}
      .identity {
        margin-bottom: 24px;
        padding-bottom: 14px;
        border-bottom: 2px solid #d8d0bd;
      }
      .identity-line {
        font-family: "Space Grotesk", Arial, sans-serif;
        font-size: 19px;
        font-weight: 700;
        line-height: 1.35;
        color: #102033;
        letter-spacing: 0.01em;
      }
      .divider {
        color: #8d7751;
        padding: 0 10px;
        font-weight: 700;
      }
    `;
  }

  if (type === 'cover-letter') {
    return `${shared}
      .address,
      .signoff {
        margin-bottom: 22px;
        line-height: 1.72;
        font-size: 13px;
        white-space: pre-line;
      }
      .signoff strong {
        font-family: "Space Grotesk", Arial, sans-serif;
        font-size: 14px;
        color: #102033;
      }
      p {
        font-size: 13px;
        line-height: 1.72;
        margin: 0 0 14px;
      }
    `;
  }

  return shared;
}

function renderDocument(type, md) {
  if (type === 'cv') return renderCv(md);
  if (type === 'cover-letter') return renderCoverLetter(md);
  return renderMarkdownBlocks(md);
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${getStyles(docType)}</style>
</head>
<body>
  <main class="page">
    ${renderDocument(docType, markdown)}
  </main>
</body>
</html>`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html, 'utf-8');

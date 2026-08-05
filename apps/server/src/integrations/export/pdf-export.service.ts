import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { jsonToHtml } from '../../collaboration/collaboration.util';
import { ExportFormat } from './dto/export-dto';
import { Page } from '@docmost/db/types/entity.types';
import { getPageTitle } from './utils';
import { getProsemirrorContent } from '../../common/helpers/prosemirror/utils';

@Injectable()
export class PdfExportService {
  private readonly logger = new Logger(PdfExportService.name);

  /**
   * Generate a PDF from a single page.
   */
  async exportPageToPdf(page: Page): Promise<Buffer> {
    const title = getPageTitle(page.title);

    // Build ProseMirror JSON with title as H1
    const prosemirrorJson = getProsemirrorContent(page.content);
    if (page.title) {
      const titleNode = {
        type: 'heading',
        attrs: { level: 1, id: 'page-title' },
        content: [{ type: 'text', text: title }],
      };
      prosemirrorJson.content.unshift(titleNode);
    }

    const pageHtml = jsonToHtml(prosemirrorJson);

    const fullHtml = this.buildPdfTemplate(title, pageHtml);

    return this.renderHtmlToPdf(fullHtml, title);
  }

  async exportHtmlToPdf(html: string, title: string): Promise<Buffer> {
    const fullHtml = this.buildPdfTemplate(title, html);
    return this.renderHtmlToPdf(fullHtml, title);
  }

  /**
   * Build a complete HTML document with print-friendly styles.
   */
  private buildPdfTemplate(title: string, contentHtml: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHtml(title)}</title>
  <style>
    @page {
      margin: 20mm;
      size: auto;
    }

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      text-rendering: optimizeLegibility;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }

    /* Print header */
    .pdf-header {
      border-bottom: 1px solid #ddd;
      padding-bottom: 8mm;
      margin-bottom: 8mm;
    }

    .pdf-header h1 {
      font-size: 22pt;
      font-weight: 700;
      margin: 0 0 4mm 0;
      color: #000;
      page-break-after: avoid;
    }

    .pdf-meta {
      font-size: 9pt;
      color: #666;
    }

    /* TOC Page */
    .pdf-toc {
      page-break-after: always;
      margin-bottom: 10mm;
    }

    .pdf-toc h2 {
      font-size: 16pt;
      font-weight: 600;
      margin: 0 0 6mm 0;
      color: #000;
      page-break-after: avoid;
    }

    .pdf-toc ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .pdf-toc li {
      margin: 0;
      padding: 0;
    }

    .pdf-toc a {
      display: block;
      text-decoration: none;
      color: #000;
      padding: 3px 0;
      font-size: 11pt;
      line-height: 1.4;
      border-bottom: 1px dotted #eee;
    }

    .pdf-toc a:hover {
      background: #f5f5f5;
    }

    .pdf-toc .toc-h1 { font-weight: 600; padding-left: 0; }
    .pdf-toc .toc-h2 { padding-left: 1.5em; }
    .pdf-toc .toc-h3 { padding-left: 3em; font-size: 10pt; }
    .pdf-toc .toc-h4 { padding-left: 4.5em; font-size: 10pt; color: #333; }
    .pdf-toc .toc-h5 { padding-left: 6em; font-size: 10pt; color: #333; }
    .pdf-toc .toc-h6 { padding-left: 7.5em; font-size: 10pt; color: #333; }

    /* Main content */
    .pdf-content {
      max-width: 100%;
    }

    .pdf-content h1 {
      font-size: 20pt;
      font-weight: 700;
      margin-top: 0.75em;
      margin-bottom: 0.25em;
      page-break-after: avoid;
      page-break-inside: avoid;
      color: #000;
    }

    .pdf-content h2 {
      font-size: 16pt;
      font-weight: 600;
      margin-top: 0.75em;
      margin-bottom: 0.25em;
      page-break-after: avoid;
      page-break-inside: avoid;
      color: #000;
    }

    .pdf-content h3 {
      font-size: 14pt;
      font-weight: 600;
      margin-top: 0.75em;
      margin-bottom: 0.25em;
      page-break-after: avoid;
      page-break-inside: avoid;
      color: #000;
    }

    .pdf-content h4 {
      font-size: 12pt;
      font-weight: 600;
      margin-top: 0.75em;
      margin-bottom: 0.25em;
      page-break-after: avoid;
      page-break-inside: avoid;
      color: #000;
    }

    .pdf-content p {
      margin: 0.5em 0;
      orphans: 1;
      widows: 1;
    }

    .pdf-content ul, .pdf-content ol {
      margin: 0.5em 0;
      padding-left: 2em;
    }

    .pdf-content li {
      margin: 0.25em 0;
    }

    /* Tables */
    .pdf-content table {
      width: 100% !important;
      border-collapse: collapse;
      margin: 1em 0;
      page-break-inside: auto;
      table-layout: fixed;
      word-break: break-word;
      overflow: hidden;
    }

    .pdf-content thead {
      display: table-header-group;
    }

    .pdf-content tr {
      page-break-inside: auto;
    }

    .pdf-content th, .pdf-content td {
      border: 1px solid #aaa;
      padding: 6px 8px;
      text-align: left;
      font-size: 10pt;
    }

    .pdf-content th {
      background-color: #f5f5f5;
      font-weight: 600;
    }

    /* Code blocks */
    .pdf-content pre {
      background-color: #f8f8f8;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 1em;
      font-size: 9pt;
      font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
      white-space: pre-wrap;
      word-wrap: break-word;
      page-break-inside: auto;
      margin: 1em 0;
    }

    .pdf-content code {
      background-color: #f0f0f0;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 9pt;
      font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
    }

    /* Blockquotes */
    .pdf-content blockquote {
      border-left: 3px solid #ccc;
      margin: 1em 0;
      padding: 0.5em 1em;
      color: #444;
      font-style: italic;
      background: #fafafa;
    }

    /* Images */
    .pdf-content img {
      max-width: 100%;
      height: auto;
      page-break-inside: avoid;
    }

    /* Links */
    .pdf-content a {
      color: #0000ee;
      text-decoration: underline;
    }

    @media (prefers-color-scheme: dark) {
      .pdf-content a {
        color: #4da6ff;
      }
      .pdf-fixed-caption a {
        color: #ffffff !important;
      }
    }

    .pdf-fixed-caption {
      position: fixed;
      bottom: -15mm;
      left: 0;
      font-size: 8pt;
      z-index: 1000;
    }
    .pdf-fixed-caption a {
      color: #999;
      text-decoration: none;
    }

    /* Task lists */
    .pdf-content input[type="checkbox"] {
      margin-right: 0.5em;
    }

    /* Columns layout */
    .pdf-content section[data-type="columns"] {
      display: flex;
      gap: 1rem;
      margin: 1em 0;
    }

    .pdf-content div[data-type="column"] {
      flex: 1;
      min-width: 0;
    }

    /* Hide edit-only UI elements */
    .pdf-content .ProseMirror-selectednode,
    .pdf-content .drag-handle,
    .pdf-content .actionIconGroup,
    .pdf-content .resizeHandle,
    .pdf-content [data-drag-handle] {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="pdf-toc" id="toc">
    <h2>Table of Contents</h2>
    <ul id="toc-list"></ul>
  </div>

  <div class="pdf-content">
    ${contentHtml}
  </div>

  <script>
    // Auto-generate TOC from headings
    (function() {
      const headings = document.querySelectorAll('.pdf-content h1, .pdf-content h2, .pdf-content h3, .pdf-content h4, .pdf-content h5, .pdf-content h6');
      const tocList = document.getElementById('toc-list');
      const usedIds = new Set();

      headings.forEach(function(heading) {
        // Ensure heading has an id
        if (!heading.id) {
          let baseId = heading.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          let id = baseId;
          let counter = 1;
          while (usedIds.has(id)) {
            id = baseId + '-' + counter;
            counter++;
          }
          heading.id = id;
          usedIds.add(id);
        }

        const level = parseInt(heading.tagName.charAt(1));
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#' + heading.id;
        a.textContent = heading.textContent;
        a.className = 'toc-h' + level;
        li.appendChild(a);
        tocList.appendChild(li);
      });

      // If no headings, hide TOC
      if (headings.length === 0) {
        document.getElementById('toc').style.display = 'none';
      }
    })();
  </script>
</body>
</html>`;
  }

  /**
   * Render HTML to PDF using Puppeteer.
   */
  private async renderHtmlToPdf(html: string, title: string): Promise<Buffer> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Wait for TOC generation script to run
      await page.waitForFunction(() => {
        const toc = document.getElementById('toc-list');
        return toc && toc.children.length > 0;
      }, { timeout: 5000 }).catch(() => {
        // TOC might be empty, that's okay
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        outline: true, // Creates PDF bookmarks from headings
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 8pt; color: #999; width: 100%; padding: 0 20mm; text-align: center;">
            <span>${this.escapeHtml(title)}</span>
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 8pt; color: #999; width: 100%; padding: 0 20mm; display: flex; justify-content: space-between; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <span style="flex: 1; text-align: left;">
              <span style="color: #4da6ff;">View this page on Docmost</span>
            </span>
            <span style="flex: 1; text-align: right;">
              Page <span class="pageNumber"></span> of <span class="totalPages"></span>
            </span>
          </div>
        `,
        margin: {
          top: '15mm',
          bottom: '15mm',
          left: '20mm',
          right: '20mm',
        },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('PDF generation failed', error);
      throw new Error('Failed to generate PDF: ' + (error as Error).message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';
import puppeteer, { Browser } from 'puppeteer';

/**
 * Thin Puppeteer + Handlebars helper. Compiles `.hbs` templates (cached) and
 * renders them to A4 PDF buffers using a single shared, lazily-launched browser.
 */
@Injectable()
export class PdfGeneratorService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private readonly templatesDir = join(__dirname, 'templates');
  private readonly templateCache = new Map<
    string,
    Handlebars.TemplateDelegate
  >();
  private browser: Browser | null = null;

  /**
   * Render a compiled template to a print-ready A4 PDF buffer.
   * @param cacheKey cache key for the compiled template, e.g. 'file:bill-of-lading'
   *   or 'db:<templateId>:<version>' — callers pick the key so DB-backed
   *   templates naturally get a fresh compile whenever `version` changes.
   * @param loadSource lazily returns the raw Handlebars source; only called
   *   on a cache miss.
   */
  async generatePdf(
    cacheKey: string,
    loadSource: () => string,
    data: Record<string, unknown>,
  ): Promise<Buffer> {
    const template = this.getTemplate(cacheKey, loadSource);
    const html = template(data);

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  /** Drops a cache entry, forcing the next `generatePdf` call to recompile. */
  invalidate(cacheKey: string): void {
    this.templateCache.delete(cacheKey);
  }

  private getTemplate(
    cacheKey: string,
    loadSource: () => string,
  ): Handlebars.TemplateDelegate {
    const cached = this.templateCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const compiled = Handlebars.compile(loadSource());
    this.templateCache.set(cacheKey, compiled);
    return compiled;
  }

  /** Reads a file-based template's raw source, for the `file:` cache-key path. */
  readFileTemplateSource(fileName: string): string {
    const filePath = join(this.templatesDir, `${fileName}.hbs`);
    return readFileSync(filePath, 'utf8');
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) {
      return this.browser;
    }
    this.logger.log('Launching headless Chromium for PDF generation');
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    return this.browser;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

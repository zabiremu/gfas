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
   * @param templateName file name without extension, e.g. 'bill-of-lading'
   */
  async generatePdf(
    templateName: string,
    data: Record<string, unknown>,
  ): Promise<Buffer> {
    const template = this.getTemplate(templateName);
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

  private getTemplate(name: string): Handlebars.TemplateDelegate {
    const cached = this.templateCache.get(name);
    if (cached) {
      return cached;
    }
    const filePath = join(this.templatesDir, `${name}.hbs`);
    const source = readFileSync(filePath, 'utf8');
    const compiled = Handlebars.compile(source);
    this.templateCache.set(name, compiled);
    return compiled;
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

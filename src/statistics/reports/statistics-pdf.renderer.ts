import { Injectable } from '@nestjs/common';
import { launch } from 'puppeteer';
import { StatisticsResponseDto } from '../dto/statistics-response.dto';
import { buildStatisticsReportHtml } from './statistics-report-html';

const PAGE_MARGIN = '20mm';

@Injectable()
export class StatisticsPdfRenderer {
  // Puppeteer reads PUPPETEER_EXECUTABLE_PATH on its own: the Docker image
  // points it to Alpine's Chromium, and without it Puppeteer uses the Chrome
  // it downloaded, as in the CI.
  async render(statistics: StatisticsResponseDto): Promise<Buffer> {
    // The sandbox needs kernel features that a container running as root and
    // the CI runner do not offer. Without it Chromium is still safe here: the
    // page is our own HTML, with JavaScript off and no network requests.
    const browser = await launch({ args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setContent(buildStatisticsReportHtml(statistics));
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: PAGE_MARGIN,
          right: PAGE_MARGIN,
          bottom: PAGE_MARGIN,
          left: PAGE_MARGIN,
        },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}

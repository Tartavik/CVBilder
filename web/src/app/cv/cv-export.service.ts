import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { ErrorService } from '../shared/errors/error.service';
import { CvTemplate } from './cv.store';

@Injectable({ providedIn: 'root' })
export class CvExportService {
  private readonly document = inject(DOCUMENT);
  private readonly errors = inject(ErrorService);

  exportPdf(template: CvTemplate): void {
    try {
      const selector =
        template === 'classic' ? 'app-cv-preview-classic' : 'app-cv-preview';
      const previewElement = this.document.querySelector(selector);
      if (!previewElement) {
        throw new Error('CV preview is not available for export.');
      }

      const printWindow = this.document.defaultView?.open('', '_blank');
      if (!printWindow) {
        throw new Error(
          'The browser blocked the print window. Allow pop-ups and try again.',
        );
      }

      const styles = Array.from(
        this.document.querySelectorAll('style, link[rel="stylesheet"]'),
      )
        .map((element) => element.outerHTML)
        .join('\n');

      printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>CV</title>
  ${styles}
  <style>
    @page { size: A4; margin: 0; }
    body { margin: 0; padding: 0; background: white; }
    .preview-page { min-height: auto !important; box-shadow: none !important; }
  </style>
</head>
<body>${previewElement.outerHTML}</body>
</html>`);
      printWindow.document.close();
      printWindow.focus();

      printWindow.setTimeout(() => {
        try {
          printWindow.print();
          printWindow.close();
        } catch (error: unknown) {
          this.reportExportError(error);
        }
      }, 500);
    } catch (error: unknown) {
      this.reportExportError(error);
    }
  }

  private reportExportError(error: unknown): void {
    this.errors.report(error, {
      source: 'application',
      operation: 'Export CV to PDF',
    });
  }
}

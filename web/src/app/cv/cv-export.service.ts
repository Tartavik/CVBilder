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
    html {
      min-height: 100%;
      background: #eef2f7;
    }
    body {
      display: flex;
      min-height: 100vh;
      align-items: flex-start;
      justify-content: center;
      box-sizing: border-box;
      margin: 0;
      padding: 24px;
      background: #eef2f7;
    }
    body > app-cv-preview,
    body > app-cv-preview-classic {
      display: block !important;
      width: 210mm !important;
      min-width: 210mm !important;
      min-height: 297mm !important;
      flex: 0 0 210mm !important;
    }
    .preview-page,
    .classic-page {
      width: 210mm !important;
      min-height: 297mm !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      box-shadow: 0 6px 24px rgb(15 23 42 / 18%) !important;
    }
    .experience-skill-icons,
    .classic-experience-skill-icons {
      align-items: center !important;
    }
    app-skill-icon {
      display: inline-flex !important;
      width: 28px !important;
      height: 28px !important;
      min-width: 28px !important;
      max-width: 28px !important;
      min-height: 28px !important;
      max-height: 28px !important;
      flex: 0 0 28px !important;
      overflow: hidden !important;
      vertical-align: middle !important;
    }
    app-skill-icon .skill-icon {
      display: inline-flex !important;
      width: 28px !important;
      height: 28px !important;
      min-width: 28px !important;
      max-width: 28px !important;
      min-height: 28px !important;
      max-height: 28px !important;
      align-items: center !important;
      justify-content: center !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      border-radius: 6px !important;
      font: 800 10px/1 Arial, sans-serif !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    app-skill-icon .skill-icon:has(img) {
      background: transparent !important;
    }
    app-skill-icon img {
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      max-width: 28px !important;
      max-height: 28px !important;
      background: transparent !important;
      object-fit: contain !important;
    }
    @media print {
      html,
      body {
        display: block;
        width: 210mm;
        min-height: 297mm;
        padding: 0;
        background: white;
      }
      .preview-page,
      .classic-page {
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body>${previewElement.outerHTML}</body>
</html>`);
      printWindow.document.close();

      let printStarted = false;
      let printPreparationStarted = false;
      const startPrint = () => {
        if (printStarted) return;
        printStarted = true;
        try {
          printWindow.focus();
          printWindow.print();
        } catch (error: unknown) {
          this.reportExportError(error);
        }
      };
      const startPrintWhenReady = () => {
        if (printPreparationStarted) return;
        printPreparationStarted = true;

        const fontsReady =
          printWindow.document.fonts?.ready ?? Promise.resolve();
        const assetsReady = Promise.all([
          fontsReady,
          ...Array.from(printWindow.document.images).map((image) =>
            image.decode().catch(() => undefined),
          ),
        ]).then(() => this.normalizePrintedSkillIcons(printWindow.document));
        const timeout = new Promise<void>((resolve) =>
          printWindow.setTimeout(resolve, 1500),
        );

        Promise.race([assetsReady, timeout]).finally(() =>
          printWindow.setTimeout(startPrint, 100),
        );
      };

      printWindow.addEventListener(
        'load',
        startPrintWhenReady,
        { once: true },
      );
      printWindow.setTimeout(startPrintWhenReady, 1000);
    } catch (error: unknown) {
      this.reportExportError(error);
    }
  }

  private async normalizePrintedSkillIcons(document: Document): Promise<void> {
    const images = Array.from(
      document.querySelectorAll<HTMLImageElement>('app-skill-icon img'),
    );
    await Promise.all(
      images.map((image) => this.removeSolidImageBackground(document, image)),
    );
  }

  private async removeSolidImageBackground(
    document: Document,
    image: HTMLImageElement,
  ): Promise<void> {
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.src.startsWith('data:image/svg+xml')
    ) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;

    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const dominantEdgeColor = this.getDominantEdgeColor(
      imageData.data,
      canvas.width,
      canvas.height,
    );
    if (!dominantEdgeColor) return;

    const [backgroundRed, backgroundGreen, backgroundBlue] =
      dominantEdgeColor;
    const pixels = imageData.data;
    for (let index = 0; index < pixels.length; index += 4) {
      const colorDistance = Math.hypot(
        pixels[index] - backgroundRed,
        pixels[index + 1] - backgroundGreen,
        pixels[index + 2] - backgroundBlue,
      );
      if (colorDistance <= 16) {
        pixels[index + 3] = 0;
      } else if (colorDistance < 52) {
        pixels[index + 3] = Math.round(
          pixels[index + 3] * ((colorDistance - 16) / 36),
        );
      }
    }

    context.putImageData(imageData, 0, 0);
    image.src = canvas.toDataURL('image/png');
    await image.decode().catch(() => undefined);
  }

  private getDominantEdgeColor(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
  ): [number, number, number] | null {
    const buckets = new Map<
      string,
      { count: number; red: number; green: number; blue: number }
    >();
    let opaqueEdgePixels = 0;
    const step = Math.max(1, Math.floor(Math.min(width, height) / 64));
    const addPixel = (x: number, y: number) => {
      const index = (y * width + x) * 4;
      if (pixels[index + 3] < 220) return;
      opaqueEdgePixels += 1;
      const key = `${pixels[index] >> 4}-${pixels[index + 1] >> 4}-${pixels[index + 2] >> 4}`;
      const bucket = buckets.get(key) ?? {
        count: 0,
        red: 0,
        green: 0,
        blue: 0,
      };
      bucket.count += 1;
      bucket.red += pixels[index];
      bucket.green += pixels[index + 1];
      bucket.blue += pixels[index + 2];
      buckets.set(key, bucket);
    };

    for (let x = 0; x < width; x += step) {
      addPixel(x, 0);
      addPixel(x, height - 1);
    }
    for (let y = step; y < height - step; y += step) {
      addPixel(0, y);
      addPixel(width - 1, y);
    }

    const dominant = [...buckets.values()].sort(
      (left, right) => right.count - left.count,
    )[0];
    if (
      !dominant ||
      opaqueEdgePixels < 12 ||
      dominant.count / opaqueEdgePixels < 0.4
    ) {
      return null;
    }

    return [
      dominant.red / dominant.count,
      dominant.green / dominant.count,
      dominant.blue / dominant.count,
    ];
  }

  private reportExportError(error: unknown): void {
    this.errors.report(error, {
      source: 'application',
      operation: 'Export CV to PDF',
    });
  }
}

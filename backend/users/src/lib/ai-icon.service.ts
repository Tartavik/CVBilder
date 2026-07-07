import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import sharp from 'sharp';
import * as simpleIcons from 'simple-icons';

interface UserGenerationState {
  timestamps: number[];
  generatedCount: number;
}

@Injectable()
export class AiIconService {
  private readonly openai: OpenAI | null;
  private readonly requestBuckets = new Map<string, UserGenerationState>();
  private readonly rateLimitWindowMs: number;
  private readonly maxRequestsPerWindow: number;
  private readonly maxGenerationsPerUser: number;
  private readonly mockOpenAi: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    this.rateLimitWindowMs = Number(this.configService.get<number>('AI_ICON_RATE_LIMIT_WINDOW_MS') ?? 60_000);
    this.maxRequestsPerWindow = Number(this.configService.get<number>('AI_ICON_RATE_LIMIT_MAX') ?? 5);
    this.maxGenerationsPerUser = Number(this.configService.get<number>('AI_ICON_MAX_GENERATIONS_PER_USER') ?? 10);
    this.mockOpenAi = this.configService.get<string>('AI_ICON_MOCK_MODE') === 'true' || this.configService.get<string>('CI') === 'true';
  }

  async findOrGenerateIcon(userId: string, skillName: string): Promise<{ icon: string; source: 'found' | 'generated' }> {
    this.ensureGenerationAllowed(userId);

    const icon = this.findSimpleIcon(skillName);
    if (icon) {
      return { icon, source: 'found' };
    }

    const generated = await this.generateWithOpenAI(skillName);
    this.recordGeneration(userId);
    return { icon: generated, source: 'generated' };
  }

  private findSimpleIcon(skillName: string): string | null {
    const normalized = skillName.trim().toLowerCase();
    const candidates = this.buildCandidateNames(normalized);

    for (const candidate of candidates) {
      const icon = Object.values(simpleIcons).find((entry) => {
        const slug = entry.slug.toLowerCase();
        const title = entry.title.toLowerCase();
        return slug === candidate || title === candidate || slug.includes(candidate) || title.includes(candidate);
      });

      if (icon) {
        return this.svgToDataUrl(icon.svg);
      }
    }

    return null;
  }

  private buildCandidateNames(skillName: string): string[] {
    const parts = skillName.split(/[^a-z0-9]+/).filter(Boolean);
    const names = new Set<string>();

    names.add(skillName);
    parts.forEach((part) => names.add(part));
    if (parts.length > 1) {
      names.add(parts.join(''));
      names.add(parts.join('-'));
      names.add(parts.join('_'));
    }

    return [...names].filter(Boolean);
  }

  private svgToDataUrl(svg: string): string {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  private async generateWithOpenAI(skillName: string): Promise<string> {
    if (this.mockOpenAi || !this.openai) {
      return this.buildFallbackSvg(skillName);
    }

    try {
      const response = await this.openai.images.generate({
        model: this.configService.get<string>('OPENAI_IMAGE_MODEL', 'gpt-image-2'),
        prompt: `Create a clean square tech icon for ${skillName}. Minimal flat style, modern, bold, no text, transparent background, suitable for CV skill badge.`,
        size: '1024x1024',
        quality: 'low',
      });

      const imageBase64 = (response as { data?: Array<{ b64_json?: string; url?: string }> }).data?.[0]?.b64_json;
      if (imageBase64) {
        const buffer = Buffer.from(imageBase64, 'base64');
        const optimized = await sharp(buffer)
          .resize(128, 128, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .webp({ quality: 85 })
          .toBuffer();
        return `data:image/webp;base64,${optimized.toString('base64')}`;
      }
    } catch (error) {
      console.error('Failed to generate skill icon via OpenAI', error);
    }

    return this.buildFallbackSvg(skillName);
  }

  private ensureGenerationAllowed(userId: string): void {
    const now = Date.now();
    const state = this.requestBuckets.get(userId);
    if (!state) {
      this.requestBuckets.set(userId, { timestamps: [], generatedCount: 0 });
      return;
    }

    const recentRequests = state.timestamps.filter(
      (timestamp) => now - timestamp < this.rateLimitWindowMs,
    );

    if (recentRequests.length >= this.maxRequestsPerWindow) {
      throw new HttpException('Too many icon requests. Please try again shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (state.generatedCount >= this.maxGenerationsPerUser) {
      throw new HttpException('Generation limit reached for this user.', HttpStatus.TOO_MANY_REQUESTS);
    }

    state.timestamps = recentRequests;
    state.timestamps.push(now);
    this.requestBuckets.set(userId, state);
  }

  private recordGeneration(userId: string): void {
    const state = this.requestBuckets.get(userId);
    if (!state) return;
    state.generatedCount += 1;
    this.requestBuckets.set(userId, state);
  }

  private buildFallbackSvg(skillName: string): string {
    const safeName = skillName
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const initials = safeName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase() || '?';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#2563eb"/><circle cx="64" cy="64" r="38" fill="#ffffff" opacity="0.2"/><text x="64" y="74" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff">${initials}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }
}

import * as cheerio from 'cheerio';

export type LandingPageAnalysisResult = {
  url: string;
  statusCode: number;
  isHTTPS: boolean;
  loadTimeMs: number;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  hasMobileViewport: boolean;
  hasCTA: boolean;
  hasForm: boolean;
  hasPhone: boolean;
  hasVideo: boolean;
  hasSocialProof: boolean;
  hasSchema: boolean;
  wordCount: number;
  imageCount: number;
  warnings: string[];
};

const FETCH_TIMEOUT_MS = 12_000;
const MAX_BODY_BYTES = 1_500_000;

const CTA_RE =
  /\b(get started|sign up|signup|buy now|request (a )?demo|book (a )?demo|contact us|call now|subscribe|download|try free|start free|apply now|get quote)\b/i;

const SOCIAL_RE =
  /\b(testimonial|reviews?|trustpilot|stars?|customers?|case stud|as seen|logo wall|featured in)\b/i;

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === '127.0.0.1' || h.startsWith('127.')) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(h)) return true;
  const m = /^172\.(\d+)\.\d+\.\d+$/.exec(h);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 16 && n <= 31) return true;
  }
  if (h === '0.0.0.0' || h === '[::1]' || h === '::1') return true;
  return false;
}

function normalizeInputUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('URL is required.');
  const withProto =
    /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let u: URL;
  try {
    u = new URL(withProto);
  } catch {
    throw new Error('Invalid URL.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed.');
  }
  if (isBlockedHostname(u.hostname)) {
    throw new Error('That host is not allowed.');
  }
  return u;
}

export async function analyzeLandingPageUrl(
  rawUrl: string
): Promise<LandingPageAnalysisResult> {
  const url = normalizeInputUrl(rawUrl);
  const isHTTPS = url.protocol === 'https:';
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let statusCode = 0;
  let html = '';

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'AI-Media-Buyer-LandingAnalyzer/1.0',
      },
    });
    statusCode = res.status;
    const len = res.headers.get('content-length');
    if (len && parseInt(len, 10) > MAX_BODY_BYTES) {
      throw new Error('Page too large to analyze.');
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BODY_BYTES) {
      throw new Error('Page too large to analyze.');
    }
    html = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  } catch (e) {
    const err = e as Error;
    if (err.name === 'AbortError') {
      throw new Error('Request timed out.');
    }
    throw new Error(err.message || 'Failed to fetch URL.');
  } finally {
    clearTimeout(timer);
  }

  const loadTimeMs = Math.max(0, Date.now() - started);
  const $ = cheerio.load(html);

  const title = $('title').first().text().trim() || null;
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    null;
  const h1 = $('h1').first().text().trim() || null;

  const hasMobileViewport = $('meta[name="viewport"]').length > 0;
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText
    ? bodyText.split(/\s+/).filter(Boolean).length
    : 0;
  const imageCount = $('img').length;

  const hasForm = $('form').length > 0;
  const hasPhone =
    $('a[href^="tel:"]').length > 0 ||
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(bodyText);

  const hasVideo =
    $('video').length > 0 ||
    $('iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="vimeo"]').length >
      0;

  const hasSchema = $('script[type="application/ld+json"]').length > 0;

  let hasCTA = $('a, button').toArray().some((el) => {
    const t = $(el).text().trim();
    return Boolean(t && CTA_RE.test(t));
  });
  if (!hasCTA) {
    hasCTA =
      $('[class*="cta"], [id*="cta"]').length > 0 ||
      $('[class*="CTA"]').length > 0;
  }

  const hasSocialProof =
    SOCIAL_RE.test(bodyText) ||
    $('[class*="testimonial"], [class*="review"]').length > 0;

  const warnings: string[] = [];
  if (!isHTTPS) warnings.push('Not using HTTPS.');
  if (loadTimeMs > 3500) warnings.push('Slow response time may hurt conversion.');
  if (!hasMobileViewport) warnings.push('No viewport meta tag (mobile UX risk).');
  if (!metaDescription) warnings.push('Missing meta description.');
  if (!h1) warnings.push('No H1 found.');
  if (!hasCTA) warnings.push('No obvious CTA text found.');
  if (wordCount < 120) warnings.push('Very little copy above the fold / page.');
  if (statusCode >= 400) warnings.push(`HTTP ${statusCode} from server.`);

  return {
    url: url.toString(),
    statusCode,
    isHTTPS,
    loadTimeMs,
    title,
    metaDescription,
    h1,
    hasMobileViewport,
    hasCTA,
    hasForm,
    hasPhone,
    hasVideo,
    hasSocialProof,
    hasSchema,
    wordCount,
    imageCount,
    warnings,
  };
}

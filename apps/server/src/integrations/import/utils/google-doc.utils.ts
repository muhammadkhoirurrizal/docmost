import { BadRequestException } from '@nestjs/common';

const GOOGLE_DOCS_ORIGIN = 'https://docs.google.com';
const GOOGLE_DOC_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_REDIRECTS = 3;
const GOOGLE_USER_CONTENTS_SUFFIX = '.googleusercontent.com';

export const GOOGLE_DOC_EXPORT_TIMEOUT_MS = 30_000;

export function parseGoogleDocId(url: unknown): string | null {
  if (typeof url !== 'string' || url.length === 0 || url.trim() !== url) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  if (
    parsedUrl.href !== url ||
    parsedUrl.origin !== GOOGLE_DOCS_ORIGIN ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    return null;
  }

  const match = parsedUrl.pathname.match(
    /^\/document\/d\/([^/]+)(?:\/[^/]+)*$/,
  );
  if (!match || match[1] === 'e' || !GOOGLE_DOC_ID_PATTERN.test(match[1])) {
    return null;
  }

  return match[1];
}

export function buildGoogleDocExportUrl(documentId: string): string {
  return `${GOOGLE_DOCS_ORIGIN}/document/d/${documentId}/export?format=zip`;
}

export async function downloadGoogleDocZip(
  url: unknown,
  maxBytes: number,
  fetchImpl: typeof fetch = fetch,
): Promise<Buffer> {
  const documentId = parseGoogleDocId(url);
  if (!documentId) {
    throw new BadRequestException(
      'url must be a canonical Google Docs URL in the form https://docs.google.com/document/d/{id}',
    );
  }

  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new BadRequestException(
      'The configured import size limit is invalid',
    );
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, GOOGLE_DOC_EXPORT_TIMEOUT_MS);

  let response: Response;
  let requestUrl = buildGoogleDocExportUrl(documentId);
  let redirectsFollowed = 0;
  try {
    while (true) {
      response = await fetchImpl(requestUrl, {
        method: 'GET',
        redirect: 'manual',
        credentials: 'omit',
        signal: controller.signal,
      });

      if (response.status < 300 || response.status >= 400) {
        break;
      }

      if (redirectsFollowed >= MAX_REDIRECTS) {
        throw new BadRequestException(
          'Google Docs export exceeded the maximum number of redirects',
        );
      }

      const location = response.headers.get('location');
      if (!location || location.trim().length === 0) {
        throw new BadRequestException(
          'Google Docs export redirect did not include a Location header',
        );
      }

      requestUrl = validateRedirectUrl(location, requestUrl);
      redirectsFollowed += 1;
    }

    if (response.status !== 200) {
      throw new BadRequestException(
        `Google Docs export failed with HTTP status ${response.status}`,
      );
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const parsedContentLength = Number(contentLength);
      if (
        Number.isFinite(parsedContentLength) &&
        parsedContentLength > maxBytes
      ) {
        throw new BadRequestException(
          'Google Docs export exceeds the configured import size limit',
        );
      }
    }

    const fileBuffer = await readResponseBuffer(response, maxBytes);
    if (!isZipBuffer(fileBuffer)) {
      throw new BadRequestException(
        'Google Docs export did not return a ZIP archive',
      );
    }

    return fileBuffer;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    if (timedOut) {
      throw new BadRequestException(
        'Google Docs export request timed out after 30 seconds',
      );
    }

    throw new BadRequestException('Unable to download Google Docs export');
  } finally {
    clearTimeout(timeout);
  }
}

function validateRedirectUrl(location: string, currentUrl: string): string {
  let redirectUrl: URL;
  try {
    redirectUrl = new URL(location, currentUrl);
  } catch {
    throw new BadRequestException(
      'Google Docs export returned an invalid redirect URL',
    );
  }

  if (
    redirectUrl.protocol !== 'https:' ||
    redirectUrl.username ||
    redirectUrl.password ||
    redirectUrl.port ||
    hasExplicitPort(location) ||
    !isAllowedRedirectHost(redirectUrl.hostname)
  ) {
    throw new BadRequestException(
      'Google Docs export redirect URL is not allowed',
    );
  }

  return redirectUrl.href;
}

function isAllowedRedirectHost(hostname: string): boolean {
  return (
    hostname === 'docs.google.com' ||
    (hostname.endsWith(GOOGLE_USER_CONTENTS_SUFFIX) &&
      hostname.length > GOOGLE_USER_CONTENTS_SUFFIX.length)
  );
}

function hasExplicitPort(location: string): boolean {
  const authorityMatch = location
    .trim()
    .match(/^(?:[A-Za-z][A-Za-z\d+.-]*:)?\/\/([^/?#]*)/);
  if (!authorityMatch) return false;

  const hostPort = authorityMatch[1].slice(
    authorityMatch[1].lastIndexOf('@') + 1,
  );
  if (hostPort.startsWith('[')) {
    const closingBracket = hostPort.indexOf(']');
    return closingBracket >= 0 && hostPort[closingBracket + 1] === ':';
  }

  return hostPort.includes(':');
}

async function readResponseBuffer(
  response: Response,
  maxBytes: number,
): Promise<Buffer> {
  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) {
      throw new BadRequestException(
        'Google Docs export exceeds the configured import size limit',
      );
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new BadRequestException(
          'Google Docs export exceeds the configured import size limit',
        );
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes);
}

function isZipBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;

  return (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    ((buffer[2] === 0x03 && buffer[3] === 0x04) ||
      (buffer[2] === 0x05 && buffer[3] === 0x06) ||
      (buffer[2] === 0x07 && buffer[3] === 0x08))
  );
}

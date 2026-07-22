import { BadRequestException } from '@nestjs/common';
import {
  buildGoogleDocExportUrl,
  downloadGoogleDocZip,
  parseGoogleDocId,
} from './google-doc.utils';

describe('Google Docs import helpers', () => {
  describe('parseGoogleDocId', () => {
    it.each([
      'https://docs.google.com/document/d/document-id_123',
      'https://docs.google.com/document/d/document-id_123/edit?tab=sharing',
      'https://docs.google.com/document/d/document-id_123/edit?tab=sharing#heading',
      'https://docs.google.com/document/d/document-id_123/edit/advanced',
    ])('accepts %s', (url) => {
      expect(parseGoogleDocId(url)).toBe('document-id_123');
    });

    it.each([
      'http://docs.google.com/document/d/document-id',
      'https://www.google.com/document/d/document-id',
      'https://docs.google.com/document/d/document-id/',
      'https://docs.google.com/document/d/e/2PACX-1-example/pub',
      'https://user:password@docs.google.com/document/d/document-id',
      'https://docs.google.com/document/d/invalid.id',
      '',
    ])('rejects %s', (url) => {
      expect(parseGoogleDocId(url)).toBeNull();
    });
  });

  describe('downloadGoogleDocZip', () => {
    const sourceUrl =
      'https://docs.google.com/document/d/document-id_123/edit?tab=sharing';
    const canonicalUrl = 'https://docs.google.com/document/d/document-id_123';
    const exportUrl = buildGoogleDocExportUrl('document-id_123');

    it('downloads a ZIP from the reconstructed export URL', async () => {
      const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);
      const fetchMock = jest.fn().mockResolvedValue(
        new Response(zip, {
          status: 200,
          headers: { 'content-length': String(zip.length) },
        }),
      );

      await expect(
        downloadGoogleDocZip(canonicalUrl, 1024, fetchMock),
      ).resolves.toEqual(zip);

      expect(fetchMock).toHaveBeenCalledWith(
        exportUrl,
        expect.objectContaining({
          method: 'GET',
          redirect: 'manual',
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('downloads a ZIP from a standard share URL', async () => {
      const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);
      const fetchMock = jest.fn().mockResolvedValue(
        new Response(zip, {
          status: 200,
          headers: { 'content-length': String(zip.length) },
        }),
      );

      await expect(
        downloadGoogleDocZip(sourceUrl, 1024, fetchMock),
      ).resolves.toEqual(zip);
      expect(fetchMock).toHaveBeenCalledWith(
        exportUrl,
        expect.objectContaining({
          method: 'GET',
          redirect: 'manual',
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('follows an allowed redirect to a googleusercontent.com download URL', async () => {
      const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);
      const downloadUrl =
        'https://doc-0-123.googleusercontent.com/download/export.zip';
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(
          new Response(null, {
            status: 307,
            headers: { location: downloadUrl },
          }),
        )
        .mockResolvedValueOnce(
          new Response(zip, {
            status: 200,
            headers: { 'content-length': String(zip.length) },
          }),
        );

      await expect(
        downloadGoogleDocZip(canonicalUrl, 1024, fetchMock),
      ).resolves.toEqual(zip);

      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        downloadUrl,
        expect.objectContaining({
          method: 'GET',
          redirect: 'manual',
          credentials: 'omit',
          signal: expect.any(AbortSignal),
        }),
      );
      expect(fetchMock.mock.calls[1][1]).not.toHaveProperty('headers');
    });

    it.each([
      ['missing Location', undefined],
      ['HTTP downgrade', 'http://docs.google.com/download/export.zip'],
      ['arbitrary host', 'https://example.com/download/export.zip'],
      ['credentials', 'https://user:password@docs.google.com/download.zip'],
      ['explicit port', 'https://docs.google.com:443/download.zip'],
    ])('rejects a redirect with %s', async (_reason, location) => {
      const fetchMock = jest.fn().mockResolvedValue(
        new Response(null, {
          status: 307,
          ...(location ? { headers: { location } } : {}),
        }),
      );

      await expect(
        downloadGoogleDocZip(canonicalUrl, 1024, fetchMock),
      ).rejects.toThrow(BadRequestException);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('rejects more than three redirects', async () => {
      const fetchMock = jest.fn((requestUrl: RequestInfo | URL) =>
        Promise.resolve(
          new Response(null, {
            status: 307,
            headers: {
              location: `${String(requestUrl)}/next`,
            },
          }),
        ),
      );

      await expect(
        downloadGoogleDocZip(canonicalUrl, 1024, fetchMock),
      ).rejects.toThrow('maximum number of redirects');
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it.each([400, 500])('rejects an HTTP %s response', async (status) => {
      const fetchMock = jest
        .fn()
        .mockResolvedValue(new Response(null, { status }));

      await expect(
        downloadGoogleDocZip(canonicalUrl, 1024, fetchMock),
      ).rejects.toThrow(`HTTP status ${status}`);
    });

    it('rejects a non-ZIP response', async () => {
      const fetchMock = jest.fn().mockResolvedValue(
        new Response('not a zip', {
          status: 200,
        }),
      );

      await expect(
        downloadGoogleDocZip(canonicalUrl, 1024, fetchMock),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a response over the configured byte limit', async () => {
      const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);
      const fetchMock = jest.fn().mockResolvedValue(
        new Response(zip, {
          status: 200,
          headers: { 'content-length': String(zip.length) },
        }),
      );

      await expect(
        downloadGoogleDocZip(canonicalUrl, zip.length - 1, fetchMock),
      ).rejects.toThrow('exceeds the configured import size limit');
    });
  });
});

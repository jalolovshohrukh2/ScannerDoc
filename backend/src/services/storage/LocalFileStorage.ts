import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import type { FileStorage, StoredFile } from './FileStorage';

const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
};

function extFor(contentType: string, originalName: string): string {
  if (CONTENT_TYPE_EXT[contentType]) return CONTENT_TYPE_EXT[contentType];
  const e = path.extname(originalName).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.bmp'].includes(e)) return e === '.jpeg' ? '.jpg' : e;
  return '.bin';
}

export class LocalFileStorage implements FileStorage {
  constructor(private uploadsDir: string, private publicBaseUrl = '/uploads') {}

  private async ensureDir() {
    await fs.mkdir(this.uploadsDir, { recursive: true });
  }

  async save(buffer: Buffer, originalName: string, contentType: string): Promise<StoredFile> {
    await this.ensureDir();
    const id = uuid();
    const ext = extFor(contentType, originalName);
    const fileName = `${id}${ext}`;
    const absolutePath = path.join(this.uploadsDir, fileName);
    await fs.writeFile(absolutePath, buffer);
    return {
      id: fileName,
      url: `${this.publicBaseUrl}/${fileName}`,
      absolutePath,
      contentType,
      size: buffer.length,
    };
  }

  async resolve(id: string): Promise<{ absolutePath: string; contentType: string } | null> {
    if (!/^[a-zA-Z0-9._-]+$/.test(id)) return null;
    const absolutePath = path.join(this.uploadsDir, id);
    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) return null;
    } catch {
      return null;
    }
    const ext = path.extname(id).toLowerCase();
    const contentType =
      ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.png'
        ? 'image/png'
        : ext === '.webp'
        ? 'image/webp'
        : ext === '.bmp'
        ? 'image/bmp'
        : 'application/octet-stream';
    return { absolutePath, contentType };
  }
}

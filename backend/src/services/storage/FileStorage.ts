export interface StoredFile {
  id: string;
  url: string;
  absolutePath: string;
  contentType: string;
  size: number;
}

export interface FileStorage {
  save(buffer: Buffer, originalName: string, contentType: string): Promise<StoredFile>;
  resolve(id: string): Promise<{ absolutePath: string; contentType: string } | null>;
}

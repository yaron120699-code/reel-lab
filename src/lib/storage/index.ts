import "@/lib/server-only";

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import { serverEnv } from "@/lib/config/env";

/**
 * Media storage seam. During the MVP files live on disk under `data/uploads`,
 * which is git-ignored. A Supabase Storage implementation only has to satisfy
 * this interface.
 */
export interface MediaStorage {
  save(params: {
    reelId: string;
    filename: string;
    bytes: Buffer;
  }): Promise<{ storageKey: string; byteSize: number }>;
  read(storageKey: string): Promise<Buffer>;
  stat(storageKey: string): Promise<{ byteSize: number } | null>;
  remove(storageKey: string): Promise<void>;
}

/** Keys are opaque, relative and traversal-free: `reels/<reelId>/<uuid>.<ext>`. */
function buildKey(reelId: string, filename: string): string {
  const ext = path.extname(filename).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".mp4";
  return `reels/${reelId}/${randomUUID()}${ext}`;
}

class LocalFileStorage implements MediaStorage {
  constructor(private readonly rootDir: string) {}

  private resolve(storageKey: string): string {
    const target = path.resolve(this.rootDir, storageKey);
    const root = path.resolve(this.rootDir);
    if (target !== root && !target.startsWith(root + path.sep)) {
      throw new Error("Refusing to touch a path outside the storage directory.");
    }
    return target;
  }

  async save(params: { reelId: string; filename: string; bytes: Buffer }) {
    const storageKey = buildKey(params.reelId, params.filename);
    const target = this.resolve(storageKey);
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, params.bytes);
    return { storageKey, byteSize: params.bytes.byteLength };
  }

  async read(storageKey: string): Promise<Buffer> {
    return fsp.readFile(this.resolve(storageKey));
  }

  async stat(storageKey: string): Promise<{ byteSize: number } | null> {
    try {
      const stats = await fsp.stat(this.resolve(storageKey));
      return { byteSize: stats.size };
    } catch {
      return null;
    }
  }

  async remove(storageKey: string): Promise<void> {
    await fsp.rm(this.resolve(storageKey), { force: true });
  }
}

let cached: MediaStorage | null = null;

export function getMediaStorage(): MediaStorage {
  if (cached) return cached;
  const root = serverEnv.storageDir;
  fs.mkdirSync(root, { recursive: true });
  cached = new LocalFileStorage(root);
  return cached;
}

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DocumentIndex, DocumentMetadata, UploadDocumentResponse } from "./types.js";
import { preprocessDocument } from "./preprocessor.js";

export class DocumentManager {
  private baseDir: string;
  private indexDir: string;
  private rawDir: string;
  private preprocessDir: string;
  private indexPath: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), "storage");
    this.indexDir = path.join(this.baseDir, "index");
    this.rawDir = path.join(this.baseDir, "documents", "raw");
    this.preprocessDir = path.join(this.baseDir, "documents", "preprocess");
    this.indexPath = path.join(this.indexDir, "documents-index.json");

    this.ensureDirectories();
  }

  private ensureDirectories() {
    if (!fs.existsSync(this.indexDir)) fs.mkdirSync(this.indexDir, { recursive: true });
    if (!fs.existsSync(this.rawDir)) fs.mkdirSync(this.rawDir, { recursive: true });
    if (!fs.existsSync(this.preprocessDir)) fs.mkdirSync(this.preprocessDir, { recursive: true });
  }

  public getIndex(): DocumentIndex {
    if (!fs.existsSync(this.indexPath)) {
      return {};
    }
    try {
      const raw = fs.readFileSync(this.indexPath, "utf-8");
      return JSON.parse(raw) as DocumentIndex;
    } catch {
      return {};
    }
  }

  private saveIndex(index: DocumentIndex): void {
    fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2), "utf-8");
  }

  public computeHash(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Upload, deduplicate, convert, and index a document.
   */
  public async ingestDocument(fileName: string, fileBase64: string): Promise<UploadDocumentResponse> {
    try {
      const fileBuffer = Buffer.from(fileBase64, "base64");
      const hash = this.computeHash(fileBuffer);
      const ext = path.extname(fileName).toLowerCase() || ".txt";

      const index = this.getIndex();

      // Check for CAS deduplication
      if (index[hash]) {
        const existing = index[hash];
        const rawPath = path.join(this.rawDir, existing.rawFileName);
        const textPath = path.join(this.preprocessDir, existing.preprocessFileName);

        // Verify both disk files still exist
        if (fs.existsSync(rawPath) && fs.existsSync(textPath)) {
          return {
            success: true,
            isDuplicate: true,
            document: existing,
          };
        }
      }

      // 1. Save original raw file
      const rawFileName = `${hash}${ext}`;
      const rawFilePath = path.join(this.rawDir, rawFileName);
      fs.writeFileSync(rawFilePath, fileBuffer);

      // 2. Preprocess document into clean structured plaintext
      const preprocessed = await preprocessDocument(fileBuffer, fileName);

      // 3. Save preprocessed text file
      const preprocessFileName = `${hash}.txt`;
      const preprocessFilePath = path.join(this.preprocessDir, preprocessFileName);
      fs.writeFileSync(preprocessFilePath, preprocessed.text, "utf-8");

      // 4. Update index catalog
      const metadata: DocumentMetadata = {
        hash,
        originalName: fileName,
        extension: ext,
        mimeType: this.guessMimeType(ext),
        fileSize: fileBuffer.length,
        charCount: preprocessed.charCount,
        createdAt: new Date().toISOString(),
        previewSnippet: preprocessed.previewSnippet,
        rawFileName,
        preprocessFileName,
        sheetCount: preprocessed.sheetCount,
        sheetNames: preprocessed.sheetNames,
      };

      index[hash] = metadata;
      this.saveIndex(index);

      return {
        success: true,
        isDuplicate: false,
        document: metadata,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to ingest document",
      };
    }
  }

  /**
   * Retrieve combined preprocessed context text for a list of document hashes.
   */
  public getPreprocessedContext(docHashes: string[]): { context: string; activeCount: number; totalCharacters: number } {
    if (!docHashes || docHashes.length === 0) {
      return { context: "", activeCount: 0, totalCharacters: 0 };
    }

    const index = this.getIndex();
    const blocks: string[] = [];
    let activeCount = 0;
    let totalCharacters = 0;

    for (const hash of docHashes) {
      const doc = index[hash];
      if (!doc) continue;

      const preprocessPath = path.join(this.preprocessDir, doc.preprocessFileName);
      if (fs.existsSync(preprocessPath)) {
        const text = fs.readFileSync(preprocessPath, "utf-8").trim();
        if (text) {
          activeCount++;
          totalCharacters += text.length;
          blocks.push(text);
        }
      }
    }

    return {
      context: blocks.join("\n\n"),
      activeCount,
      totalCharacters,
    };
  }

  /**
   * Delete document by hash.
   */
  public deleteDocument(hash: string): boolean {
    const index = this.getIndex();
    const doc = index[hash];
    if (!doc) return false;

    const rawPath = path.join(this.rawDir, doc.rawFileName);
    const textPath = path.join(this.preprocessDir, doc.preprocessFileName);

    if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath);
    if (fs.existsSync(textPath)) fs.unlinkSync(textPath);

    delete index[hash];
    this.saveIndex(index);
    return true;
  }

  /**
   * Get specific documents by array of hashes (strictly scoped to a session)
   */
  public getDocumentsByHashes(hashes: string[]): DocumentMetadata[] {
    if (!hashes || hashes.length === 0) return [];
    const index = this.getIndex();
    return hashes
      .map((h) => index[h])
      .filter((doc): doc is DocumentMetadata => !!doc);
  }

  public listDocuments(): DocumentMetadata[] {
    const index = this.getIndex();
    return Object.values(index).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private guessMimeType(ext: string): string {
    switch (ext) {
      case ".xlsx":
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      case ".xls":
        return "application/vnd.ms-excel";
      case ".csv":
        return "text/csv";
      case ".pdf":
        return "application/pdf";
      case ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case ".json":
        return "application/json";
      case ".md":
        return "text/markdown";
      case ".html":
      case ".htm":
        return "text/html";
      default:
        return "text/plain";
    }
  }
}

export const documentManager = new DocumentManager();

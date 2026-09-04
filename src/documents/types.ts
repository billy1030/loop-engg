export interface DocumentMetadata {
  hash: string;
  originalName: string;
  extension: string;
  mimeType: string;
  fileSize: number;
  charCount: number;
  createdAt: string;
  previewSnippet: string;
  rawFileName: string;
  preprocessFileName: string;
  sheetCount?: number;
  sheetNames?: string[];
}

export type DocumentIndex = Record<string, DocumentMetadata>;

export interface UploadDocumentPayload {
  fileName: string;
  fileBase64: string;
}

export interface UploadDocumentResponse {
  success: boolean;
  document?: DocumentMetadata;
  isDuplicate?: boolean;
  error?: string;
}

export interface DocumentContextResponse {
  success: boolean;
  context: string;
  activeCount: number;
  totalCharacters: number;
}

declare module 'mammoth' {
  export interface RawTextResult {
    value: string;
    messages: any[];
  }

  export function extractRawText(input: { buffer: Buffer } | { path: string }): Promise<RawTextResult>;
  export function convertToHtml(input: { buffer: Buffer } | { path: string }, options?: any): Promise<{ value: string; messages: any[] }>;
  export function convertToMarkdown(input: { buffer: Buffer } | { path: string }, options?: any): Promise<{ value: string; messages: any[] }>;
}

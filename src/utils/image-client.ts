export type EditableImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp'

export interface ImageClient {
  generateImage(options: GenerateImageOptions): Promise<Buffer>;
  editImage(options: EditImageOptions): Promise<Buffer>;
}

export interface GenerateImageOptions {
  prompt: string;
}

export interface EditImageOptions {
  prompt: string;
  imageMimeType: EditableImageMimeType;
  imageData: Buffer;
}

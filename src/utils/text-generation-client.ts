export interface TextGenerationClient {
  prompt(options: PromptOptions): Promise<string>;
}

export interface PromptOptions {
  systemInstruction: string | undefined;
  prompt: string;
}

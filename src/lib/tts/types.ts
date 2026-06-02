export interface TTSSynthesizeInput {
  text: string;
  speaker?: string;
  audioFormat?: 'mp3' | 'wav' | 'pcm';
  sampleRate?: number;
}

export interface TTSSynthesizeResult {
  audioUri: string;
  audioSize: number;
}

export interface TTSProvider {
  name: string;
  synthesize(input: TTSSynthesizeInput): Promise<TTSSynthesizeResult>;
}

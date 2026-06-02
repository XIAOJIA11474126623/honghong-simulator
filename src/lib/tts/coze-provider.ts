import { Config, HeaderUtils, TTSClient } from 'coze-coding-dev-sdk';
import type { TTSProvider, TTSSynthesizeInput, TTSSynthesizeResult } from './types';

export class CozeTTSProvider implements TTSProvider {
  name = 'coze';

  private headers: Headers;

  constructor(headers: Headers) {
    this.headers = headers;
  }

  async synthesize(input: TTSSynthesizeInput): Promise<TTSSynthesizeResult> {
    const customHeaders = HeaderUtils.extractForwardHeaders(this.headers);
    const config = new Config();
    const client = new TTSClient(config, customHeaders);

    const response = await client.synthesize({
      uid: 'honghong-user',
      text: input.text.slice(0, 500),
      speaker: input.speaker || 'zh_female_xiaohe_uranus_bigtts',
      audioFormat: 'mp3',
      sampleRate: 24000,
    });

    return {
      audioUri: response.audioUri,
      audioSize: response.audioSize,
    };
  }
}

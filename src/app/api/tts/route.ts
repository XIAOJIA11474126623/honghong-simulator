import { NextRequest, NextResponse } from 'next/server';
import { TTSClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { text, speaker } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: '缺少text参数' }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new TTSClient(config, customHeaders);

    const response = await client.synthesize({
      uid: 'honghong-user',
      text: text.slice(0, 500), // 限制文本长度，避免过长
      speaker: speaker || 'zh_female_xiaohe_uranus_bigtts',
      audioFormat: 'mp3',
      sampleRate: 24000,
    });

    return NextResponse.json({
      audioUri: response.audioUri,
      audioSize: response.audioSize,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '语音合成失败';
    console.error('[TTS Error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

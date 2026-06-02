import { NextRequest, NextResponse } from 'next/server';
import { toTTSError } from '@/lib/tts/errors';
import { createTTSProvider } from '@/lib/tts/provider-factory';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let providerName = process.env.AI_TTS_PROVIDER || 'volcengine';

  try {
    const body = await request.json() as { text?: unknown; speaker?: unknown };
    const text = body.text;
    const speaker = typeof body.speaker === 'string' ? body.speaker : undefined;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: '缺少text参数' }, { status: 400 });
    }

    const provider = createTTSProvider(request.headers);
    providerName = provider.name;
    console.info('[TTS] start', { provider: providerName, textLength: text.length, speaker });

    const response = await provider.synthesize({
      text,
      speaker,
      audioFormat: 'mp3',
      sampleRate: 24000,
    });

    console.info('[TTS] end', {
      provider: providerName,
      elapsedMs: Date.now() - startedAt,
      status: 200,
      audioSize: response.audioSize,
    });

    return NextResponse.json({
      audioUri: response.audioUri,
      audioSize: response.audioSize,
    });
  } catch (error: unknown) {
    const ttsError = toTTSError(error, providerName);
    console.error('[TTS] error', {
      provider: ttsError.provider,
      elapsedMs: Date.now() - startedAt,
      status: ttsError.statusCode,
      kind: ttsError.kind,
      message: ttsError.message,
    });

    return NextResponse.json({ error: ttsError.message }, { status: ttsError.statusCode });
  }
}

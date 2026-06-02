import WebSocket from 'ws';
import type { TTSProvider, TTSSynthesizeInput, TTSSynthesizeResult } from './types';
import { TTSError } from './errors';

interface VolcengineTTSConfig {
  endpoint: string;
  apiKey: string;
  resourceId: string;
  timeoutMs: number;
}

const DEFAULT_ENDPOINT = 'wss://openspeech.bytedance.com/api/v3/tts/unidirectional/stream';
const DEFAULT_RESOURCE_ID = 'seed-tts-2.0';
const EVENT_FINISH_CONNECTION = 2;
const EVENT_SESSION_FINISHED = 152;
const EVENT_SESSION_FAILED = 153;
const MSG_FULL_CLIENT_WITH_EVENT = 0x14;
const MSG_FULL_CLIENT_NO_EVENT = 0x10;
const MSG_FULL_SERVER_RESPONSE = 0x94;
const MSG_AUDIO_ONLY_RESPONSE = 0xb4;
const MSG_ERROR = 0xf0;
const SERIAL_JSON = 0x10;

function getConfig(): VolcengineTTSConfig {
  const apiKey = process.env.VOLCENGINE_TTS_API_KEY;

  if (!apiKey) {
    throw new TTSError('缺少火山TTS凭证：请配置 VOLCENGINE_TTS_API_KEY', {
      kind: 'config',
      statusCode: 500,
      provider: 'volcengine',
    });
  }

  return {
    endpoint: process.env.VOLCENGINE_TTS_ENDPOINT || DEFAULT_ENDPOINT,
    apiKey,
    resourceId: process.env.VOLCENGINE_TTS_RESOURCE_ID || DEFAULT_RESOURCE_ID,
    timeoutMs: Number(process.env.VOLCENGINE_TTS_TIMEOUT_MS || 30000),
  };
}

function parseJsonPayload(buffer: Buffer): unknown {
  if (buffer.length === 0) return null;
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    return null;
  }
}

function writeUInt32BE(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value, 0);
  return buffer;
}

function writeInt32BE(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(value, 0);
  return buffer;
}

function makeLengthPrefixedPayload(payload: unknown): Buffer {
  const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
  return Buffer.concat([writeUInt32BE(payloadBytes.length), payloadBytes]);
}

function makeSendTextPacket(payload: unknown): Buffer {
  return Buffer.concat([
    Buffer.from([0x11, MSG_FULL_CLIENT_NO_EVENT, SERIAL_JSON, 0x00]),
    makeLengthPrefixedPayload(payload),
  ]);
}

function makeFinishConnectionPacket(): Buffer {
  return Buffer.concat([
    Buffer.from([0x11, MSG_FULL_CLIENT_WITH_EVENT, SERIAL_JSON, 0x00]),
    writeInt32BE(EVENT_FINISH_CONNECTION),
    makeLengthPrefixedPayload({}),
  ]);
}

function readLengthPrefixedBuffer(buffer: Buffer, offset: number): { value: Buffer; nextOffset: number } {
  if (offset + 4 > buffer.length) return { value: Buffer.alloc(0), nextOffset: buffer.length };
  const size = buffer.readUInt32BE(offset);
  const start = offset + 4;
  const end = Math.min(start + size, buffer.length);
  return { value: buffer.subarray(start, end), nextOffset: end };
}

interface ParsedServerPacket {
  msgType: number;
  event: number;
  audio: Buffer;
  payload: unknown;
  errorCode: number;
}

function parseServerPacket(buffer: Buffer): ParsedServerPacket {
  const empty: ParsedServerPacket = {
    msgType: 0,
    event: 0,
    audio: Buffer.alloc(0),
    payload: null,
    errorCode: 0,
  };

  if (buffer.length < 4) return empty;

  const msgType = buffer[1];
  let offset = 4;

  if (msgType === MSG_ERROR) {
    if (offset + 4 > buffer.length) return { ...empty, msgType };
    const errorCode = buffer.readInt32BE(offset);
    offset += 4;
    const payloadBuffer = readLengthPrefixedBuffer(buffer, offset).value;
    return {
      msgType,
      event: errorCode,
      audio: Buffer.alloc(0),
      payload: parseJsonPayload(payloadBuffer) ?? payloadBuffer.toString('utf8'),
      errorCode,
    };
  }

  if (offset + 4 > buffer.length) return { ...empty, msgType };
  const event = buffer.readInt32BE(offset);
  offset += 4;

  if (event === 52) {
    const connectionId = readLengthPrefixedBuffer(buffer, offset);
    offset = connectionId.nextOffset;
    const payloadBuffer = readLengthPrefixedBuffer(buffer, offset).value;
    return {
      msgType,
      event,
      audio: Buffer.alloc(0),
      payload: parseJsonPayload(payloadBuffer) ?? payloadBuffer.toString('utf8'),
      errorCode: 0,
    };
  }

  const sessionId = readLengthPrefixedBuffer(buffer, offset);
  offset = sessionId.nextOffset;

  if (msgType === MSG_AUDIO_ONLY_RESPONSE) {
    return {
      msgType,
      event,
      audio: readLengthPrefixedBuffer(buffer, offset).value,
      payload: null,
      errorCode: 0,
    };
  }

  if (msgType === MSG_FULL_SERVER_RESPONSE) {
    const payloadBuffer = readLengthPrefixedBuffer(buffer, offset).value;
    return {
      msgType,
      event,
      audio: Buffer.alloc(0),
      payload: parseJsonPayload(payloadBuffer) ?? payloadBuffer.toString('utf8'),
      errorCode: 0,
    };
  }

  return { ...empty, msgType, event };
}

function describePayload(payload: unknown): string {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

export class VolcengineTTSProvider implements TTSProvider {
  name = 'volcengine';

  async synthesize(input: TTSSynthesizeInput): Promise<TTSSynthesizeResult> {
    const config = getConfig();
    const requestId = crypto.randomUUID();
    const chunks: Buffer[] = [];

    const headers: Record<string, string> = {
      'X-Api-Key': config.apiKey,
      'X-Api-Resource-Id': config.resourceId,
      'X-Api-Connect-Id': requestId,
      'X-Control-Require-Usage-Tokens-Return': '*',
    };

    const payload = {
      user: {
        uid: 'honghong-user',
      },
      req_params: {
        text: input.text.slice(0, 500),
        speaker: input.speaker || 'zh_female_xiaohe_uranus_bigtts',
        audio_params: {
          format: input.audioFormat || 'mp3',
          sample_rate: input.sampleRate || 24000,
        },
      },
    };

    const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
      const ws = new WebSocket(config.endpoint, { headers });
      let settled = false;

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(error);
      };

      const timeout = setTimeout(() => {
        ws.close();
        fail(new TTSError('TTS websocket timeout', { kind: 'timeout', statusCode: 504, provider: this.name }));
      }, config.timeoutMs);

      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (chunks.length === 0) {
          reject(new TTSError('TTS没有返回音频数据', { kind: 'unknown', statusCode: 500, provider: this.name }));
          return;
        }
        resolve(Buffer.concat(chunks));
      };

      ws.on('open', () => {
        ws.send(makeSendTextPacket(payload));
      });

      ws.on('message', (raw) => {
        const buffer = Buffer.isBuffer(raw)
          ? raw
          : Array.isArray(raw)
            ? Buffer.concat(raw)
            : Buffer.from(raw);
        const packet = parseServerPacket(buffer);

        if (packet.msgType === MSG_ERROR) {
          ws.close();
          fail(new TTSError(`火山TTS错误 ${packet.errorCode}: ${describePayload(packet.payload)}`, {
            kind: 'unknown',
            statusCode: 500,
            provider: this.name,
          }));
          return;
        }

        if (packet.event === EVENT_SESSION_FAILED) {
          ws.close();
          fail(new TTSError(`火山TTS会话失败: ${describePayload(packet.payload)}`, {
            kind: 'unknown',
            statusCode: 500,
            provider: this.name,
          }));
          return;
        }

        if (packet.audio.length > 0) {
          chunks.push(packet.audio);
        }

        if (packet.event === EVENT_SESSION_FINISHED) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(makeFinishConnectionPacket());
          }
          ws.close();
        }
      });

      ws.on('close', finish);

      ws.on('error', (error) => {
        fail(error);
      });
    });

    return {
      audioUri: `data:audio/${input.audioFormat || 'mp3'};base64,${audioBuffer.toString('base64')}`,
      audioSize: audioBuffer.length,
    };
  }
}

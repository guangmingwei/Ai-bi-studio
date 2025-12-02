import WebSocket, { WebSocketServer } from 'ws';
import { VolcEngineTTSClient } from './volcengine-ws.js';
import { VolcEngineASRClient } from './volcengine-asr-ws.js';
import * as zlib from 'zlib';
import axios from 'axios';

// ==================== 二进制协议常量 ====================
const PROTOCOL_VERSION = 0b0001;
const DEFAULT_HEADER_SIZE = 0b0001;

// 消息类型
const CLIENT_FULL_REQUEST = 0b0001;      // 常规上行请求消息，payload 为 JSON 格式
const CLIENT_AUDIO_ONLY_REQUEST = 0b0010; // 语音上行数据消息，payload 为二进制格式
const SERVER_FULL_RESPONSE = 0b1001;     // 常规下行响应消息，payload 为 JSON 格式
const SERVER_AUDIO_ONLY_RESPONSE = 0b1011; // 语音下行数据消息，payload 为二进制格式

// 消息类型特定标志
const NO_SEQUENCE = 0b0000;

// 序列化方式
const NO_SERIALIZATION = 0b0000;
const JSON_SERIALIZATION = 0b0001;

// 压缩方式
const NO_COMPRESSION = 0b0000;
const GZIP_COMPRESSION = 0b0001;

// 事件类型
const BOT_READY = 'BotReady';
const USER_AUDIO = 'UserAudio';
const SENTENCE_RECOGNIZED = 'SentenceRecognized';
const TTS_SENTENCE_START = 'TTSSentenceStart';
const TTS_SENTENCE_END = 'TTSSentenceEnd';
const TTS_DONE = 'TTSDone';
const BOT_ERROR = 'BotError';
const BOT_UPDATE_CONFIG = 'BotUpdateConfig';
const TOOL_CALL = 'ToolCall'; // 工具调用事件
const TOOL_RESULT = 'ToolResult'; // 工具执行结果事件

// ==================== 类型定义 ====================
interface WebEvent {
  event: string;
  payload?: any;
  data?: Buffer;
}

interface ParsedRequest {
  messageType: number;
  payload?: any;
  data?: Buffer;
}

// ==================== 二进制协议工具函数 ====================

/**
 * 生成WebSocket消息头
 */
function generateHeader(
  messageType: number,
  messageTypeSpecificFlags: number = NO_SEQUENCE,
  serializationMethod: number = JSON_SERIALIZATION,
  compressionType: number = NO_COMPRESSION
): Buffer {
  const header = Buffer.alloc(4);
  header.writeUInt8((PROTOCOL_VERSION << 4) | DEFAULT_HEADER_SIZE, 0);
  header.writeUInt8((messageType << 4) | messageTypeSpecificFlags, 1);
  header.writeUInt8((serializationMethod << 4) | compressionType, 2);
  header.writeUInt8(0x00, 3); // Reserved
  return header;
}

/**
 * 解析WebSocket请求
 */
function parseRequest(data: Buffer): ParsedRequest {
  const headerSize = data[0] & 0x0F;
  const messageType = (data[1] >> 4) & 0x0F;
  const serializationMethod = (data[2] >> 4) & 0x0F;
  const compressionType = data[2] & 0x0F;

  let ptr = headerSize * 4;
  const payloadLength = data.readUInt32BE(ptr);
  ptr += 4;
  const payloadData = data.slice(ptr, ptr + payloadLength);

  let finalPayloadData = payloadData;
  if (compressionType === GZIP_COMPRESSION) {
    finalPayloadData = zlib.gunzipSync(payloadData);
  }

  if (messageType === CLIENT_FULL_REQUEST) {
    // JSON格式
    try {
      const payload = JSON.parse(finalPayloadData.toString('utf-8'));
      return { messageType, payload };
    } catch (e) {
      console.error('[WS] Failed to parse JSON payload:', e);
      return { messageType, payload: null };
    }
  } else if (messageType === CLIENT_AUDIO_ONLY_REQUEST) {
    // 二进制音频数据
    return { messageType, data: finalPayloadData };
  } else {
    return { messageType, payload: null };
  }
}

/**
 * 将WebEvent转换为二进制响应
 */
function convertWebEventToBinary(event: WebEvent): Buffer {
  if (event.data) {
    // 音频数据响应
    const header = generateHeader(
      SERVER_AUDIO_ONLY_RESPONSE,
      NO_SEQUENCE,
      NO_SERIALIZATION,
      NO_COMPRESSION
    );
    const payloadLength = Buffer.alloc(4);
    payloadLength.writeUInt32BE(event.data.length, 0);
    return Buffer.concat([header, payloadLength, event.data]);
  } else {
    // JSON响应
    const payloadJson = JSON.stringify(event);
    const payloadBytes = Buffer.from(payloadJson, 'utf-8');
    const header = generateHeader(
      SERVER_FULL_RESPONSE,
      NO_SEQUENCE,
      JSON_SERIALIZATION,
      NO_COMPRESSION
    );
    const payloadLength = Buffer.alloc(4);
    payloadLength.writeUInt32BE(payloadBytes.length, 0);
    return Buffer.concat([header, payloadLength, payloadBytes]);
  }
}

/**
 * 将二进制数据转换为WebEvent
 */
function convertBinaryToWebEvent(data: Buffer): WebEvent {
  const parsed = parseRequest(data);
  
  if (parsed.messageType === CLIENT_FULL_REQUEST && parsed.payload) {
    // JSON格式请求
    return parsed.payload as WebEvent;
  } else if (parsed.messageType === CLIENT_AUDIO_ONLY_REQUEST && parsed.data) {
    // 音频数据请求
    return {
      event: USER_AUDIO,
      data: parsed.data
    };
  } else {
    return {
      event: 'Unknown',
      payload: null
    };
  }
}

// ==================== WebSocket处理器 ====================

export interface VoiceCallConfig {
  ASR_APP_ID: string;
  ASR_ACCESS_TOKEN: string;
  TTS_APP_ID: string;
  TTS_ACCESS_TOKEN: string;
  TTS_SPEAKER: string;
  LLM_ENDPOINT_ID: string;
  ARK_API_KEY: string;
}

export class VoiceCallWebSocketHandler {
  private wss: WebSocketServer;
  private config: VoiceCallConfig;

  constructor(config: VoiceCallConfig, port: number = 8888) {
    this.config = config;
    this.wss = new WebSocketServer({ port });
    
    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });
  }

  private async handleConnection(ws: WebSocket) {
    
    // 创建语音服务实例
    const service = new VoiceCallService(this.config);
    await service.init();
    
    // 发送BotReady事件
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const botReadyEvent: WebEvent = {
      event: BOT_READY,
      payload: { session: sessionId }
    };
    ws.send(convertWebEventToBinary(botReadyEvent));

    // 处理输入消息
    ws.on('message', async (data: Buffer) => {
      try {
        const inputEvent = convertBinaryToWebEvent(data);
        
        // 处理事件（异步处理，不立即返回事件）
        await service.handleInputEvent(inputEvent);
        // 事件会在静音检测时通过checkSilenceAndProcess生成
      } catch (error) {
        console.error('[VoiceCall WS] Error handling message:', error);
        const errorEvent: WebEvent = {
          event: BOT_ERROR,
          payload: { message: error instanceof Error ? error.message : 'Unknown error' }
        };
        ws.send(convertWebEventToBinary(errorEvent));
      }
    });

    // 定期检查静音检测（每500ms）
    const silenceCheckInterval = setInterval(async () => {
      try {
        const outputEvents = service.checkSilenceAndProcess();
        for await (const outputEvent of outputEvents) {
          ws.send(convertWebEventToBinary(outputEvent));
        }
      } catch (error) {
        console.error('[VoiceCall WS] Error in silence check:', error);
      }
    }, 500);

    ws.on('close', async () => {
      clearInterval(silenceCheckInterval);
      await service.cleanup();
    });

    // close事件处理已在上面添加

    ws.on('error', (error) => {
      console.error('[VoiceCall WS] WebSocket error:', error);
    });
  }
}

// ==================== 语音服务 ====================

class VoiceCallService {
  private asrClient: VolcEngineASRClient | null = null;
  private ttsClient: VolcEngineTTSClient | null = null;
  private config: VoiceCallConfig;
  private state: 'Idle' | 'InProgress' = 'Idle';
  private asrBuffer: string = '';
  private asrNoInputDuration: number = 0; // 累积无输入识别时长（毫秒）
  private asrLastDuration: number = 0; // 上次ASR识别时长
  private asrAudioQueue: Buffer[] = []; // 音频数据队列
  private asrProcessing: boolean = false; // 是否正在处理ASR
  private historyMessages: Array<{ role: string; content: string }> = [];
  private readonly ASR_INTERVAL = 2000; // 静音检测间隔（毫秒）
  private hasReceivedAudio: boolean = false; // 是否已收到音频数据
  private audioStartTime: number = 0; // 音频开始时间
  private currentTTSClient: VolcEngineTTSClient | null = null; // 当前正在使用的TTS客户端
  private asrInitializing: boolean = false; // ASR是否正在初始化中
  private asrInitFailed: boolean = false; // ASR初始化是否失败
  private asrInitFailTime: number = 0; // ASR初始化失败时间
  private readonly ASR_INIT_RETRY_DELAY = 5000; // ASR初始化重试延迟（毫秒）

  constructor(config: VoiceCallConfig) {
    this.config = config;
  }

  async init() {
    // 初始化ASR客户端
    this.asrClient = new VolcEngineASRClient(
      this.config.ASR_APP_ID,
      this.config.ASR_ACCESS_TOKEN
    );
    await this.asrClient.init();
    
    // 监听ASR响应
    this.asrClient.on('response', async (response) => {
      await this.handleASRResponse(response);
    });
    
    this.asrClient.on('text', (text: string) => {
      this.handleASRText(text);
    });
    
    this.asrClient.on('error', (error: Error) => {
      console.error('[VoiceCall Service] ASR error:', error);
      // 错误时重置状态，允许重新初始化
      this.state = 'Idle';
      if (this.asrClient) {
        this.asrClient.close().catch(() => {});
        this.asrClient = null;
      }
    });
    
    // 静音检测通过定期检查处理，不需要事件监听

    // 初始化TTS客户端
    this.ttsClient = new VolcEngineTTSClient(
      this.config.TTS_APP_ID,
      this.config.TTS_ACCESS_TOKEN,
      this.config.TTS_SPEAKER
    );
    await this.ttsClient.init();
  }

  async cleanup() {
    if (this.asrClient) {
      await this.asrClient.close();
      this.asrClient = null;
    }
    if (this.ttsClient) {
      await this.ttsClient.close();
      this.ttsClient = null;
    }
    this.asrAudioQueue = [];
    this.asrBuffer = '';
  }

  async handleInputEvent(inputEvent: WebEvent): Promise<void> {
    if (inputEvent.event === USER_AUDIO && inputEvent.data) {
      // 处理音频输入（异步发送到ASR，不等待响应）
      await this.processAudioInput(inputEvent.data);
      // 不立即返回事件，事件会在静音检测时通过checkSilenceAndProcess生成
    } else if (inputEvent.event === BOT_UPDATE_CONFIG && inputEvent.payload) {
      // 更新配置（如音色）
      if (inputEvent.payload.speaker) {
        // 重新初始化TTS客户端
        await this.cleanup();
        this.config.TTS_SPEAKER = inputEvent.payload.speaker;
        await this.init();
      }
    }
  }

  private async processAudioInput(audioData: Buffer): Promise<void> {
    // 如果正在处理中（TTS播放），用户说话打断TTS
    if (this.state === 'InProgress') {
      console.log('[用户输入] 检测到用户说话，打断TTS播放');
      // 停止当前TTS播放
      if (this.currentTTSClient) {
        try {
          await this.currentTTSClient.close();
        } catch (e) {
          // 忽略关闭错误
        }
        this.currentTTSClient = null;
      }
      // 重置状态，开始处理新的用户输入
      this.state = 'Idle';
      this.asrBuffer = '';
      this.asrNoInputDuration = 0;
      this.asrLastDuration = 0;
      this.hasReceivedAudio = false;
    }

    // 记录收到音频
    if (!this.hasReceivedAudio) {
      this.hasReceivedAudio = true;
      this.audioStartTime = Date.now();
      console.log(`[用户输入] 开始接收音频数据，大小: ${audioData.length} bytes`);
    }

    // 只有在Idle状态时才初始化ASR客户端
    // 避免并发初始化和重复初始化
    if (!this.asrClient || !this.asrClient.inited) {
      // 如果正在初始化，等待
      if (this.asrInitializing) {
        return;
      }

      // 如果最近初始化失败，等待一段时间再重试
      if (this.asrInitFailed && Date.now() - this.asrInitFailTime < this.ASR_INIT_RETRY_DELAY) {
        return;
      }

      // 如果之前有客户端，先关闭
      if (this.asrClient) {
        try {
          await this.asrClient.close();
        } catch (e) {
          // 忽略关闭错误
        }
      }
      
      this.asrInitializing = true;
      this.asrInitFailed = false;
      
      console.log(`[ASR初始化] 开始初始化ASR客户端...`);
      
      try {
        this.asrClient = new VolcEngineASRClient(
          this.config.ASR_APP_ID,
          this.config.ASR_ACCESS_TOKEN
        );
        
        // 先绑定事件监听，再初始化
        this.asrClient.on('response', async (response) => {
          await this.handleASRResponse(response);
        });
        this.asrClient.on('text', (text: string) => {
          this.handleASRText(text);
        });
        this.asrClient.on('error', (error: Error) => {
          console.error(`[ASR错误] ASR客户端错误:`, error.message);
          // 错误时重置状态，允许重新初始化
          this.state = 'Idle';
          if (this.asrClient) {
            this.asrClient.close().catch(() => {});
            this.asrClient = null;
          }
          this.asrInitFailed = true;
          this.asrInitFailTime = Date.now();
        });
        
        await this.asrClient.init();
        this.asrInitializing = false;
        console.log(`[ASR初始化] ✓ ASR客户端初始化成功`);
      } catch (error) {
        console.error(`[ASR初始化] ✗ ASR客户端初始化失败:`, error instanceof Error ? error.message : error);
        this.asrClient = null;
        this.asrInitializing = false;
        this.asrInitFailed = true;
        this.asrInitFailTime = Date.now();
        return;
      }
    }

    // 发送音频数据到ASR服务
    try {
      await this.asrClient.sendAudio(audioData, false);
      // 每100次发送打印一次，避免日志过多
      if (Math.random() < 0.01) {
        console.log(`[用户输入] 发送音频到ASR: ${audioData.length} bytes`);
      }
    } catch (error) {
      console.error(`[用户输入] ⚠️ 发送音频到ASR失败:`, error instanceof Error ? error.message : error);
      // 如果发送失败，重置ASR客户端
      if (this.asrClient) {
        try {
          await this.asrClient.close();
        } catch (e) {
          // 忽略关闭错误
        }
        this.asrClient = null;
      }
    }
  }

  /**
   * 处理ASR响应
   */
  private async handleASRResponse(response: any): Promise<void> {
    if (this.state !== 'Idle') {
      return;
    }

    if (response.result) {
      const text = response.result.text || '';
      
      // 更新缓冲区（即使文本为空也更新，用于静音检测）
      const incrementLen = text.length - this.asrBuffer.length;
      const oldBuffer = this.asrBuffer;
      this.asrBuffer = text;
      
      if (incrementLen > 0 && response.audio?.duration) {
        this.asrLastDuration = response.audio.duration;
        this.asrNoInputDuration = 0; // 重置静音时长
        // 只在新文本出现时打印
        if (text && text !== oldBuffer) {
          console.log(`[ASR识别] 识别到文本: "${text}" (增量: +${incrementLen}字符, 时长: ${response.audio.duration}ms)`);
        }
      } else if (response.audio?.duration) {
        this.asrNoInputDuration = response.audio.duration - this.asrLastDuration;
        // 如果文本没有变化但有音频时长更新，可能是静音
        if (text && this.asrNoInputDuration > 0) {
          console.log(`[ASR识别] 文本未更新: "${text}", 静音时长: ${this.asrNoInputDuration}ms`);
        }
      }
      
      // 如果ASR返回了空文本，记录警告
      if (!text && response.audio?.duration) {
        console.warn(`[ASR识别] 收到响应但文本为空，音频时长: ${response.audio.duration}ms`);
      }
    }
  }

  /**
   * 处理ASR文本更新（实时文本流）
   */
  private handleASRText(_text: string): void {
    // 这个方法会在ASR返回新文本时被调用
    // 可以用于实时显示识别结果
  }

  /**
   * 检查静音并处理（定期调用）
   */
  async *checkSilenceAndProcess(): AsyncGenerator<WebEvent, void, unknown> {
    // 如果没有收到音频，不处理
    if (!this.hasReceivedAudio) {
      return;
    }

    // 检查静音条件：状态为Idle，且静音时长超过阈值
    // 注意：只有识别到文本时才处理，未识别到文本时不发送给LLM
    const shouldProcess = this.state === 'Idle' && 
      this.asrBuffer && // 必须有识别到的文本
      this.asrNoInputDuration >= this.ASR_INTERVAL; // 静音时长超过阈值

    if (!shouldProcess) {
      return;
    }

    // 检测到静音，处理用户输入
    // 只有识别到文本时才处理，未识别到文本时不发送给LLM
    const recognizedText = this.asrBuffer.trim();
    
    if (!recognizedText) {
      // 未识别到文本，不发送给LLM，直接重置状态
      console.warn(`[ASR识别] ⚠️ 未识别到文本，跳过LLM调用`);
      this.asrBuffer = '';
      this.asrNoInputDuration = 0;
      this.asrLastDuration = 0;
      this.hasReceivedAudio = false;
      this.audioStartTime = 0;

      // 关闭ASR连接（准备下次识别）
      if (this.asrClient) {
        try {
          await this.asrClient.close();
        } catch (error) {
          // 忽略关闭错误
        }
        this.asrClient = null;
      }
      return; // 直接返回，不发送给LLM
    }

    // 识别到文本，开始处理
    this.state = 'InProgress';
    console.log(`[ASR识别] 最终识别结果: "${recognizedText}"`);
    
    this.asrBuffer = '';
    this.asrNoInputDuration = 0;
    this.asrLastDuration = 0;
    this.hasReceivedAudio = false;
    this.audioStartTime = 0;

    // 关闭ASR连接（准备下次识别）
    if (this.asrClient) {
      try {
        await this.asrClient.close();
      } catch (error) {
        // 忽略关闭错误
      }
      this.asrClient = null;
    }

    try {
      // 发送识别结果
      yield {
        event: SENTENCE_RECOGNIZED,
        payload: { sentence: recognizedText }
      };

      // 调用LLM生成回复（流式）
      console.log(`[LLM调用] 发送给豆包: "${recognizedText}"`);
      this.historyMessages.push({ role: 'user', content: recognizedText });
      
      // 使用流式LLM+TTS，边接收边合成
      let hasResponse = false;
      for await (const event of this.generateStreamingLLMAndTTS()) {
        yield event;
        if (event.event === TTS_DONE) {
          hasResponse = true;
        }
      }
      
      if (!hasResponse) {
        console.warn(`[LLM响应] ⚠️ 豆包返回空回复`);
      }
    } catch (error) {
      console.error(`[静音检测处理] ✗ 处理失败:`, error instanceof Error ? error.message : error);
    } finally {
      // 确保状态重置
      this.state = 'Idle';
    }
  }


  /**
   * 流式生成LLM回复并实时进行TTS合成
   * 边接收LLM内容边合成语音，减少等待时间
   * 支持工具调用（tool_calls）
   */
  private async *generateStreamingLLMAndTTS(): AsyncGenerator<WebEvent, void, unknown> {
    try {
      const ARK_API_BASE = 'https://ark.cn-beijing.volces.com/api/v3';
      const url = `${ARK_API_BASE}/chat/completions`;
      
      // 定义工具（与VolcEngineAdapter中的工具定义保持一致）
      const tools = [
        {
          type: "function",
          function: {
            name: "navigateToPage",
            description: "Navigate to a specific page view in the application. Options: dashboard (综合态势), monitor (监控中心), alert (预警中心), patrol (巡查治理), broadcast (广播喊话)",
            parameters: {
              type: "object",
              properties: {
                page: {
                  type: "string",
                  description: "The target page view. Options: dashboard, monitor, alert, patrol, broadcast. Also accepts Chinese: 综合态势/监控中心/预警中心/巡查治理/广播喊话"
                }
              },
              required: ["page"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "setDashboardMode",
            description: "Change the center panel mode on the dashboard. Options: video-grid (监控墙), map (地图), ai-chat (AI助手)",
            parameters: {
              type: "object",
              properties: {
                mode: {
                  type: "string",
                  description: "The dashboard center panel mode. Options: video-grid (监控墙), map (地图), ai-chat (AI助手)"
                }
              },
              required: ["mode"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "setEmergencyMode",
            description: "Activate or deactivate emergency response mode",
            parameters: {
              type: "object",
              properties: {
                active: {
                  type: "boolean",
                  description: "True to activate emergency mode, false to deactivate"
                }
              },
              required: ["active"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "configurePatrol",
            description: "Start or stop automated camera patrolling",
            parameters: {
              type: "object",
              properties: {
                active: {
                  type: "boolean",
                  description: "Start or stop automated camera patrolling"
                },
                interval: {
                  type: "number",
                  description: "Time interval between camera switches in minutes"
                }
              }
            }
          }
        }
      ];
      
      const response = await axios.post(
        url,
        {
          model: this.config.LLM_ENDPOINT_ID,
          messages: this.historyMessages,
          tools: tools,
          stream: true,
          temperature: 0.7,
          max_tokens: 4096
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.ARK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream'
        }
      );
      
      let fullResponse = '';
      let buffer = '';
      let sentenceBuffer = ''; // 累积的句子缓冲区
      // 工具调用相关变量
      let toolCallMap = new Map<number, { id: string; name: string; args: string }>(); // index -> tool call info
      let hasToolCalls = false; // 是否有工具调用
      
      console.log(`[TTS合成] 开始流式合成语音`);
      
      for await (const chunk of response.data) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim();
            if (data === '[DONE]') {
              // 检查是否有工具调用需要处理
              if (hasToolCalls && toolCallMap.size > 0) {
                console.log(`[工具调用] 检测到工具调用，暂停TTS合成`);
                // 发送工具调用事件到前端
                for (const [index, toolCall] of toolCallMap.entries()) {
                  try {
                    const args = JSON.parse(toolCall.args || '{}');
                    console.log(`[工具调用] 发送工具调用事件: ${toolCall.name}(${JSON.stringify(args)})`);
                    yield {
                      event: 'ToolCall',
                      payload: {
                        toolCallId: toolCall.id,
                        toolName: toolCall.name,
                        arguments: args
                      }
                    };
                  } catch (e) {
                    console.error(`[工具调用] 解析工具参数失败:`, e);
                  }
                }
                // 等待工具执行结果（这里需要前端返回结果）
                // 注意：实际实现中，我们需要等待前端通过WebSocket返回工具执行结果
                // 当前先跳过，等待后续实现
                return; // 暂时返回，等待工具执行结果
              }
              
              // 处理剩余的句子缓冲区
              if (sentenceBuffer.trim()) {
                yield* this.generateTTSForSentence(sentenceBuffer.trim());
                sentenceBuffer = '';
              }
              continue;
            }
            
            try {
              const json = JSON.parse(data);
              
              // 检查工具调用
              const delta = json.choices?.[0]?.delta;
              if (delta?.tool_calls) {
                hasToolCalls = true;
                for (const toolCall of delta.tool_calls) {
                  const index = toolCall.index;
                  if (toolCall.id) {
                    toolCallMap.set(index, {
                      id: toolCall.id,
                      name: toolCall.function?.name || '',
                      args: toolCallMap.get(index)?.args || ''
                    });
                  }
                  if (toolCall.function?.arguments) {
                    const currentArgs = toolCallMap.get(index)?.args || '';
                    toolCallMap.set(index, {
                      id: toolCallMap.get(index)?.id || '',
                      name: toolCall.function?.name || toolCallMap.get(index)?.name || '',
                      args: currentArgs + toolCall.function.arguments
                    });
                  }
                }
                console.log(`[工具调用] 检测到工具调用增量，当前工具数量: ${toolCallMap.size}`);
                continue; // 工具调用时不处理文本内容
              }
              
              // 检查finish_reason是否为tool_calls
              if (json.choices?.[0]?.finish_reason === 'tool_calls') {
                hasToolCalls = true;
                console.log(`[工具调用] LLM完成，finish_reason为tool_calls`);
              }
              
              const content = json.choices?.[0]?.delta?.content || 
                            json.choices?.[0]?.message?.content || 
                            json.content || '';
              if (content) {
                fullResponse += content;
                sentenceBuffer += content;
                
                // 检查是否有完整的句子（以句号、感叹号、问号、分号或换行符结尾）
                const sentenceMatch = sentenceBuffer.match(/^(.+?[。！？；\n])/);
                if (sentenceMatch) {
                  const completeSentence = sentenceMatch[1].trim();
                  sentenceBuffer = sentenceBuffer.substring(sentenceMatch[0].length);
                  
                  // 立即合成这个句子
                  if (completeSentence) {
                    yield* this.generateTTSForSentence(completeSentence);
                  }
                } else if (sentenceBuffer.length >= 20) {
                  // 如果缓冲区超过20个字符还没有句子结束符，也进行合成（避免等待太久）
                  // 尝试在逗号、顿号处分割
                  const commaMatch = sentenceBuffer.match(/^(.+?[，、])/);
                  if (commaMatch) {
                    const partialSentence = commaMatch[1].trim();
                    sentenceBuffer = sentenceBuffer.substring(commaMatch[0].length);
                    if (partialSentence) {
                      yield* this.generateTTSForSentence(partialSentence);
                    }
                  }
                }
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
      
      // 处理最后剩余的文本（可能没有句子结束符）
      if (sentenceBuffer.trim()) {
        yield* this.generateTTSForSentence(sentenceBuffer.trim());
        sentenceBuffer = '';
      }
      
      // 保存完整回复到历史记录
      if (fullResponse) {
        this.historyMessages.push({ role: 'assistant', content: fullResponse });
        console.log(`[LLM响应] 豆包完整回复: "${fullResponse}"`);
      }
      
      // 发送完成事件
      yield {
        event: TTS_DONE,
        payload: {}
      };
      console.log(`[TTS合成] 流式语音合成完成`);
    } catch (error) {
      console.error(`[LLM调用] ✗ LLM调用失败:`, error instanceof Error ? error.message : error);
      yield {
        event: BOT_ERROR,
        payload: { message: 'LLM调用失败' }
      };
    }
  }

  /**
   * 为单个句子生成TTS
   */
  private async *generateTTSForSentence(sentence: string): AsyncGenerator<WebEvent, void, unknown> {
    if (!sentence.trim()) {
      return;
    }

    console.log(`[TTS合成] 合成句子: "${sentence}"`);
    
    // 发送句子开始事件
    yield {
      event: TTS_SENTENCE_START,
      payload: { sentence: sentence.trim() }
    };

    // 为每个句子创建新的TTS客户端实例
    const sentenceTTSClient = new VolcEngineTTSClient(
      this.config.TTS_APP_ID,
      this.config.TTS_ACCESS_TOKEN,
      this.config.TTS_SPEAKER
    );
    
    // 保存当前TTS客户端，以便被打断时关闭
    this.currentTTSClient = sentenceTTSClient;
    
    try {
      await sentenceTTSClient.init();
      
      // 合成语音
      const audioBuffer: Buffer[] = [];
      
      // 收集音频数据
      const audioPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('TTS timeout'));
        }, 10000);

        sentenceTTSClient.on('audio', (audio: Buffer) => {
          audioBuffer.push(audio);
        });

        sentenceTTSClient.once('sessionFinished', () => {
          clearTimeout(timeout);
          resolve();
        });

        sentenceTTSClient.once('error', (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // 发送合成请求
      await sentenceTTSClient.synthesize(sentence.trim(), true);
      
      // 等待音频数据收集完成
      await audioPromise;

      // 发送音频数据
      if (audioBuffer.length > 0) {
        const combinedAudio = Buffer.concat(audioBuffer);
        yield {
          event: TTS_SENTENCE_END,
          data: combinedAudio
        };
      }
      
      await sentenceTTSClient.close();
      if (this.currentTTSClient === sentenceTTSClient) {
        this.currentTTSClient = null;
      }
    } catch (error) {
      await sentenceTTSClient.close().catch(() => {});
      if (this.currentTTSClient === sentenceTTSClient) {
        this.currentTTSClient = null;
      }
    }
  }

  private async generateLLMResponse(): Promise<string> {
    try {
      const ARK_API_BASE = 'https://ark.cn-beijing.volces.com/api/v3';
      const url = `${ARK_API_BASE}/chat/completions`;
      
      const response = await axios.post(
        url,
        {
          model: this.config.LLM_ENDPOINT_ID,
          messages: this.historyMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: 4096
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.ARK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream'
        }
      );
      
      let fullResponse = '';
      let buffer = '';
      
      for await (const chunk of response.data) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim();
            if (data === '[DONE]') continue;
            
            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content || 
                            json.choices?.[0]?.message?.content || 
                            json.content || '';
              if (content) {
                fullResponse += content;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
      
      if (fullResponse) {
        this.historyMessages.push({ role: 'assistant', content: fullResponse });
      }
      
      return fullResponse;
    } catch (error) {
      console.error(`[LLM调用] ✗ LLM调用失败:`, error instanceof Error ? error.message : error);
      return '抱歉，我遇到了一些问题。';
    }
  }

  private async *generateTTSResponse(text: string): AsyncGenerator<WebEvent, void, unknown> {
    if (!this.ttsClient || !text.trim()) {
      return;
    }

    try {
      // 按句子分割文本
      const sentences = text.split(/[。！？；\n]/).filter(s => s.trim());
      
      if (sentences.length === 0) {
        // 如果没有句子分隔符，直接使用整个文本
        sentences.push(text.trim());
      }
      
      for (const sentence of sentences) {
        if (!sentence.trim()) continue;

        console.log(`[TTS合成] 合成句子: "${sentence.trim()}"`);
        
        // 发送句子开始事件
        yield {
          event: TTS_SENTENCE_START,
          payload: { sentence: sentence.trim() }
        };

        // 为每个句子创建新的TTS客户端实例（因为每个句子需要独立的会话）
        const sentenceTTSClient = new VolcEngineTTSClient(
          this.config.TTS_APP_ID,
          this.config.TTS_ACCESS_TOKEN,
          this.config.TTS_SPEAKER
        );
        
        // 保存当前TTS客户端，以便被打断时关闭
        this.currentTTSClient = sentenceTTSClient;
        
        try {
          await sentenceTTSClient.init();
          
          // 合成语音
          const audioBuffer: Buffer[] = [];
          
          // 收集音频数据
          const audioPromise = new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('TTS timeout'));
            }, 10000);

            sentenceTTSClient.on('audio', (audio: Buffer) => {
              audioBuffer.push(audio);
            });

            sentenceTTSClient.once('sessionFinished', () => {
              clearTimeout(timeout);
              resolve();
            });

            sentenceTTSClient.once('error', (error: Error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });

          // 发送合成请求
          await sentenceTTSClient.synthesize(sentence.trim(), true);
          
          // 等待音频数据收集完成
          await audioPromise;

          // 发送音频数据
          if (audioBuffer.length > 0) {
            const combinedAudio = Buffer.concat(audioBuffer);
            yield {
              event: TTS_SENTENCE_END,
              data: combinedAudio
            };
          }
          
          await sentenceTTSClient.close();
          if (this.currentTTSClient === sentenceTTSClient) {
            this.currentTTSClient = null;
          }
        } catch (error) {
          await sentenceTTSClient.close().catch(() => {});
          if (this.currentTTSClient === sentenceTTSClient) {
            this.currentTTSClient = null;
          }
        }
      }

      // 发送完成事件
      yield {
        event: TTS_DONE,
        payload: {}
      };
    } catch (error) {
      if (this.currentTTSClient) {
        try {
          await this.currentTTSClient.close();
        } catch (e) {
          // 忽略关闭错误
        }
        this.currentTTSClient = null;
      }
      yield {
        event: BOT_ERROR,
        payload: { message: 'TTS synthesis failed' }
      };
    }
  }
}


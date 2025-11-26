import express from 'express';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';
import { CopilotRuntime, copilotRuntimeNodeExpressEndpoint } from '@copilotkit/runtime';
import { OpenAIAdapter } from '@copilotkit/runtime';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 4000;

// Configure multer for file uploads (voice recording)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(cors());
app.use(express.json());

// SiliconFlow Configuration
// Using Kimi model which supports reasoning and tools better
const SILICONFLOW_API_KEY = 'sk-sedikaywkisyertdnwzqbwgdncqndeqfjgrcutiirgbebfgk';

const openai = new OpenAI({
  apiKey: SILICONFLOW_API_KEY,
  baseURL: 'https://api.siliconflow.cn/v1',
});

const copilotRuntime = new CopilotRuntime();

const SYSTEM_PROMPT = `你是成都智友辰科技有限公司于2025年发布的AI综合安防风险治理平台助手。
你的职责是协助用户管理安防系统、监控视频流、处理警报和执行巡逻任务。

**关于你的身份信息**（当用户询问时务必准确回答）：
- **开发公司**：成都智友辰科技有限公司
- **产品名称**：AI综合安防风险治理平台助手
- **发布时间**：2025年
- **你的角色**：智能安防助手，专注于综合安防风险治理
- 当用户问"你是谁"、"你是什么系统"、"谁开发的你"、"你的作者是谁"、"系统版本"等类似问题时，回答："我是成都智友辰科技有限公司于2025年发布的AI综合安防风险治理平台助手，专注于协助您管理安防系统的各项功能。"

请严格遵守以下要求：
1. **语言要求**：所有回复必须严格使用**中文**。
2. **回复风格**：专业、客观、简洁、高效。直接解决用户问题，不要有过多的寒暄。
3. **上下文意识**：时刻关注提供的系统状态（如activeAlerts, currentView等），并据此调整建议。

**重要规则 - 工具调用时必须返回文字说明**：
- 当你调用任何工具（函数）时，**必须同时返回中文文字说明你执行了什么操作**
- 例如：调用 setEmergencyMode({active: true}) 后，必须回复 "已启动紧急警报模式"
- 例如：调用 navigateToPage({page: "monitor"}) 后，必须回复 "已切换到监控中心"
- 例如：调用 toggleSidebar() 后，必须回复 "已切换侧边栏显示状态"
- **永远不要只调用工具而不返回任何文字**，这会导致系统错误

**重要规则 - 语音友好的回复格式**：
- **禁止使用Markdown格式符号**（如 -、*、#、> 等）
- **使用自然流畅的口语化表达**，适合语音朗读
- 列举内容时用"第一、第二"或"首先、其次、最后"，而不是用短横线
- 不要使用列表、代码块、引用等格式
- 例如：不要说"我可以帮助您：- 监控视频 - 处理警报"
- 而应该说"我可以帮助您监控视频、处理警报、配置巡逻等任务"

可用功能：
- 导航页面：综合态势(dashboard)、监控中心(monitor)、预警中心(alert)、巡查治理(patrol)、广播喊话(broadcast)
- 切换模式：监控墙(video-grid)、地图(map)、AI助手(ai-chat)
- 紧急模式：启动/关闭应急响应
- 巡逻配置：自动切换摄像头
- 侧边栏控制`;


class SiliconFlowAdapter extends OpenAIAdapter {
    constructor() {
        // Changed to MiniMax-M2 (non-thinking model) to avoid infinite loops
        super({ openai: openai as any, model: "MiniMaxAI/MiniMax-M2" });
    }

    async process(request: any): Promise<any> {
        // Extract necessary data
        const { messages, eventSource, actions } = request;
        
        console.log(`[SiliconFlowAdapter] Processing request. Actions count: ${actions?.length || 0}`);

        // 1. Improved Message Role Mapping - Keep more history for proper context
        const openAIMessages = messages
            .map((msg: any, index: number) => {
                let role = 'user'; // Default fallback
                let content = msg.content;

                // More precise role mapping
                if (msg.role === 'system') {
                    role = 'system';
                } else if (msg.role === 'assistant') {
                    role = 'assistant';
                } else if (msg.role === 'user') {
                    role = 'user';
                } else if (msg.type === 'TextMessage') {
                    // TextMessage can be from user or assistant
                    role = msg.role === 'assistant' ? 'assistant' : 'user';
                } else if (msg.type === 'ActionExecutionMessage') {
                    // Action execution is from assistant, but we'll skip it
                    // to avoid tool call complexity
                    console.log(`[SiliconFlowAdapter] Skipping ActionExecutionMessage at index ${index}`);
                    return null;
                } else if (msg.type === 'ResultMessage') {
                    // Result messages need tool_call_id, so we skip them
                    console.log(`[SiliconFlowAdapter] Skipping ResultMessage at index ${index}`);
                    return null;
                }

                // Validate role
                const validRoles = ['system', 'assistant', 'user'];
                if (!validRoles.includes(role)) {
                    console.warn(`[SiliconFlowAdapter] Invalid role: ${role} at index ${index}, falling back to user`);
                    role = 'user';
                }
                
                // Ensure content is string
                if (typeof content !== 'string') {
                    content = JSON.stringify(content || "");
                }
                
                // Skip empty messages
                if (!content || content.trim() === '' || content === '{}' || content === 'null') {
                    console.log(`[SiliconFlowAdapter] Skipping empty message at index ${index}`);
                    return null;
                }

                return { role, content };
            })
            .filter((msg: any) => msg !== null); // Remove null entries

        console.log(`[SiliconFlowAdapter] Processed ${openAIMessages.length} messages from ${messages.length} original messages`);

        // Inject or prepend System Prompt
        // Check if the first message is system, if so, append/replace. If not, prepend.
        if (openAIMessages.length > 0 && openAIMessages[0].role === 'system') {
            openAIMessages[0].content = `${SYSTEM_PROMPT}\n\n${openAIMessages[0].content}`;
        } else {
            openAIMessages.unshift({ role: 'system', content: SYSTEM_PROMPT });
        }

        // Helper to convert CopilotKit actions to OpenAI tools
        // Due to CopilotKit parameter serialization issues, we hardcode known action schemas
        const KNOWN_ACTION_SCHEMAS: Record<string, any> = {
            navigateToPage: {
                type: "object",
                properties: {
                    page: {
                        type: "string",
                        description: "The target page view. Options: dashboard, monitor, alert, patrol, broadcast. Also accepts Chinese: 综合态势/监控中心/预警中心/巡查治理/广播喊话"
                    }
                },
                required: ["page"]
            },
            setDashboardMode: {
                type: "object",
                properties: {
                    mode: {
                        type: "string",
                        description: "The dashboard center panel mode. Options: video-grid (监控墙), map (地图), ai-chat (AI助手)"
                    }
                },
                required: ["mode"]
            },
            setEmergencyMode: {
                type: "object",
                properties: {
                    active: {
                        type: "boolean",
                        description: "True to activate emergency mode, false to deactivate"
                    }
                },
                required: ["active"]
            },
            toggleSidebar: {
                type: "object",
                properties: {},
                description: "Toggle the navigation sidebar. No parameters needed."
            },
            configurePatrol: {
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
        };

        const tools = actions && actions.length > 0 ? actions.map((action: any) => {
            // Use hardcoded schema if available, otherwise use flexible schema
            const parametersSchema = KNOWN_ACTION_SCHEMAS[action.name] || {
                type: "object",
                properties: {},
                additionalProperties: true,
                description: `Parameters for ${action.name}. The model should infer appropriate parameters from the context.`
            };
            
            console.log(`[SiliconFlowAdapter] Using schema for ${action.name}:`, JSON.stringify(parametersSchema, null, 2));
            
            return {
                type: "function",
                function: {
                    name: action.name,
                    description: action.description,
                    parameters: parametersSchema,
                }
            };
        }) : undefined;

        // Manually handle the stream events
        eventSource.stream(async (eventStream$: any) => {
            let startedTextMessage = false;
            let messageId: string | undefined;
            const toolCallMap = new Map<number, string>(); // index -> id
            const calledToolNames: string[] = []; // Track which tools were called
            const fullMessageBuffer: string[] = []; // 累积完整消息内容

            try {
                console.log("[SiliconFlowAdapter] Requesting streaming completion from SiliconFlow (MiniMax-M2)...");

                const payload = {
                    model: "MiniMaxAI/MiniMax-M2",
                    messages: openAIMessages,
                    tools: tools, 
                    stream: true,
                    stream_options: { include_usage: true }
                };
                
                // Log payload summary
                console.log("[SiliconFlowAdapter] Request summary:");
                console.log("  - Messages count:", openAIMessages.length);
                console.log("  - Tools count:", tools?.length || 0);
                if (tools && tools.length > 0) {
                    console.log("  - Tool names:", tools.map((t: any) => t.function.name).join(", "));
                }

                const stream = await openai.chat.completions.create(payload as any) as unknown as AsyncIterable<any>;
                
                for await (const chunk of stream) {
                    if (!chunk.choices || chunk.choices.length === 0) {
                        continue;
                    }

                    const delta = chunk.choices[0].delta;
                    if (!delta) continue;

                    // Handle content streaming (MiniMax-M2 doesn't have reasoning_content)
                    const content = delta.content || "";
                    
                    if (content) {
                        // 累积内容到缓冲区
                        fullMessageBuffer.push(content);
                        
                        if (!startedTextMessage) {
                            messageId = chunk.id || `msg_${Date.now()}`; 
                            eventStream$.sendTextMessageStart({ messageId });
                            startedTextMessage = true;
                        }
                        
                        eventStream$.sendTextMessageContent({
                            messageId: messageId!,
                            content: content
                        });
                    }

                    // Handle tool calls
                    if (delta.tool_calls) {
                        for (const toolCall of delta.tool_calls) {
                            const index = toolCall.index;
                            
                            if (toolCall.id) {
                                // New tool call start
                                const id = toolCall.id;
                                const toolName = toolCall.function?.name || "";
                                toolCallMap.set(index, id);
                                
                                // Track tool name for intelligent fallback
                                if (toolName && !calledToolNames.includes(toolName)) {
                                    calledToolNames.push(toolName);
                                }
                                
                                eventStream$.sendActionExecutionStart({
                                    actionExecutionId: id,
                                    actionName: toolName,
                                    parentMessageId: chunk.id || messageId || `msg_${Date.now()}`
                                });
                            }

                            const args = toolCall.function?.arguments;
                            if (args && toolCallMap.has(index)) {
                                eventStream$.sendActionExecutionArgs({
                                    actionExecutionId: toolCallMap.get(index)!,
                                    args: args
                                });
                            }
                        }
                    }
                }
                
                // Generate intelligent fallback response based on tool calls
                // This ensures CopilotKit doesn't auto-retry while providing meaningful feedback
                if (toolCallMap.size > 0 && !startedTextMessage) {
                    console.log("[SiliconFlowAdapter] Model called tools without text response, generating intelligent fallback");
                    
                    // Generate contextual response based on the tools that were called
                    let fallbackMessage = "操作已执行";
                    
                    if (calledToolNames.length > 0) {
                        // Map tool names to user-friendly Chinese messages
                        const actionMap: Record<string, string> = {
                            'navigateToPage': '页面切换成功',
                            'setDashboardMode': '视图模式已切换',
                            'setEmergencyMode': '紧急模式状态已更新',
                            'configurePatrol': '巡逻配置已调整',
                            'toggleSidebar': '侧边栏显示已切换'
                        };
                        
                        const firstTool = calledToolNames[0];
                        fallbackMessage = actionMap[firstTool] || '操作已完成';
                        
                        // If multiple tools were called, indicate that
                        if (calledToolNames.length > 1) {
                            fallbackMessage += `，共执行了${calledToolNames.length}个操作`;
                        }
                    }
                    
                    messageId = `msg_${Date.now()}`;
                    eventStream$.sendTextMessageStart({ messageId });
                    eventStream$.sendTextMessageContent({
                        messageId,
                        content: fallbackMessage
                    });
                    eventStream$.sendTextMessageEnd({ messageId });
                    console.log(`[SiliconFlowAdapter] Sent intelligent fallback: "${fallbackMessage}" for tools: [${calledToolNames.join(', ')}]`);
                }
                
                // End text message if started
                if (startedTextMessage && messageId) {
                    eventStream$.sendTextMessageEnd({ messageId });
                }

                // End all tool calls
                for (const id of toolCallMap.values()) {
                    eventStream$.sendActionExecutionEnd({ actionExecutionId: id });
                }
                
                // 打印完整的AI回复内容
                const fullMessage = fullMessageBuffer.join('');
                console.log("[SiliconFlowAdapter] ===== AI Complete Response =====");
                console.log(`[SiliconFlowAdapter] Total length: ${fullMessage.length} chars`);
                console.log(`[SiliconFlowAdapter] Content: "${fullMessage}"`);
                console.log("[SiliconFlowAdapter] ================================");
                
                console.log("[SiliconFlowAdapter] Stream completed successfully.");
                eventStream$.complete();

            } catch (err: any) {
                console.error("[SiliconFlowAdapter] API Error:", err);
                
                // Handle common errors...
                if (err.status === 429) {
                     const msg = "SiliconFlow rate limit exceeded. Please try again later.";
                     if (!startedTextMessage) { 
                         eventStream$.sendTextMessageStart({ messageId: "error" });
                         eventStream$.sendTextMessageContent({ messageId: "error", content: msg });
                         eventStream$.sendTextMessageEnd({ messageId: "error" });
                     } else {
                         eventStream$.sendTextMessageContent({ messageId: messageId || "error", content: `\n\n[Error: ${msg}]` });
                         if (messageId) eventStream$.sendTextMessageEnd({ messageId });
                     }
                     eventStream$.complete();
                     return;
                }
                
                 if (err.status === 400) {
                     const msg = "Model API Error (400): Invalid request.";
                     if (!startedTextMessage) {
                         eventStream$.sendTextMessageStart({ messageId: "error" });
                         eventStream$.sendTextMessageContent({ messageId: "error", content: msg });
                         eventStream$.sendTextMessageEnd({ messageId: "error" });
                     }
                     eventStream$.complete();
                     return;
                }

                if (!startedTextMessage) {
                     try {
                        eventStream$.sendTextMessageStart({ messageId: "error" });
                        eventStream$.sendTextMessageContent({ messageId: "error", content: `Error: ${err.message || "Unknown error"}` });
                        eventStream$.sendTextMessageEnd({ messageId: "error" });
                     } catch (e) {
                        console.error("Failed to send error to stream", e);
                     }
                }

                eventStream$.error(err);
            }
        });

        return {
            threadId: request.threadId || "default_thread"
        };
    }
}

const serviceAdapter = new SiliconFlowAdapter();

// ==================== 语音识别 API ====================
// POST /api/speech-to-text
// 使用 FunAudioLLM/SenseVoiceSmall 模型进行语音识别
app.post('/api/speech-to-text', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log('[ASR] Received audio file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer.length
    });

    // 验证音频数据
    if (req.file.buffer.length === 0) {
      return res.status(400).json({ error: 'Audio file is empty' });
    }

    // 使用axios和form-data发送请求
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    // 将Buffer作为stream添加到formData
    formData.append('file', req.file.buffer, {
      filename: 'recording.webm',
      contentType: 'audio/webm'
    });
    formData.append('model', 'FunAudioLLM/SenseVoiceSmall');

    console.log('[ASR] Sending request to SiliconFlow API with axios...');

    try {
      // 使用axios发送请求（axios对form-data支持更好）
      const response = await axios.post(
        'https://api.siliconflow.cn/v1/audio/transcriptions',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
            ...formData.getHeaders()
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        }
      );

      console.log('[ASR] Recognition successful:', response.data);

      res.json({ 
        text: response.data.text || '',
        language: response.data.language || 'zh'
      });

    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        console.error('[ASR] API Error:', error.response.status, error.response.data);
        return res.status(error.response.status).json({ 
          error: 'Speech recognition failed', 
          details: error.response.data
        });
      }
      throw error;
    }

  } catch (error: unknown) {
    const err = error as Error;
    console.error('[ASR] Error:', err);
    res.status(500).json({ 
      error: 'Speech recognition failed', 
      message: err.message 
    });
  }
});

// ==================== 语音合成 API ====================
// POST /api/text-to-speech
// 使用 FunAudioLLM/CosyVoice2-0.5B 模型进行流式语音合成
// 文档: https://docs.siliconflow.cn/cn/api-reference/audio/create-speech
app.post('/api/text-to-speech', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'No text provided' });
    }

    console.log('[TTS] Generating speech for text:', text.substring(0, 100));

    // 根据硅基流动文档，调用TTS API
    const response = await fetch('https://api.siliconflow.cn/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'FunAudioLLM/CosyVoice2-0.5B',
        input: text, // 直接使用文本，不需要特殊格式（除非需要情感控制）
        voice: 'FunAudioLLM/CosyVoice2-0.5B:diana', // 使用完整的voice格式
        response_format: 'mp3',
        sample_rate: 32000, // 默认32000 Hz
        stream: true, // 启用流式输出
        speed: 1.0,
        gain: 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS] API Error:', response.status, errorText);
      
      // 尝试解析错误响应
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { message: errorText };
      }
      
      return res.status(response.status).json({ 
        error: 'Text-to-speech failed', 
        details: errorDetails
      });
    }

    // 设置响应头为音频流
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    // 将音频流传递给客户端
    const reader = response.body?.getReader();
    if (reader) {
      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        res.write(value);
        return pump();
      };
      await pump();
      console.log('[TTS] Streaming audio completed');
    } else {
      res.status(500).json({ error: 'No response body from TTS API' });
    }

  } catch (error: unknown) {
    const err = error as Error;
    console.error('[TTS] Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Text-to-speech failed', 
        message: err.message 
      });
    }
  }
});

// Use the Express adapter provided by the library
app.use('/copilotkit', (req, res, next) => {
  const handler = copilotRuntimeNodeExpressEndpoint({
    endpoint: '/copilotkit',
    runtime: copilotRuntime,
    serviceAdapter,
  });
  
  return handler(req, res, next);
});

app.get('/', (req, res) => {
  res.send('BI Agent Copilot Runtime is running!');
});

app.listen(port, () => {
  console.log(`Copilot Runtime running at http://localhost:${port}`);
});

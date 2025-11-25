import express from 'express';
import cors from 'cors';
import { CopilotRuntime, copilotRuntimeNodeExpressEndpoint } from '@copilotkit/runtime';
import { OpenAIAdapter } from '@copilotkit/runtime';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

// SiliconFlow Configuration
// Using Kimi model which supports reasoning and tools better
const openai = new OpenAI({
  apiKey: process.env.SILICONFLOW_API_KEY || 'sk-sedikaywkisyertdnwzqbwgdncqndeqfjgrcutiirgbebfgk',
  baseURL: 'https://api.siliconflow.cn/v1',
});

const copilotRuntime = new CopilotRuntime();

const SYSTEM_PROMPT = `你是一个AI综合安防风险治理平台的智能助手。
你的职责是协助用户管理安防系统、监控视频流、处理警报和执行巡逻任务。

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

                const stream = await openai.chat.completions.create(payload as any);
                
                for await (const chunk of stream) {
                    if (!chunk.choices || chunk.choices.length === 0) {
                        continue;
                    }

                    const delta = chunk.choices[0].delta;
                    if (!delta) continue;

                    // Handle content streaming (MiniMax-M2 doesn't have reasoning_content)
                    const content = delta.content || "";
                    
                    if (content) {
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
                                toolCallMap.set(index, id);
                                
                                eventStream$.sendActionExecutionStart({
                                    actionExecutionId: id,
                                    actionName: toolCall.function?.name || "",
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
                
                // CRITICAL FIX: If only tool calls were made without any text content,
                // send a placeholder message to prevent CopilotKit from auto-retrying
                if (toolCallMap.size > 0 && !startedTextMessage) {
                    messageId = `msg_${Date.now()}`;
                    eventStream$.sendTextMessageStart({ messageId });
                    eventStream$.sendTextMessageContent({
                        messageId,
                        content: "✓" // Minimal acknowledgment
                    });
                    eventStream$.sendTextMessageEnd({ messageId });
                    console.log("[SiliconFlowAdapter] Added placeholder message for tool-only response");
                }
                
                // End text message if started
                if (startedTextMessage && messageId) {
                    eventStream$.sendTextMessageEnd({ messageId });
                }

                // End all tool calls
                for (const id of toolCallMap.values()) {
                    eventStream$.sendActionExecutionEnd({ actionExecutionId: id });
                }
                
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

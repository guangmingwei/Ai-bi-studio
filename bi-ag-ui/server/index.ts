import express from 'express';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';
import { CopilotRuntime, copilotRuntimeNodeExpressEndpoint } from '@copilotkit/runtime';
import { OpenAIAdapter } from '@copilotkit/runtime';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';

dotenv.config();

const app = express();
const port = 4000;

// ==================== 重要:CORS和body parser必须在所有路由之前 ====================
app.use(cors());
app.use(express.json());

// 全局音频事件管理器 - 用于实时推送TTS音频
const audioEventEmitter = new EventEmitter();
audioEventEmitter.setMaxListeners(100); // 增加监听器限制

// 音频缓冲管理：sessionId -> 音频队列
const audioBuffers = new Map<string, Array<{ audio: Buffer; text: string; index: number }>>();
const sseConnections = new Set<string>(); // 跟踪已连接的SSE客户端

// ==================== 模拟数据统计API ====================
// 这些API用于AI生成图表时获取数据

// 获取摄像头统计数据
app.get('/api/stats/cameras', (req, res) => {
  const { timeRange = '7d' } = req.query;
  
  // 模拟数据
  const mockData = {
    total: 20,
    online: 18,
    offline: 2,
    trend: {
      categories: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      onlineData: [18, 19, 18, 20, 19, 18, 18],
      offlineData: [2, 1, 2, 0, 1, 2, 2],
    },
    distribution: [
      { name: '正常运行', value: 18 },
      { name: '离线', value: 2 },
    ],
  };

  res.json({ success: true, data: mockData });
});

// 获取告警统计数据
app.get('/api/stats/alerts', (req, res) => {
  const { timeRange = '7d' } = req.query;
  
  // 根据时间范围生成不同的数据
  let categories, dataPoints;
  
  switch (timeRange) {
    case '1d': // 1天 - 按小时
      categories = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      dataPoints = 24;
      break;
    case '7d': // 7天 - 按天
      categories = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      dataPoints = 7;
      break;
    case '30d': // 30天 - 按周
      categories = ['第1周', '第2周', '第3周', '第4周'];
      dataPoints = 4;
      break;
    case '90d': // 90天 - 按月
      categories = ['第1月', '第2月', '第3月'];
      dataPoints = 3;
      break;
    default:
      categories = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      dataPoints = 7;
  }
  
  // 生成趋势数据
  const generateTrendData = (base: number, variance: number) => 
    Array.from({ length: dataPoints }, () => 
      Math.max(0, Math.floor(base + Math.random() * variance - variance / 2))
    );
  
  const criticalData = generateTrendData(2, 3);
  const warningData = generateTrendData(7, 5);
  const infoData = generateTrendData(14, 4);
  
  const total = criticalData.reduce((a, b) => a + b, 0) + 
                warningData.reduce((a, b) => a + b, 0) + 
                infoData.reduce((a, b) => a + b, 0);
  
  const critical = criticalData.reduce((a, b) => a + b, 0);
  const warning = warningData.reduce((a, b) => a + b, 0);
  const info = infoData.reduce((a, b) => a + b, 0);
  
  // 模拟数据
  const mockData = {
    timeRange,
    total,
    critical,
    warning,
    info,
    // 添加级别分布数据（用于饼图）
    levelDistribution: [
      { name: '严重', value: critical },
      { name: '警告', value: warning },
      { name: '信息', value: info },
    ],
    // 趋势数据（用于折线图、柱状图）
    trend: {
      categories,
      series: [
        { name: '严重', data: criticalData, type: 'line' },
        { name: '警告', data: warningData, type: 'line' },
        { name: '信息', data: infoData, type: 'line' },
      ],
      // 总计数据（用于单一折线图）
      total: criticalData.map((c, i) => c + warningData[i] + infoData[i]),
    },
    // 类型分布数据（用于饼图）
    typeDistribution: [
      { name: '入侵检测', value: Math.floor(total * 0.29) },
      { name: '火灾报警', value: Math.floor(total * 0.15) },
      { name: '异常行为', value: Math.floor(total * 0.24) },
      { name: '设备故障', value: Math.floor(total * 0.18) },
      { name: '其他', value: Math.floor(total * 0.14) },
    ],
    // 小时分布数据（用于柱状图）
    hourlyDistribution: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: Math.floor(Math.random() * 15) + 2,
      label: `${i}:00`,
    })),
    // 每日汇总（用于柱状图）
    dailySummary: categories.map((category, i) => ({
      category,
      critical: criticalData[i],
      warning: warningData[i],
      info: infoData[i],
      total: criticalData[i] + warningData[i] + infoData[i],
    })),
  };

  console.log(`[API /api/stats/alerts] timeRange=${timeRange}, total=${total}`);
  res.json({ success: true, data: mockData });
});

// 获取巡逻统计数据
app.get('/api/stats/patrol', (req, res) => {
  const mockData = {
    totalCameras: 20,
    activeCameras: 18,
    averageInterval: 5, // 分钟
    totalSwitches: 2160, // 过去24小时
    trend: {
      categories: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 100) + 50),
    },
  };

  res.json({ success: true, data: mockData });
});

// 获取系统性能统计
app.get('/api/stats/system', (req, res) => {
  const mockData = {
    cpu: Math.floor(Math.random() * 40) + 30,
    memory: Math.floor(Math.random() * 30) + 50,
    disk: Math.floor(Math.random() * 20) + 60,
    network: {
      upload: Math.floor(Math.random() * 100) + 50,
      download: Math.floor(Math.random() * 200) + 100,
    },
    trend: {
      categories: Array.from({ length: 12 }, (_, i) => `${i * 5}分钟前`).reverse(),
      cpu: Array.from({ length: 12 }, () => Math.floor(Math.random() * 40) + 30),
      memory: Array.from({ length: 12 }, () => Math.floor(Math.random() * 30) + 50),
    },
  };

  res.json({ success: true, data: mockData });
});

// Configure multer for file uploads (voice recording)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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
- 侧边栏控制
- **数据分析与可视化（新功能）**：当用户需要统计分析、查看趋势图表时，使用 generateChart 工具

**数据分析与图表生成指引**：
当用户提出以下类型的请求时，使用 generateChart 工具生成可视化图表：
1. **统计请求**："统计最近一周的告警数量"、"摄像头在线率分析"、"告警类型分布"
2. **趋势分析**："显示告警趋势图"、"摄像头状态变化趋势"、"系统性能走势"
3. **数据对比**："对比不同时间段的数据"、"各类告警数量对比"
4. **分布展示**："告警类型占比"、"摄像头在线离线分布"

**时间范围选择**：
- "今天"、"最近24小时" → timeRange: "1d"
- "本周"、"最近7天"、"一周" → timeRange: "7d" (默认)
- "本月"、"最近30天"、"一个月" → timeRange: "30d"
- "最近三个月"、"季度" → timeRange: "90d"

**图表类型选择**：
- **折线图 (line)**：适合趋势分析、时间序列数据、变化趋势
  - 示例："显示最近一周告警趋势"
- **柱状图 (bar)**：适合数量对比、类别对比、排名展示
  - 示例："对比不同级别的告警数量"
- **饼图 (pie)**：适合占比分布、百分比展示、构成分析
  - 示例："告警类型分布占比"、"级别分布"
- **散点图 (scatter)**：适合相关性分析、数据分布
- **雷达图 (radar)**：适合多维度评估、综合指标

可用数据源：
- /api/stats/cameras - 摄像头统计（总数、在线/离线、趋势、分布）
- /api/stats/alerts - 告警统计（总数、级别分布、时间趋势、类型分布）
- /api/stats/patrol - 巡逻统计（巡逻次数、间隔、趋势）
- /api/stats/system - 系统性能（CPU、内存、磁盘、网络）

调用示例：
1. 折线图 - 趋势分析：
generateChart({
  dataSource: "/api/stats/alerts",
  chartType: "line",
  title: "最近7天告警趋势",
  description: "展示每日告警数量变化趋势",
  timeRange: "7d",
  dataMapping: {
    xAxis: "trend.categories",
    series: "trend.series"
  }
})

2. 饼图 - 占比分布：
generateChart({
  dataSource: "/api/stats/alerts",
  chartType: "pie",
  title: "告警级别分布",
  description: "展示不同级别告警的占比",
  dataMapping: {
    data: "levelDistribution"
  }
})

3. 柱状图 - 对比分析：
generateChart({
  dataSource: "/api/stats/alerts",
  chartType: "bar",
  title: "每日告警统计",
  description: "对比每天的告警数量",
  timeRange: "7d",
  dataMapping: {
    xAxis: "trend.categories",
    series: "trend.series"
  }
})`;


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
            },
            generateChart: {
                type: "object",
                properties: {
                    dataSource: {
                        type: "string",
                        description: "Data source API endpoint. Options: /api/stats/cameras, /api/stats/alerts, /api/stats/patrol, /api/stats/system",
                        enum: ["/api/stats/cameras", "/api/stats/alerts", "/api/stats/patrol", "/api/stats/system"]
                    },
                    chartType: {
                        type: "string",
                        description: "Type of chart to generate. Options: line (折线图-趋势), bar (柱状图-对比), pie (饼图-占比), scatter (散点图), radar (雷达图)",
                        enum: ["line", "bar", "pie", "scatter", "radar"]
                    },
                    title: {
                        type: "string",
                        description: "Chart title in Chinese"
                    },
                    description: {
                        type: "string",
                        description: "Brief description of what the chart shows"
                    },
                    timeRange: {
                        type: "string",
                        description: "Time range for data analysis. Options: 1d (最近1天/24小时), 7d (最近7天/一周), 30d (最近30天/一月), 90d (最近90天/三月). Default: 7d",
                        enum: ["1d", "7d", "30d", "90d"]
                    },
                    dataMapping: {
                        type: "object",
                        description: "Instructions on how to map the fetched data to chart configuration. E.g., which fields to use for xAxis, yAxis, series, etc.",
                        additionalProperties: true
                    }
                },
                required: ["dataSource", "chartType", "title"]
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
            
            // 实时TTS变量
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            let ttsBuffer = ''; // 累积待TTS的文本
            let ttsIndex = 0; // TTS片段索引
            const TTS_THRESHOLD = 30; // 累积30字符就发送TTS
            
            // 清理Markdown格式的函数
            const cleanTextForTTS = (text: string): string => {
                return text
                    .replace(/(\*\*|__)(.*?)\1/g, '$2')
                    .replace(/(\*|_)(.*?)\1/g, '$2')
                    .replace(/^#+\s/gm, '')
                    .replace(/^[-*+]\s/gm, '')
                    .replace(/^\d+\.\s/gm, '')
                    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
                    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
                    .replace(/^>\s/gm, '')
                    .trim();
            };
            
            // 发送TTS到前端的函数
            const sendTTSChunk = async (text: string) => {
                if (!text || text.trim().length === 0) return;
                
                const cleanedText = cleanTextForTTS(text);
                if (!cleanedText) return;
                
                console.log(`[Real-time TTS] Sending chunk ${ttsIndex}: "${cleanedText.substring(0, 50)}..." (${cleanedText.length} chars)`);
                
                try {
                    // 调用TTS API
                    const ttsResponse = await fetch('https://api.siliconflow.cn/v1/audio/speech', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'FunAudioLLM/CosyVoice2-0.5B',
                            input: cleanedText,
                            voice: 'FunAudioLLM/CosyVoice2-0.5B:diana',
                            response_format: 'mp3',
                            sample_rate: 32000,
                            stream: false,
                            speed: 1.0,
                            gain: 0
                        })
                    });
                    
                    if (ttsResponse.ok) {
                        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
                        console.log(`[Real-time TTS] Generated audio for chunk ${ttsIndex}: ${audioBuffer.length} bytes`);
                        
                        const audioData = {
                            sessionId,
                            audio: audioBuffer,
                            text: cleanedText,
                            index: ttsIndex
                        };
                        
                        // 检查是否有SSE连接
                        if (sseConnections.has(sessionId)) {
                            // 直接通过事件发射器推送
                            console.log(`[Real-time TTS] SSE connected, sending immediately`);
                            audioEventEmitter.emit('audio', audioData);
                        } else {
                            // 缓冲音频，等待SSE连接
                            console.log(`[Real-time TTS] No SSE connection yet, buffering chunk ${ttsIndex}`);
                            if (!audioBuffers.has(sessionId)) {
                                audioBuffers.set(sessionId, []);
                            }
                            audioBuffers.get(sessionId)!.push(audioData);
                        }
                        
                        ttsIndex++;
                    } else {
                        console.error(`[Real-time TTS] TTS failed:`, ttsResponse.status);
                    }
                } catch (err) {
                    console.error(`[Real-time TTS] Error:`, err);
                }
            };

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
                            
                            // 立即发送sessionId给前端（作为第一个内容）
                            eventStream$.sendTextMessageContent({
                                messageId: messageId!,
                                content: `<!--AUDIO_SESSION:${sessionId}-->`
                            });
                            
                            console.log(`[Real-time TTS] Sent session ID to frontend: ${sessionId}`);
                        }
                        
                        // 发送实际内容
                        eventStream$.sendTextMessageContent({
                            messageId: messageId!,
                            content: content
                        });
                        
                        // 累积到TTS缓冲区
                        ttsBuffer += content;
                        
                        // 当累积足够长度，立即发送TTS（不等句号）
                        if (ttsBuffer.length >= TTS_THRESHOLD) {
                            await sendTTSChunk(ttsBuffer);
                            ttsBuffer = ''; // 清空缓冲区
                        }
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
                                
                                console.log(`[Tool Call] Starting: ${toolName} (id: ${id}, index: ${index})`);
                                
                                // Track tool name for intelligent fallback
                                if (toolName && !calledToolNames.includes(toolName)) {
                                    calledToolNames.push(toolName);
                                }
                                
                                console.log(`[Tool Call] Sending ActionExecutionStart to frontend...`);
                                eventStream$.sendActionExecutionStart({
                                    actionExecutionId: id,
                                    actionName: toolName,
                                    parentMessageId: chunk.id || messageId || `msg_${Date.now()}`
                                });
                            }

                            const args = toolCall.function?.arguments;
                            if (args && toolCallMap.has(index)) {
                                console.log(`[Tool Call] Sending arguments for tool ${toolCallMap.get(index)}: ${args.substring(0, 100)}...`);
                                eventStream$.sendActionExecutionArgs({
                                    actionExecutionId: toolCallMap.get(index)!,
                                    args: args
                                });
                            }
                        }
                    }
                }
                
                // 发送剩余的TTS内容
                if (ttsBuffer.trim().length > 0) {
                    console.log(`[Real-time TTS] Sending final chunk: "${ttsBuffer.substring(0, 50)}..." (${ttsBuffer.length} chars)`);
                    await sendTTSChunk(ttsBuffer);
                    ttsBuffer = '';
                }
                
                // 发送TTS完成事件
                audioEventEmitter.emit('complete', { sessionId });
                console.log(`[Real-time TTS] All chunks sent for session ${sessionId}`);
                
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
                            'toggleSidebar': '侧边栏显示已切换',
                            'generateChart': '图表生成中'
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

// ==================== 实时音频推送 SSE ====================
// GET /api/audio-stream/:sessionId
// 前端通过SSE连接接收实时生成的TTS音频
app.get('/api/audio-stream/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  console.log(`[Audio SSE] Client connected: ${sessionId}`);

  // 设置SSE响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // 标记此session已有SSE连接
  sseConnections.add(sessionId);

  // 发送缓冲的音频（如果有）
  const bufferedAudio = audioBuffers.get(sessionId);
  if (bufferedAudio && bufferedAudio.length > 0) {
    console.log(`[Audio SSE] Sending ${bufferedAudio.length} buffered audio chunks`);
    for (const chunk of bufferedAudio) {
      const audioBase64 = chunk.audio.toString('base64');
      res.write(`data: ${JSON.stringify({
        type: 'audio',
        audio: audioBase64,
        text: chunk.text,
        index: chunk.index
      })}\n\n`);
    }
    // 清空缓冲
    audioBuffers.delete(sessionId);
  }

  // 心跳，防止连接超时
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // 监听音频事件
  const audioHandler = (data: { sessionId: string; audio: Buffer; text: string; index: number }) => {
    if (data.sessionId === sessionId) {
      const audioBase64 = data.audio.toString('base64');
      res.write(`data: ${JSON.stringify({
        type: 'audio',
        audio: audioBase64,
        text: data.text,
        index: data.index
      })}\n\n`);
      console.log(`[Audio SSE] Sent audio chunk ${data.index} to ${sessionId} (${data.audio.length} bytes)`);
    }
  };

  const completeHandler = (data: { sessionId: string }) => {
    if (data.sessionId === sessionId) {
      res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
      console.log(`[Audio SSE] Sent complete event to ${sessionId}`);
    }
  };

  audioEventEmitter.on('audio', audioHandler);
  audioEventEmitter.on('complete', completeHandler);

  // 客户端断开连接
  req.on('close', () => {
    console.log(`[Audio SSE] Client disconnected: ${sessionId}`);
    clearInterval(heartbeat);
    sseConnections.delete(sessionId);
    audioBuffers.delete(sessionId); // 清理缓冲
    audioEventEmitter.off('audio', audioHandler);
    audioEventEmitter.off('complete', completeHandler);
  });
});

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

// ==================== 完整AI语音合成 API ====================
// POST /api/complete-ai-speech
// 接收AI的完整回复，一次性合成完整语音（不切分）
app.post('/api/complete-ai-speech', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'No text provided' });
    }

    console.log('[Complete AI TTS] Starting TTS for text length:', text.length);
    console.log('[Complete AI TTS] Full text:', text);

    // 清理文本中的Markdown格式
    const cleanText = (input: string): string => {
      let cleaned = input;
      // 移除粗体/斜体
      cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
      cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');
      // 移除标题
      cleaned = cleaned.replace(/^#+\s/gm, '');
      // 移除列表标记
      cleaned = cleaned.replace(/^[-*+]\s/gm, '');
      cleaned = cleaned.replace(/^\d+\.\s/gm, '');
      // 移除链接
      cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, '$1');
      // 移除代码标记
      cleaned = cleaned.replace(/`{1,3}([^`]+)`{1,3}/g, '$1');
      // 移除引用
      cleaned = cleaned.replace(/^>\s/gm, '');
      // 清理多余空白和换行
      cleaned = cleaned.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      return cleaned;
    };

    const cleanedText = cleanText(text);
    console.log('[Complete AI TTS] Cleaned text length:', cleanedText.length);
    console.log('[Complete AI TTS] Cleaned text:', cleanedText);

    // 一次性调用TTS API，不切分
    const ttsResponse = await fetch('https://api.siliconflow.cn/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'FunAudioLLM/CosyVoice2-0.5B',
        input: cleanedText,
        voice: 'FunAudioLLM/CosyVoice2-0.5B:diana',
        response_format: 'mp3',
        sample_rate: 32000,
        stream: true, // 启用流式输出
        speed: 1.0,
        gain: 0
      })
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('[Complete AI TTS] TTS API Error:', ttsResponse.status, errorText);
      return res.status(ttsResponse.status).json({ 
        error: 'TTS generation failed', 
        details: errorText 
      });
    }

    // 流式传输音频到前端
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    console.log('[Complete AI TTS] Streaming audio to client...');
    
    // 直接管道传输音频流
    const reader = ttsResponse.body?.getReader();
    if (!reader) {
      throw new Error('No audio stream available');
    }

    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      res.write(value);
      totalBytes += value.length;
    }

    console.log(`[Complete AI TTS] Streaming completed, sent ${totalBytes} bytes`);
    res.end();

  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Complete AI TTS] Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Complete TTS failed', 
        message: err.message 
      });
    } else {
      res.end();
    }
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

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';
import { CopilotRuntime, copilotRuntimeNodeExpressEndpoint } from '@copilotkit/runtime';
import { OpenAIAdapter } from '@copilotkit/runtime';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';
import path from 'path';
import { fileURLToPath } from 'url';
import { VolcEngineTTSClient } from './volcengine-ws.js';

// crypto import removed - not currently used

// 获取当前文件的目录路径（ESM模块）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载.env文件（从server目录，与index.ts同一目录）
dotenv.config({ path: path.join(__dirname, '.env') });

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

// ==================== 火山引擎配置 ====================
// 语音识别 (ASR) 配置
const ASR_ACCESS_TOKEN = process.env.ASR_ACCESS_TOKEN || '';
const ASR_APP_ID = process.env.ASR_APP_ID || '';

// 语音合成 (TTS) 配置
const TTS_ACCESS_TOKEN = process.env.TTS_ACCESS_TOKEN || '';
const TTS_APP_ID = process.env.TTS_APP_ID || '';
const TTS_SPEAKER = process.env.TTS_SPEAKER || 'zh_female_sajiaonvyou_moon_bigtts'; // 默认音色
// TTS API Key (如果提供，优先使用)
const TTS_API_KEY = process.env.TTS_API_KEY || '';
const TTS_API_KEY_NAME = process.env.TTS_API_KEY_NAME || '';

// 火山方舟 LLM 配置
const LLM_ENDPOINT_ID = process.env.LLM_ENDPOINT_ID || '';
const ARK_API_KEY = process.env.ARK_API_KEY || '';

// 配置验证和日志
console.log('[VolcEngine Config] ====================');
console.log('[VolcEngine Config] ASR_APP_ID:', ASR_APP_ID ? '✓ Configured' : '✗ Not configured');
console.log('[VolcEngine Config] ASR_ACCESS_TOKEN:', ASR_ACCESS_TOKEN ? '✓ Configured' : '✗ Not configured');
console.log('[VolcEngine Config] TTS_APP_ID:', TTS_APP_ID ? '✓ Configured' : '✗ Not configured');
console.log('[VolcEngine Config] TTS_ACCESS_TOKEN:', TTS_ACCESS_TOKEN ? '✓ Configured' : '✗ Not configured');
console.log('[VolcEngine Config] TTS_SPEAKER:', TTS_SPEAKER);
console.log('[VolcEngine Config] LLM_ENDPOINT_ID:', LLM_ENDPOINT_ID ? '✓ Configured' : '✗ Not configured');
console.log('[VolcEngine Config] ARK_API_KEY:', ARK_API_KEY ? '✓ Configured' : '✗ Not configured');
console.log('[VolcEngine Config] ====================');

// 火山引擎 API 基础URL
// 根据文档：https://www.volcengine.com/docs/6561/1257584
const VOLCENGINE_API_BASE = 'https://openspeech.bytedance.com';
const ARK_API_BASE = 'https://ark.cn-beijing.volces.com/api/v3';

// ==================== 火山引擎 API 辅助函数 ====================

// 注意：火山引擎API签名函数已移除，当前使用Bearer Token认证
// 如果需要AK/SK签名认证，可以参考：https://www.volcengine.com/docs/6291/65568

/**
 * 调用火山引擎语音识别API（非流式，用于文件上传）
 * 参考文档：https://www.volcengine.com/docs/6561/1257584
 * 参考实现：ai-app-lab/demohouse/media2doc/backend/actions/asr.py
 * 
 * 注意：火山引擎ASR主要支持WebSocket流式识别，HTTP API可能需要使用任务提交方式
 * 这里提供一个基础实现，可能需要根据实际API文档调整
 */
async function callVolcEngineASR(audioBuffer: Buffer, appId: string, accessToken: string): Promise<string> {
  // 根据参考项目，火山引擎ASR API使用任务提交方式
  // 需要先上传音频文件到存储，然后提交任务
  // 但当前场景需要实时识别，这里暂时跳过HTTP API，直接fallback到SiliconFlow
  // 因为实时语音通话已经使用WebSocket ASR客户端，这个函数主要用于传统语音输入
  
  // 注意：火山引擎ASR的HTTP API主要用于异步任务提交，不适合实时场景
  // 实时场景应该使用WebSocket客户端（已在websocket-handler.ts中实现）
  // 这里直接抛出错误，让系统fallback到SiliconFlow
  throw new Error('VolcEngine ASR HTTP API not suitable for real-time recognition. Use WebSocket client instead.');
}

/**
 * 调用火山引擎语音合成API（流式，使用WebSocket）
 * 参考文档：https://www.volcengine.com/docs/6561/1257584
 * 
 * 使用WebSocket客户端实现流式TTS合成
 */
async function* callVolcEngineTTS(
  text: string,
  appId: string,
  accessToken: string,
  speaker: string = TTS_SPEAKER
): AsyncGenerator<Buffer, void, unknown> {
  const client = new VolcEngineTTSClient(appId, accessToken, speaker);
  
  try {
    // 初始化WebSocket连接
    await client.init();
    console.log('[VolcEngine TTS WS] Client initialized');
    
    // 使用Promise队列实现流式yield
    const audioQueue: Buffer[] = [];
    let finished = false;
    let resolveNext: ((value: void) => void) | null = null;
    let rejectNext: ((error: Error) => void) | null = null;
    
    // 监听音频数据
    client.on('audio', (audio: Buffer) => {
      audioQueue.push(audio);
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }
    });
    
    // 监听会话结束
    client.on('sessionFinished', () => {
      finished = true;
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }
    });
    
    // 监听错误
    client.on('error', (error: Error) => {
      finished = true;
      if (rejectNext) {
        rejectNext(error);
        rejectNext = null;
      }
    });
    
    // 发送文本进行合成
    await client.synthesize(text, true);
    
    // 流式yield音频数据
    while (!finished || audioQueue.length > 0) {
      if (audioQueue.length > 0) {
        const chunk = audioQueue.shift()!;
        yield chunk;
      } else if (!finished) {
        // 等待下一个音频块
        await new Promise<void>((resolve, reject) => {
          resolveNext = resolve;
          rejectNext = reject;
          // 超时保护（10秒）
          setTimeout(() => {
            if (resolveNext === resolve) {
              resolveNext = null;
              rejectNext = null;
              if (audioQueue.length === 0 && finished) {
                resolve();
              } else {
                reject(new Error('TTS timeout'));
              }
            }
          }, 10000);
        });
      }
    }
    
    // 关闭连接
    await client.close();
  } catch (error) {
    console.error('[VolcEngine TTS WS] Error:', error);
    await client.close().catch(() => {});
    throw error;
  }
}

/**
 * 调用火山方舟LLM API（流式）
 * 参考文档：https://www.volcengine.com/docs/82379/1298459
 */
async function* callVolcEngineLLM(
  messages: Array<{ role: string; content: string }>,
  endpointId: string,
  apiKey: string
): AsyncGenerator<string, void, unknown> {
  // 火山方舟API调用
  // 根据文档，endpoint_id作为model参数传递
  const url = `${ARK_API_BASE}/chat/completions`;
  
  try {
    const response = await axios.post(
      url,
      {
        model: endpointId, // 使用endpoint_id作为model
        messages: messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );
    
    // 解析SSE流
    let buffer = '';
    for await (const chunk of response.data) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        
        // 处理SSE格式：data: {...}
        if (line.startsWith('data: ')) {
          const data = line.substring(6).trim();
          if (data === '[DONE]') continue;
          
          try {
            const json = JSON.parse(data);
            // 支持多种响应格式
            const content = json.choices?.[0]?.delta?.content || 
                          json.choices?.[0]?.message?.content || 
                          json.content || '';
            if (content) {
              yield content;
            }
          } catch (e) {
            // 忽略解析错误，继续处理下一行
            console.warn('[VolcEngine LLM] Failed to parse SSE data:', line);
          }
        } else if (line.startsWith('{')) {
          // 直接JSON格式（非SSE）
          try {
            const json = JSON.parse(line);
            const content = json.choices?.[0]?.delta?.content || 
                          json.choices?.[0]?.message?.content || 
                          json.content || '';
            if (content) {
              yield content;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const responseData = error.response?.data;
      
      // 尝试读取错误响应内容
      let errorMessage = 'Unknown error';
      if (responseData) {
        if (typeof responseData === 'string') {
          errorMessage = responseData;
        } else if (typeof responseData.pipe === 'function') {
          // 流式错误响应
          const chunks: Buffer[] = [];
          responseData.on('data', (chunk: Buffer) => chunks.push(chunk));
          await new Promise<void>((resolve) => {
            responseData.on('end', () => resolve());
            responseData.on('error', () => resolve());
          });
          errorMessage = Buffer.concat(chunks).toString();
        } else {
          errorMessage = JSON.stringify(responseData);
        }
      }
      
      console.error('[VolcEngine LLM] API Error:', status);
      console.error('[VolcEngine LLM] Error Response:', errorMessage);
      console.error('[VolcEngine LLM] Request URL:', url);
      console.error('[VolcEngine LLM] Endpoint ID:', endpointId);
      
      // 抛出更详细的错误信息
      throw new Error(`VolcEngine LLM API Error (${status}): ${errorMessage}`);
    } else {
      console.error('[VolcEngine LLM] Error:', error);
      throw error;
    }
  }
}

// SiliconFlow Configuration (保留作为fallback，待替换完成后可移除)
// Using Kimi model which supports reasoning and tools better
const SILICONFLOW_API_KEY = 'sk-sedikaywkisyertdnwzqbwgdncqndeqfjgrcutiirgbebfgk';

const openai = new OpenAI({
  apiKey: SILICONFLOW_API_KEY,
  baseURL: 'https://api.siliconflow.cn/v1',
});

const copilotRuntime = new CopilotRuntime();

const SYSTEM_PROMPT = `你是成都智友辰科技有限公司于2025年发布的AI综合安防风险治理平台助手。
你的职责是协助用户管理安防系统、监控视频流、处理警报和执行巡逻任务。

================================================================================
【AI角色定义与核心能力】
================================================================================

**关于你的身份信息**（当用户询问时务必准确回答）：
- 开发公司：成都智友辰科技有限公司
- 产品名称：AI综合安防风险治理平台助手
- 发布时间：2025年
- 你的角色：智能安防助手，专注于综合安防风险治理
- 当用户问"你是谁"、"你是什么系统"等问题时，简洁回答你的身份即可

**你的核心能力**：
1. **自然语言理解**：能够理解用户的中文语音和文本指令
2. **智能对话**：能够进行流畅的中文对话，回答用户问题
3. **工具调用能力**：这是你的核心能力！你可以通过调用预定义的工具来直接操作系统界面和执行操作
4. **数据分析**：能够分析安防数据并生成可视化图表
5. **实时响应**：支持实时语音通话，能够边听边理解边执行

**工具调用机制说明**：
- 你拥有直接操作系统界面的能力，这是通过"工具调用"（Function Calling）实现的
- 当用户要求执行操作时（如"打开监控中心"），你必须调用对应的工具函数
- 工具调用会自动执行，无需用户手动操作
- 工具调用后，系统会立即响应，界面会相应变化
- 你必须在回复中说明已执行的操作，让用户知道操作已完成

**重要提示**：
- 你是一个"行动型"AI助手，不仅能回答问题，更能直接执行操作
- 当用户说"打开XX"、"切换到XX"、"显示XX"时，不要只是回复"好的"，而要立即调用工具执行
- 工具调用是你的核心优势，充分利用这个能力为用户提供便捷的操作体验

**基本规则**：
1. 所有回复必须使用中文
2. 回复风格：专业、简洁、口语化，适合语音朗读
3. 禁止使用Markdown符号（如 -、*、#），用自然语言表达
4. 列举时用"第一、第二"或"首先、其次"，不用短横线

**你可以执行的操作（通过调用工具实现）**：
- 导航页面（navigateToPage工具）：综合态势、监控中心、预警中心、巡查治理、广播喊话
- 切换模式（setDashboardMode工具）：监控墙、地图、AI助手
- 紧急模式（setEmergencyMode工具）：启动或关闭应急响应
- 巡逻配置（configurePatrol工具）：自动切换摄像头
- 数据可视化（generateChart、generateInsight工具）：生成图表和分析总结

**重要：当用户要求执行上述任何操作时，你必须调用对应的工具，不要说"无法执行"。**

================================================================================
【核心交互规则 - 数据分析与图表生成】
================================================================================

**第一步：识别用户意图**
当用户的问题涉及以下关键词时，进入"数据分析流程"：
- 趋势、统计、分析、数据、报表、图表
- 告警情况、摄像头状态、系统性能、巡逻数据
- 最近、本周、本月、对比、分布、占比

**第二步：主动询问确认**
检测到数据分析意图后，先询问用户是否需要生成可视化图表：

示例对话：
用户："最近告警情况怎么样？"
你的回复："您想了解告警情况，我可以为您生成可视化图表来直观展示数据。请问需要我生成告警趋势图和分析报告吗？"

用户："分析一下本周的数据"
你的回复："好的，我可以为您分析本周的数据并生成图表。您希望查看哪方面的数据？告警统计、摄像头状态、还是系统性能？确认后我将为您生成相应的图表和分析报告。"

用户："预警趋势"
你的回复："您想查看预警趋势，我可以生成趋势折线图帮助您直观了解变化情况。需要我现在为您生成吗？"

**第三步：用户确认后执行**
只有当用户明确确认（如"好的"、"是的"、"生成"、"可以"、"帮我生成"、"需要"）后，才调用工具：

用户确认后，执行以下操作：
1. 调用 generateChart 生成1-2个相关图表（趋势图、分布图等）
2. 调用 generateInsight 生成文字分析总结
3. 回复"已为您生成图表和分析报告"

**直接执行的情况**（无需询问，直接调用工具）：
- 用户明确说"生成图表"、"画个图"、"给我看图表"
- 用户说"帮我生成XX图表"、"显示XX趋势图"
- 用户在确认询问后回复"好"、"是"、"可以"、"生成吧"

================================================================================
【图表生成参数说明】
================================================================================

**数据源**：
- /api/stats/alerts - 告警统计（级别分布、时间趋势、类型分布）
- /api/stats/cameras - 摄像头统计（在线/离线、趋势）
- /api/stats/patrol - 巡逻统计（次数、间隔）
- /api/stats/system - 系统性能（CPU、内存、磁盘）

**图表类型**：
- line（折线图）：适合趋势分析
- bar（柱状图）：适合数量对比
- pie（饼图）：适合占比分布

**时间范围**：
- 1d：最近24小时
- 7d：最近一周（默认）
- 30d：最近一月
- 90d：最近三月

**调用示例**：
generateChart({
  dataSource: "/api/stats/alerts",
  chartType: "line",
  title: "最近7天告警趋势",
  timeRange: "7d"
})

generateInsight({
  title: "告警态势分析",
  content: "根据数据分析，本周告警总量XX条，其中高危告警占比XX%。建议加强XX时段的监控力度。",
  contentType: "markdown",
  layout: "half"
})

================================================================================
【工具调用能力详解 - 你的核心功能】
================================================================================

**工具调用是什么？**
工具调用（Function Calling）是你的核心能力，允许你直接操作系统界面和执行操作。
当用户提出操作需求时，你可以通过调用预定义的工具函数来立即执行，无需用户手动操作。

**工具调用的工作流程**：
1. 用户提出需求（如"打开监控中心"）
2. 你识别需求并选择对应的工具
3. 你调用工具函数，传入正确的参数
4. 系统自动执行操作，界面立即响应
5. 你向用户确认操作已完成

**你拥有的工具列表**：

1. **navigateToPage** - 页面导航工具（最常用）
   - 功能：在系统不同页面间切换
   - page参数可选值：
     * "dashboard" - 综合态势（主页/大屏）
     * "monitor" - 监控中心
     * "alert" - 预警中心
     * "patrol" - 巡查治理
     * "broadcast" - 广播喊话
   - 调用示例：
     * 用户说"打开监控中心" → navigateToPage({ page: "monitor" })
     * 用户说"切换到预警中心" → navigateToPage({ page: "alert" })
     * 用户说"去广播喊话" → navigateToPage({ page: "broadcast" })
     * 用户说"回到主页" → navigateToPage({ page: "dashboard" })

2. **setDashboardMode** - 切换仪表板中心面板模式
   - 功能：改变综合态势页面的中心显示模式
   - mode参数可选值：
     * "video-grid" - 监控墙（视频网格）
     * "map" - 地图模式
     * "ai-chat" - AI助手模式
   - 调用示例：
     * 用户说"打开监控墙" → setDashboardMode({ mode: "video-grid" })
     * 用户说"显示地图" → setDashboardMode({ mode: "map" })

3. **setEmergencyMode** - 紧急模式控制
   - 功能：启动或关闭应急响应模式
   - active参数：true（启动）/ false（关闭）
   - 调用示例：
     * 用户说"启动紧急模式" → setEmergencyMode({ active: true })
     * 用户说"关闭紧急模式" → setEmergencyMode({ active: false })

4. **configurePatrol** - 巡逻配置
   - 功能：配置自动巡逻功能
   - 参数：
     * active: true/false - 是否启用
     * interval: number（可选）- 切换间隔（分钟）
   - 调用示例：
     * 用户说"开始自动巡逻" → configurePatrol({ active: true })
     * 用户说"停止巡逻" → configurePatrol({ active: false })

5. **generateChart** - 生成数据图表
   - 功能：生成数据可视化图表
   - 参数：dataSource（数据源）、chartType（图表类型）、title（标题）、timeRange（时间范围）
   - 详见下方"数据分析与图表生成"章节

6. **generateInsight** - 生成分析报告
   - 功能：生成文字分析总结
   - 参数：title（标题）、content（内容）、contentType（格式）、layout（布局）
   - 详见下方"数据分析与图表生成"章节

**工具调用的关键规则**：
1. **必须调用工具**：当用户明确要求执行操作时，你必须调用工具，不要说"我无法执行"
2. **立即执行**：识别到操作需求后，立即调用工具，不要犹豫或询问
3. **参数准确**：确保传入的参数值正确，参考上述参数说明
4. **确认反馈**：工具调用后，必须用中文向用户确认操作已完成
5. **组合使用**：可以同时调用多个工具完成复杂任务

**工具调用的响应格式**：
- 调用工具后，回复格式："已为您[操作描述]"
- 示例：
  * 调用 navigateToPage({ page: "monitor" }) 后 → "已为您切换到监控中心"
  * 调用 setEmergencyMode({ active: true }) 后 → "已启动紧急模式"
  * 调用 configurePatrol({ active: true }) 后 → "已开始自动巡逻"

**常见错误避免**：
- ❌ 错误："我无法打开监控中心" → ✅ 正确：直接调用 navigateToPage({ page: "monitor" })
- ❌ 错误："您可以手动点击监控中心按钮" → ✅ 正确：直接调用工具执行
- ❌ 错误："好的，我帮您打开"（但不调用工具） → ✅ 正确：调用工具 + 确认回复

**工具调用时必须返回文字说明**：
调用任何工具后，都要用中文说明执行了什么操作，不要只调用工具而不返回文字。`;


class SiliconFlowAdapter extends OpenAIAdapter {
    constructor() {
        // Using DeepSeek-V3.1-Terminus model - better function calling support
        super({ openai: openai as any, model: "deepseek-ai/DeepSeek-V3.1-Terminus" });
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
                        description: "数据源API端点。可选值：/api/stats/cameras（摄像头统计）、/api/stats/alerts（告警统计）、/api/stats/patrol（巡逻统计）、/api/stats/system（系统性能）",
                        enum: ["/api/stats/cameras", "/api/stats/alerts", "/api/stats/patrol", "/api/stats/system"]
                    },
                    chartType: {
                        type: "string",
                        description: "图表类型。line=折线图（趋势分析）、bar=柱状图（数量对比）、pie=饼图（占比分布）、scatter=散点图（相关性分析）、radar=雷达图（多维评估）",
                        enum: ["line", "bar", "pie", "scatter", "radar"]
                    },
                    title: {
                        type: "string",
                        description: "图表标题（中文），如'最近7天告警趋势'、'告警级别分布'"
                    },
                    description: {
                        type: "string",
                        description: "图表描述说明（可选），简要说明图表展示的内容"
                    },
                    timeRange: {
                        type: "string",
                        description: "时间范围。1d=最近1天/24小时，7d=最近7天/一周（默认），30d=最近30天/一月，90d=最近90天/三月",
                        enum: ["1d", "7d", "30d", "90d"]
                    },
                    dataMapping: {
                        type: "object",
                        description: "数据映射配置（可选，系统会自动检测）。用于指定如何从API数据中提取图表所需字段。折线图/柱状图示例：{xAxis: 'trend.categories', series: 'trend.series'}。饼图示例：{data: 'levelDistribution'} 或 {data: 'typeDistribution'}。如果不提供，系统会自动检测数据字段。",
                        additionalProperties: true
                    }
                },
                required: ["dataSource", "chartType", "title"]
            }
        };
        
        // Schema for generateInsight action
        KNOWN_ACTION_SCHEMAS["generateInsight"] = {
            type: "object",
            properties: {
                title: {
                    type: "string",
                    description: "标题：分析总结的标题，如'告警态势分析'、'数据分析报告'"
                },
                content: {
                    type: "string",
                    description: "内容：Markdown格式的分析总结内容。应包含数据摘要、趋势分析、建议措施、风险评估等部分。使用#标题、**加粗**、列表等Markdown语法。"
                },
                contentType: {
                    type: "string",
                    description: "内容类型：markdown（推荐，支持格式化）, text（纯文本）, html（HTML格式）",
                    enum: ["markdown", "text", "html"]
                },
                layout: {
                    type: "string",
                    description: "布局：half（占半行，与图表并排显示，推荐）, full（占满一行）",
                    enum: ["half", "full"]
                }
            },
            required: ["title", "content"]
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
            // 在流开始时就创建 messageId，确保所有事件使用相同的 ID
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            console.log(`[SiliconFlowAdapter] Created messageId: ${messageId}`);
            
            const toolCallMap = new Map<number, string>(); // index -> id
            const toolCallNames = new Map<number, string>(); // index -> name
            const toolCallArgsBuffer = new Map<number, string>(); // index -> accumulated args
            const calledToolNames: string[] = []; // Track which tools were called
            const fullMessageBuffer: string[] = []; // 累积完整消息内容
            
            // 实时TTS变量
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            let ttsBuffer = ''; // 累积待TTS的文本
            let ttsIndex = 0; // TTS片段索引
            const TTS_THRESHOLD = 50; // 累积50字符就发送TTS（提高阈值，减少切分）
            
            // 清理Markdown格式并优化文本以适合TTS的函数
            // 保留所有正常标点符号（逗号、句号、感叹号、问号、分号），只删除Markdown格式符号
            const cleanTextForTTS = (text: string): string => {
                let cleaned = text;
                
                // 移除Markdown格式符号（保留内容）
                cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2'); // 移除粗体/斜体标记，保留文本
                cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2'); // 移除斜体标记，保留文本
                cleaned = cleaned.replace(/^#+\s/gm, ''); // 移除标题标记
                cleaned = cleaned.replace(/^[-*+]\s/gm, ''); // 移除列表标记（- * +）
                cleaned = cleaned.replace(/^\d+\.\s/gm, ''); // 移除有序列表数字
                cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, '$1'); // 移除链接格式，保留文本
                cleaned = cleaned.replace(/`{1,3}([^`]+)`{1,3}/g, '$1'); // 移除代码标记，保留内容
                cleaned = cleaned.replace(/^>\s/gm, ''); // 移除引用标记
                cleaned = cleaned.replace(/<[^>]+>/g, ''); // 移除HTML标签
                
                // 处理换行符：如果换行前没有标点符号，添加句号
                cleaned = cleaned.replace(/([^，。！？；\n])\n+/g, '$1。');
                // 多个连续换行符替换为单个句号
                cleaned = cleaned.replace(/\n{2,}/g, '。');
                // 单个换行符替换为空格
                cleaned = cleaned.replace(/\n/g, ' ');
                
                // 确保标点符号后有适当的空格
                cleaned = cleaned.replace(/([，。！？；])([^，。！？；\s])/g, '$1 $2');
                
                // 移除多余的空格，但保留标点符号后的空格
                cleaned = cleaned.replace(/[ \t]+/g, ' ');
                
                return cleaned.trim();
            };
            
            // 按句子边界切分文本的函数（保留所有标点符号）
            const splitTextBySentences = (text: string, maxLength: number): string[] => {
                const sentences: string[] = [];
                const sentenceEndings = /[。！？]/; // 句子结束符
                
                // 如果文本长度小于阈值，直接返回
                if (text.length <= maxLength) {
                    return [text];
                }
                
                let currentChunk = '';
                
                for (let i = 0; i < text.length; i++) {
                    currentChunk += text[i];
                    
                    // 如果遇到句子结束符（句号、问号、感叹号）
                    if (sentenceEndings.test(text[i])) {
                        // 如果当前块已经达到阈值，切分
                        if (currentChunk.length >= maxLength) {
                            sentences.push(currentChunk.trim());
                            currentChunk = '';
                        }
                    }
                    // 如果当前块超过阈值且没有找到句子边界，在逗号或分号处切分
                    else if (currentChunk.length >= maxLength * 1.5) {
                        const lastComma = currentChunk.lastIndexOf('，');
                        const lastSemicolon = currentChunk.lastIndexOf('；');
                        const lastPause = Math.max(lastComma, lastSemicolon);
                        
                        if (lastPause > maxLength * 0.5) {
                            sentences.push(currentChunk.substring(0, lastPause + 1).trim());
                            currentChunk = currentChunk.substring(lastPause + 1);
                        } else {
                            // 如果找不到合适的切分点，强制在阈值处切分
                            sentences.push(currentChunk.substring(0, maxLength).trim());
                            currentChunk = currentChunk.substring(maxLength);
                        }
                    }
                }
                
                // 添加剩余内容
                if (currentChunk.trim().length > 0) {
                    sentences.push(currentChunk.trim());
                }
                
                return sentences.filter(s => s.length > 0);
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
                console.log("[SiliconFlowAdapter] Requesting streaming completion from SiliconFlow (DeepSeek-V3.1-Terminus)...");

                const payload = {
                    model: "deepseek-ai/DeepSeek-V3.1-Terminus",
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

                    // Handle content streaming (DeepSeek-V3.2-Exp)
                    const content = delta.content || "";
                    
                    if (content) {
                        // 累积内容到缓冲区
                        fullMessageBuffer.push(content);
                        
                        if (!startedTextMessage) {
                            // 使用预创建的 messageId
                            eventStream$.sendTextMessageStart({ messageId });
                            startedTextMessage = true;
                            
                            // 立即发送sessionId给前端（作为第一个内容）
                            eventStream$.sendTextMessageContent({
                                messageId,
                                content: `<!--AUDIO_SESSION:${sessionId}-->`
                            });
                            
                            console.log(`[Real-time TTS] Sent session ID to frontend: ${sessionId}`);
                        }
                        
                        // 发送实际内容
                        eventStream$.sendTextMessageContent({
                            messageId,
                            content: content
                        });
                        
                        // 累积到TTS缓冲区
                        ttsBuffer += content;
                        
                        // 当累积足够长度，按句子边界切分并发送TTS
                        if (ttsBuffer.length >= TTS_THRESHOLD) {
                            const chunks = splitTextBySentences(ttsBuffer, TTS_THRESHOLD);
                            
                            // 发送所有完整的句子块（除了最后一个）
                            for (let i = 0; i < chunks.length - 1; i++) {
                                await sendTTSChunk(chunks[i]);
                            }
                            
                            // 保留最后一个块（可能不完整）
                            ttsBuffer = chunks.length > 0 ? chunks[chunks.length - 1] : '';
                        }
                    }

                    // Handle tool calls - 累积工具调用信息，在流结束后统一发送
                    if (delta.tool_calls) {
                        for (const toolCall of delta.tool_calls) {
                            const index = toolCall.index;
                            
                            if (toolCall.id) {
                                // 记录工具调用信息（不立即发送事件）
                                const id = toolCall.id;
                                const toolName = toolCall.function?.name || "";
                                toolCallMap.set(index, id);
                                toolCallNames.set(index, toolName);
                                toolCallArgsBuffer.set(index, ""); // 初始化参数缓冲区
                                
                                console.log(`[Tool Call] Detected: ${toolName} (id: ${id}, index: ${index})`);
                                
                                // Track tool name for intelligent fallback
                                if (toolName && !calledToolNames.includes(toolName)) {
                                    calledToolNames.push(toolName);
                                }
                            }

                            // 累积参数片段
                            const args = toolCall.function?.arguments;
                            if (args) {
                                const currentArgs = toolCallArgsBuffer.get(index) || "";
                                toolCallArgsBuffer.set(index, currentArgs + args);
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
                    
                    // 将fallback消息添加到缓冲区，以便日志正确显示
                    fullMessageBuffer.push(fallbackMessage);
                    
                    eventStream$.sendTextMessageStart({ messageId });
                    eventStream$.sendTextMessageContent({
                        messageId,
                        content: fallbackMessage
                    });
                    eventStream$.sendTextMessageEnd({ messageId });
                    console.log(`[SiliconFlowAdapter] Sent intelligent fallback: "${fallbackMessage}" for tools: [${calledToolNames.join(', ')}]`);
                } else if (startedTextMessage) {
                    // 只有在发送了正常文本消息时才发送 End
                    eventStream$.sendTextMessageEnd({ messageId });
                }

                // 发送所有工具调用事件（按顺序：Start -> Args -> End）
                for (const [index, id] of toolCallMap.entries()) {
                    const toolName = toolCallNames.get(index) || "";
                    const fullArgs = toolCallArgsBuffer.get(index) || "{}";
                    
                    console.log(`[Tool Call] Sending complete tool call: ${toolName} (id: ${id})`);
                    console.log(`[Tool Call] Full args: ${fullArgs}`);
                    
                    // 1. 发送 ActionExecutionStart
                    eventStream$.sendActionExecutionStart({
                        actionExecutionId: id,
                        actionName: toolName,
                        parentMessageId: messageId
                    });
                    console.log(`[Tool Call] Sent ActionExecutionStart for: ${toolName}`);
                    
                    // 2. 发送完整的参数
                    eventStream$.sendActionExecutionArgs({
                        actionExecutionId: id,
                        args: fullArgs
                    });
                    console.log(`[Tool Call] Sent ActionExecutionArgs for: ${toolName}`);
                    
                    // 3. 发送 ActionExecutionEnd
                    eventStream$.sendActionExecutionEnd({ actionExecutionId: id });
                    console.log(`[Tool Call] Sent ActionExecutionEnd for: ${toolName}`);
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

// ==================== 火山方舟适配器 ====================
/**
 * 火山方舟LLM适配器
 * 使用Doubao-pro-32k模型，支持工具调用
 */
class VolcEngineAdapter extends OpenAIAdapter {
    constructor() {
        // 创建一个虚拟的OpenAI客户端用于适配器接口
        // 实际调用会使用callVolcEngineLLM函数
        super({ 
            openai: {
                chat: {
                    completions: {
                        create: async () => {
                            throw new Error('VolcEngineAdapter should use process() method directly');
                        }
                    }
                }
            } as any, 
            model: LLM_ENDPOINT_ID || 'doubao-pro-32k' 
        });
    }

    async process(request: any): Promise<any> {
        const { messages, eventSource, actions } = request;
        
        console.log(`[VolcEngineAdapter] Processing request. Actions count: ${actions?.length || 0}`);

        // 检查是否配置了火山方舟
        const useVolcEngine = LLM_ENDPOINT_ID && ARK_API_KEY;
        
        if (!useVolcEngine) {
            console.warn('[VolcEngineAdapter] VolcEngine not configured, falling back to SiliconFlow');
            // Fallback to SiliconFlow
            const fallbackAdapter = new SiliconFlowAdapter();
            return fallbackAdapter.process(request);
        }

        // 消息格式转换（与SiliconFlowAdapter相同）
        const openAIMessages = messages
            .map((msg: any, index: number) => {
                let role = 'user';
                let content = msg.content;

                if (msg.role === 'system') {
                    role = 'system';
                } else if (msg.role === 'assistant') {
                    role = 'assistant';
                } else if (msg.role === 'user') {
                    role = 'user';
                } else if (msg.type === 'TextMessage') {
                    role = msg.role === 'assistant' ? 'assistant' : 'user';
                } else if (msg.type === 'ActionExecutionMessage' || msg.type === 'ResultMessage') {
                    return null;
                }

                if (typeof content !== 'string') {
                    content = JSON.stringify(content || "");
                }
                
                if (!content || content.trim() === '' || content === '{}' || content === 'null') {
                    return null;
                }

                return { role, content };
            })
            .filter((msg: any) => msg !== null);

        // 注入系统提示
        if (openAIMessages.length > 0 && openAIMessages[0].role === 'system') {
            openAIMessages[0].content = `${SYSTEM_PROMPT}\n\n${openAIMessages[0].content}`;
        } else {
            openAIMessages.unshift({ role: 'system', content: SYSTEM_PROMPT });
        }

        // 工具定义（与SiliconFlowAdapter相同）
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
                        description: "数据源API端点",
                        enum: ["/api/stats/cameras", "/api/stats/alerts", "/api/stats/patrol", "/api/stats/system"]
                    },
                    chartType: {
                        type: "string",
                        description: "图表类型",
                        enum: ["line", "bar", "pie", "scatter", "radar"]
                    },
                    title: { type: "string", description: "图表标题（中文）" },
                    description: { type: "string", description: "图表描述说明（可选）" },
                    timeRange: {
                        type: "string",
                        enum: ["1d", "7d", "30d", "90d"]
                    },
                    dataMapping: { type: "object", description: "数据映射配置（可选）" }
                },
                required: ["dataSource", "chartType", "title"]
            },
            generateInsight: {
                type: "object",
                properties: {
                    title: { type: "string", description: "分析总结的标题" },
                    content: { type: "string", description: "Markdown格式的分析总结内容" },
                    contentType: {
                        type: "string",
                        enum: ["markdown", "text", "html"]
                    },
                    layout: {
                        type: "string",
                        enum: ["half", "full"]
                    }
                },
                required: ["title", "content"]
            }
        };

        // 构建工具定义（与SiliconFlowAdapter相同）
        const tools = actions && actions.length > 0 ? actions.map((action: any) => {
            const schema = KNOWN_ACTION_SCHEMAS[action.name];
            if (!schema) {
                console.warn(`[VolcEngineAdapter] Unknown action: ${action.name}`);
                return null;
            }
            return {
                type: "function",
                function: {
                    name: action.name,
                    description: action.description || schema.description || "",
                    parameters: schema
                }
            };
        }).filter((tool: any) => tool !== null) : undefined;
        
        console.log(`[VolcEngineAdapter] Tools count: ${tools?.length || 0}`);
        if (tools && tools.length > 0) {
            console.log(`[VolcEngineAdapter] Tool names: ${tools.map((t: any) => t.function.name).join(", ")}`);
        }

        // 处理流式响应
        eventSource.stream(async (eventStream$: any) => {
            let startedTextMessage = false;
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            // 注意：火山方舟API的工具调用支持可能需要不同的实现方式
            // 当前版本先实现基础文本流式响应，工具调用功能待完善
            let fullMessageBuffer = '';
            let ttsBuffer = '';
            const TTS_THRESHOLD = 50;
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // 文本切分函数（与SiliconFlowAdapter相同）
            const splitTextBySentences = (text: string, maxLength: number): string[] => {
                if (text.length <= maxLength) return [text];
                
                const chunks: string[] = [];
                let currentChunk = '';
                
                const sentenceEndings = /[。！？；\n]/;
                const parts = text.split(sentenceEndings);
                
                for (const part of parts) {
                    if ((currentChunk + part).length <= maxLength) {
                        currentChunk += part;
                    } else {
                        if (currentChunk) chunks.push(currentChunk);
                        currentChunk = part;
                    }
                }
                if (currentChunk) chunks.push(currentChunk);
                
                return chunks.length > 0 ? chunks : [text];
            };

            const sendTTSChunk = async (text: string) => {
                if (!text.trim()) return;
                
                try {
                    const useVolcEngineTTS = TTS_ACCESS_TOKEN && TTS_APP_ID;
                    if (useVolcEngineTTS) {
                        let audioBuffer = Buffer.alloc(0);
                        for await (const chunk of callVolcEngineTTS(text, TTS_APP_ID, TTS_ACCESS_TOKEN, TTS_SPEAKER)) {
                            audioBuffer = Buffer.concat([audioBuffer, chunk]);
                        }
                        
                        if (audioBuffer.length > 0) {
                            audioEventEmitter.emit('audio', {
                                sessionId,
                                audio: audioBuffer,
                                text: text,
                                index: audioBuffers.get(sessionId)?.length || 0
                            });
                            
                            if (!audioBuffers.has(sessionId)) {
                                audioBuffers.set(sessionId, []);
                            }
                            audioBuffers.get(sessionId)!.push({
                                audio: audioBuffer,
                                text: text,
                                index: audioBuffers.get(sessionId)!.length
                            });
                        }
                    }
                } catch (err) {
                    console.error(`[VolcEngineAdapter TTS] Error:`, err);
                }
            };

            try {
                console.log("[VolcEngineAdapter] Requesting streaming completion from VolcEngine...");
                console.log("[VolcEngineAdapter] Endpoint ID:", LLM_ENDPOINT_ID);
                console.log("[VolcEngineAdapter] Messages count:", openAIMessages.length);
                console.log("[VolcEngineAdapter] First message:", openAIMessages[0]?.role, openAIMessages[0]?.content?.substring(0, 100));

                // 调用火山方舟LLM（直接处理流式响应，支持工具调用）
                let hasContent = false;
                let toolCallMap = new Map<number, { id: string; name: string; args: string }>(); // index -> tool call info
                let hasToolCalls = false;
                let fullMessageBuffer = '';
                let functionCallBuffer = ''; // 用于累积工具调用格式的内容
                let inFunctionCall = false; // 是否在工具调用块中
                
                try {
                    // 直接调用API，不使用callVolcEngineLLM，以便处理工具调用
                    const llmPayload = {
                        model: LLM_ENDPOINT_ID,
                        messages: openAIMessages,
                        stream: true,
                        temperature: 0.7,
                        max_tokens: 4096,
                        ...(tools && tools.length > 0 ? { tools: tools } : {})
                    };
                    
                    const llmResponse = await axios.post(
                        `${ARK_API_BASE}/chat/completions`,
                        llmPayload,
                        {
                            headers: {
                                'Authorization': `Bearer ${ARK_API_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            responseType: 'stream'
                        }
                    );
                    
                    // 解析SSE流
                    let buffer = '';
                    for await (const chunk of llmResponse.data) {
                        buffer += chunk.toString();
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';
                        
                        for (const line of lines) {
                            if (line.trim() === '') continue;
                            
                            if (line.startsWith('data: ')) {
                                const data = line.substring(6).trim();
                                if (data === '[DONE]') {
                                    // 处理工具调用
                                    if (hasToolCalls && toolCallMap.size > 0) {
                                        console.log(`[VolcEngineAdapter] 检测到工具调用，发送ActionExecution事件`);
                                        for (const [index, toolCall] of toolCallMap.entries()) {
                                            try {
                                                const args = JSON.parse(toolCall.args || '{}');
                                                console.log(`[VolcEngineAdapter] 工具调用: ${toolCall.name}(${JSON.stringify(args)})`);
                                                
                                                // 发送工具调用事件
                                                eventStream$.sendActionExecutionStart({
                                                    actionName: toolCall.name,
                                                    actionExecutionId: toolCall.id
                                                });
                                                
                                                // args 必须是字符串格式的 JSON
                                                const argsString = typeof args === 'string' 
                                                    ? args 
                                                    : JSON.stringify(args || {});
                                                
                                                eventStream$.sendActionExecutionArgs({
                                                    actionExecutionId: toolCall.id,
                                                    args: argsString
                                                });
                                                
                                                eventStream$.sendActionExecutionEnd({
                                                    actionExecutionId: toolCall.id
                                                });
                                            } catch (e) {
                                                console.error(`[VolcEngineAdapter] 解析工具参数失败:`, e);
                                            }
                                        }
                                    }
                                    continue;
                                }
                                
                                try {
                                    const json = JSON.parse(data);
                                    
                                    // 检查工具调用（标准格式）
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
                                        console.log(`[VolcEngineAdapter] 检测到工具调用增量`);
                                        continue; // 工具调用时不处理文本内容
                                    }
                                    
                                    // 检查finish_reason是否为tool_calls
                                    if (json.choices?.[0]?.finish_reason === 'tool_calls') {
                                        hasToolCalls = true;
                                        console.log(`[VolcEngineAdapter] LLM完成，finish_reason为tool_calls`);
                                    }
                                    
                                    // 处理文本内容
                                    let content = json.choices?.[0]?.delta?.content || 
                                                  json.choices?.[0]?.message?.content || 
                                                  json.content || '';
                                    
                                    if (content) {
                                        // 检查是否是工具调用格式（<|FunctionCallBegin|>...<|FunctionCallEnd|>）
                                        if (content.includes('<|FunctionCallBegin|>')) {
                                            inFunctionCall = true;
                                            functionCallBuffer = '';
                                            const beginIndex = content.indexOf('<|FunctionCallBegin|>');
                                            if (beginIndex > 0) {
                                                // 处理工具调用前的文本
                                                const beforeText = content.substring(0, beginIndex);
                                                if (beforeText.trim()) {
                                                    hasContent = true;
                                                    if (!startedTextMessage) {
                                                        eventStream$.sendTextMessageStart({ messageId });
                                                        startedTextMessage = true;
                                                        eventStream$.sendTextMessageContent({
                                                            messageId,
                                                            content: `<!--AUDIO_SESSION:${sessionId}-->`
                                                        });
                                                    }
                                                    eventStream$.sendTextMessageContent({
                                                        messageId,
                                                        content: beforeText
                                                    });
                                                    fullMessageBuffer += beforeText;
                                                    ttsBuffer += beforeText;
                                                }
                                            }
                                            functionCallBuffer += content.substring(beginIndex + '<|FunctionCallBegin|>'.length);
                                        } else if (inFunctionCall) {
                                            // 在工具调用块中，累积内容
                                            functionCallBuffer += content;
                                            
                                            // 检查是否结束
                                            if (content.includes('<|FunctionCallEnd|>')) {
                                                const endIndex = content.indexOf('<|FunctionCallEnd|>');
                                                functionCallBuffer = functionCallBuffer.substring(0, endIndex);
                                                
                                                // 解析工具调用
                                                try {
                                                    const toolCalls = JSON.parse(functionCallBuffer);
                                                    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
                                                        hasToolCalls = true;
                                                        console.log(`[VolcEngineAdapter] 检测到工具调用格式: ${toolCalls.map((tc: any) => tc.name).join(", ")}`);
                                                        
                                                        for (let i = 0; i < toolCalls.length; i++) {
                                                            const toolCall = toolCalls[i];
                                                            const toolCallId = `tool_call_${Date.now()}_${i}`;
                                                            toolCallMap.set(i, {
                                                                id: toolCallId,
                                                                name: toolCall.name || '',
                                                                args: JSON.stringify(toolCall.parameters || {})
                                                            });
                                                        
                                                            // 发送工具调用事件
                                                            eventStream$.sendActionExecutionStart({
                                                                actionName: toolCall.name,
                                                                actionExecutionId: toolCallId
                                                            });
                                                            
                                                            // args 必须是字符串格式的 JSON
                                                            const argsString = typeof toolCall.parameters === 'string' 
                                                                ? toolCall.parameters 
                                                                : JSON.stringify(toolCall.parameters || {});
                                                            
                                                            eventStream$.sendActionExecutionArgs({
                                                                actionExecutionId: toolCallId,
                                                                args: argsString
                                                            });
                                                            
                                                            eventStream$.sendActionExecutionEnd({
                                                                actionExecutionId: toolCallId
                                                            });
                                                        }
                                                    }
                                                } catch (e) {
                                                    console.error(`[VolcEngineAdapter] 解析工具调用格式失败:`, e, functionCallBuffer);
                                                }
                                                
                                                inFunctionCall = false;
                                                functionCallBuffer = '';
                                                
                                                // 处理工具调用后的文本
                                                const afterText = content.substring(endIndex + '<|FunctionCallEnd|>'.length);
                                                if (afterText.trim()) {
                                                    hasContent = true;
                                                    if (!startedTextMessage) {
                                                        eventStream$.sendTextMessageStart({ messageId });
                                                        startedTextMessage = true;
                                                        eventStream$.sendTextMessageContent({
                                                            messageId,
                                                            content: `<!--AUDIO_SESSION:${sessionId}-->`
                                                        });
                                                    }
                                                    eventStream$.sendTextMessageContent({
                                                        messageId,
                                                        content: afterText
                                                    });
                                                    fullMessageBuffer += afterText;
                                                    ttsBuffer += afterText;
                                                }
                                            }
                                        } else {
                                            // 正常文本内容
                                            hasContent = true;
                                            if (!startedTextMessage) {
                                                eventStream$.sendTextMessageStart({ messageId });
                                                startedTextMessage = true;
                                                
                                                eventStream$.sendTextMessageContent({
                                                    messageId,
                                                    content: `<!--AUDIO_SESSION:${sessionId}-->`
                                                });
                                            }
                                            
                                            eventStream$.sendTextMessageContent({
                                                messageId,
                                                content: content
                                            });
                                            
                                            fullMessageBuffer += content;
                                            ttsBuffer += content;
                                            
                                            if (ttsBuffer.length >= TTS_THRESHOLD) {
                                                const chunks = splitTextBySentences(ttsBuffer, TTS_THRESHOLD);
                                                for (let i = 0; i < chunks.length - 1; i++) {
                                                    await sendTTSChunk(chunks[i]);
                                                }
                                                ttsBuffer = chunks.length > 0 ? chunks[chunks.length - 1] : '';
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.warn('[VolcEngineAdapter] Failed to parse SSE data:', line);
                                }
                            }
                        }
                    }
                } catch (llmError: any) {
                    console.error('[VolcEngineAdapter] LLM call error:', llmError);
                    console.error('[VolcEngineAdapter] LLM error stack:', llmError.stack);
                    throw llmError; // 重新抛出以便外层catch处理
                }

                // 发送剩余的TTS
                if (ttsBuffer.trim()) {
                    await sendTTSChunk(ttsBuffer);
                }

                // 检查是否收到任何内容
                if (!hasContent) {
                    // 如果有工具调用，生成友好的回复
                    if (hasToolCalls && toolCallMap.size > 0) {
                        console.log('[VolcEngineAdapter] 工具调用完成，生成确认回复');
                        const toolNames = Array.from(toolCallMap.values()).map(tc => tc.name);
                        const actionMap: Record<string, string> = {
                            'navigateToPage': '页面切换',
                            'setDashboardMode': '视图模式切换',
                            'setEmergencyMode': '紧急模式',
                            'configurePatrol': '巡逻配置',
                            'generateChart': '图表生成',
                            'generateInsight': '分析报告生成'
                        };
                        
                        const firstTool = toolNames[0];
                        let confirmMessage = actionMap[firstTool] || '操作';
                        if (toolNames.length > 1) {
                            confirmMessage += `等${toolNames.length}项`;
                        }
                        confirmMessage += '已完成';
                        
                        if (!startedTextMessage) {
                            eventStream$.sendTextMessageStart({ messageId });
                            startedTextMessage = true;
                        }
                        eventStream$.sendTextMessageContent({
                            messageId,
                            content: confirmMessage
                        });
                        fullMessageBuffer = confirmMessage;
                    } else {
                        console.warn('[VolcEngineAdapter] No content received from LLM');
                        if (!startedTextMessage) {
                            eventStream$.sendTextMessageStart({ messageId });
                            startedTextMessage = true;
                        }
                        eventStream$.sendTextMessageContent({
                            messageId,
                            content: '抱歉，未能获取到响应内容。'
                        });
                    }
                }

                // 发送完成事件
                if (startedTextMessage) {
                    eventStream$.sendTextMessageEnd({ messageId });
                }
                
                audioEventEmitter.emit('complete', { sessionId });
                eventStream$.complete();

            } catch (err: any) {
                console.error('[VolcEngineAdapter] Error:', err);
                console.error('[VolcEngineAdapter] Error message:', err.message);
                console.error('[VolcEngineAdapter] Error stack:', err.stack);
                
                if (!startedTextMessage) {
                    try {
                        eventStream$.sendTextMessageStart({ messageId: "error" });
                        eventStream$.sendTextMessageContent({ 
                            messageId: "error", 
                            content: `Error: ${err.message || "Unknown error"}` 
                        });
                        eventStream$.sendTextMessageEnd({ messageId: "error" });
                    } catch (streamError) {
                        console.error('[VolcEngineAdapter] Failed to send error to stream:', streamError);
                    }
                }
                
                try {
                    eventStream$.error(err);
                } catch (streamError) {
                    console.error('[VolcEngineAdapter] Failed to send error event:', streamError);
                }
            }
        });

        // 返回与SiliconFlowAdapter相同的格式
        return {
            threadId: request.threadId || "default_thread"
        };
    }
}

// 根据配置选择适配器
const serviceAdapter = (LLM_ENDPOINT_ID && ARK_API_KEY) 
    ? new VolcEngineAdapter() 
    : new SiliconFlowAdapter();

console.log(`[Service Adapter] Using ${(LLM_ENDPOINT_ID && ARK_API_KEY) ? 'VolcEngine' : 'SiliconFlow'} adapter`);

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
// 优先使用火山引擎ASR，如果未配置则fallback到SiliconFlow
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

    // 检查是否配置了火山引擎ASR
    const useVolcEngine = ASR_ACCESS_TOKEN && ASR_APP_ID;

    if (useVolcEngine) {
      console.log('[ASR] Using VolcEngine ASR API');
      try {
        const text = await callVolcEngineASR(req.file.buffer, ASR_APP_ID, ASR_ACCESS_TOKEN);
        console.log('[ASR] VolcEngine recognition successful:', text);
        res.json({ 
          text: text,
          language: 'zh'
        });
        return;
      } catch (error: unknown) {
        console.error('[ASR] VolcEngine API Error:', error);
        // Fallback to SiliconFlow if VolcEngine fails
        console.log('[ASR] Falling back to SiliconFlow...');
      }
    }

    // Fallback to SiliconFlow
    console.log('[ASR] Using SiliconFlow API (FunAudioLLM/SenseVoiceSmall)');
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    formData.append('file', req.file.buffer, {
      filename: 'recording.webm',
      contentType: 'audio/webm'
    });
    formData.append('model', 'FunAudioLLM/SenseVoiceSmall');

    try {
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

      console.log('[ASR] SiliconFlow recognition successful:', response.data);

      res.json({ 
        text: response.data.text || '',
        language: response.data.language || 'zh'
      });

    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        console.error('[ASR] SiliconFlow API Error:', error.response.status, error.response.data);
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

    // 清理文本中的Markdown格式并优化TTS断句
    // 保留所有正常标点符号（逗号、句号、感叹号、问号、分号），只删除Markdown格式符号
    const cleanText = (input: string): string => {
      let cleaned = input;
      
      // 移除Markdown格式符号（保留内容）
      cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2'); // 移除粗体/斜体标记，保留文本
      cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2'); // 移除斜体标记，保留文本
      cleaned = cleaned.replace(/^#+\s/gm, ''); // 移除标题标记
      cleaned = cleaned.replace(/^[-*+]\s/gm, ''); // 移除列表标记（- * +）
      cleaned = cleaned.replace(/^\d+\.\s/gm, ''); // 移除有序列表数字
      cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, '$1'); // 移除链接格式，保留文本
      cleaned = cleaned.replace(/`{1,3}([^`]+)`{1,3}/g, '$1'); // 移除代码标记，保留内容
      cleaned = cleaned.replace(/^>\s/gm, ''); // 移除引用标记
      cleaned = cleaned.replace(/<[^>]+>/g, ''); // 移除HTML标签
      
      // 处理换行符：如果换行前没有标点符号，添加句号
      cleaned = cleaned.replace(/([^，。！？；\n])\n+/g, '$1。');
      // 多个连续换行符替换为单个句号
      cleaned = cleaned.replace(/\n{2,}/g, '。');
      // 单个换行符替换为空格
      cleaned = cleaned.replace(/\n/g, ' ');
      
      // 确保标点符号后有适当的空格
      cleaned = cleaned.replace(/([，。！？；])([^，。！？；\s])/g, '$1 $2');
      
      // 移除多余的空格，但保留标点符号后的空格
      cleaned = cleaned.replace(/[ \t]+/g, ' ');
      
      return cleaned.trim();
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
// 优先使用火山引擎TTS，如果未配置则fallback到SiliconFlow
app.post('/api/text-to-speech', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'No text provided' });
    }

    console.log('[TTS] Generating speech for text:', text.substring(0, 100));

    // 检查是否配置了火山引擎TTS
    const useVolcEngine = TTS_ACCESS_TOKEN && TTS_APP_ID;

    if (useVolcEngine) {
      console.log('[TTS] Using VolcEngine TTS API');
      try {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');

        for await (const chunk of callVolcEngineTTS(text, TTS_APP_ID, TTS_ACCESS_TOKEN, TTS_SPEAKER)) {
          res.write(chunk);
        }

        console.log('[TTS] VolcEngine streaming audio completed');
        res.end();
        return;
      } catch (error: unknown) {
        console.error('[TTS] VolcEngine API Error:', error);
        // Fallback to SiliconFlow if VolcEngine fails
        console.log('[TTS] Falling back to SiliconFlow...');
      }
    }

    // Fallback to SiliconFlow
    console.log('[TTS] Using SiliconFlow API (FunAudioLLM/CosyVoice2-0.5B)');
    const response = await fetch('https://api.siliconflow.cn/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'FunAudioLLM/CosyVoice2-0.5B',
        input: text,
        voice: 'FunAudioLLM/CosyVoice2-0.5B:diana',
        response_format: 'mp3',
        sample_rate: 32000,
        stream: true,
        speed: 1.0,
        gain: 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS] SiliconFlow API Error:', response.status, errorText);
      
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

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

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
      console.log('[TTS] SiliconFlow streaming audio completed');
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

// ==================== WebSocket服务器（实时语音通话） ====================
import { VoiceCallWebSocketHandler } from './websocket-handler.js';

// 如果配置了火山引擎，启动WebSocket服务器
if (LLM_ENDPOINT_ID && ARK_API_KEY && TTS_APP_ID && TTS_ACCESS_TOKEN) {
  const voiceCallHandler = new VoiceCallWebSocketHandler({
    ASR_APP_ID,
    ASR_ACCESS_TOKEN,
    TTS_APP_ID,
    TTS_ACCESS_TOKEN,
    TTS_SPEAKER,
    LLM_ENDPOINT_ID,
    ARK_API_KEY
  }, 8888);
  console.log('[VoiceCall] WebSocket server initialized on port 8888');
} else {
  console.log('[VoiceCall] WebSocket server not started (missing configuration)');
}

app.listen(port, () => {
  console.log(`Copilot Runtime running at http://localhost:${port}`);
});

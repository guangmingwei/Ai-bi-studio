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

// ModelScope (Qwen) Configuration
const openai = new OpenAI({
  apiKey: 'ms-72003e3e-3abf-430c-8270-754595c6dd25',
  baseURL: 'https://api-inference.modelscope.cn/v1',
});

const copilotRuntime = new CopilotRuntime();

class SimpleQwenAdapter extends OpenAIAdapter {
    constructor() {
        super({ openai: openai as any, model: "Qwen/Qwen3-VL-235B-A22B-Instruct" });
    }

    async process(request: any): Promise<any> {
        // Extract necessary data
        const { messages, eventSource, actions } = request;
        
        console.log(`[SimpleQwenAdapter] Processing request. Actions count: ${actions?.length || 0}`);

        // Simple message conversion
        const openAIMessages = messages.map((msg: any) => {
             let role = msg.role;
             return {
                 role: role === 'TextMessage' ? 'user' : role,
                 content: msg.content
             }
        });

        // Helper to convert CopilotKit actions to OpenAI tools
        const tools = actions && actions.length > 0 ? actions.map((action: any) => ({
            type: "function",
            function: {
                name: action.name,
                description: action.description,
                parameters: action.parameters ? JSON.parse(action.parameters) : undefined,
            }
        })) : undefined;

        if (tools) {
           // console.log("[SimpleQwenAdapter] Available tools:", JSON.stringify(tools.map(t => t.function.name), null, 2));
        }

        // Manually handle the stream events
        eventSource.stream(async (eventStream$: any) => {
            try {
                console.log("[SimpleQwenAdapter] Requesting completion from OpenAI SDK...");
                
                const completion = await openai.chat.completions.create({
                    model: "Qwen/Qwen3-VL-235B-A22B-Instruct",
                    messages: openAIMessages,
                    tools: tools,
                    stream: false,
                });
                
                console.log("[SimpleQwenAdapter] Raw completion response received.");

                const message = completion.choices[0].message;
                const content = message.content || "";
                const toolCalls = message.tool_calls;

                console.log("[SimpleQwenAdapter] Content preview:", content.substring(0, 50));
                
                if (toolCalls && toolCalls.length > 0) {
                    console.log(`[SimpleQwenAdapter] Model triggered ${toolCalls.length} tool call(s):`);
                    toolCalls.forEach(tc => {
                        console.log(`  - Function: ${tc.function.name}`);
                        console.log(`  - Args: ${tc.function.arguments}`);
                    });
                } else {
                    console.log("[SimpleQwenAdapter] No tool calls in response.");
                }

                // 1. Send text content if available
                if (content) {
                    const messageId = completion.id;
                    eventStream$.sendTextMessageStart({ messageId });
                    eventStream$.sendTextMessageContent({
                        messageId,
                        content
                    });
                    eventStream$.sendTextMessageEnd({ messageId });
                }

                // 2. Send tool calls if available
                if (toolCalls) {
                    for (const toolCall of toolCalls) {
                         // Ensure args is a string for CopilotKit
                         const argsString = typeof toolCall.function.arguments === 'string' 
                            ? toolCall.function.arguments 
                            : JSON.stringify(toolCall.function.arguments);
                            
                         console.log(`[SimpleQwenAdapter] Sending ActionExecutionStart for ${toolCall.function.name}`);
                         
                         eventStream$.sendActionExecutionStart({
                              actionExecutionId: toolCall.id,
                              actionName: toolCall.function.name,
                              parentMessageId: completion.id
                         });
                         
                         eventStream$.sendActionExecutionArgs({
                              actionExecutionId: toolCall.id,
                              args: argsString
                         });

                         eventStream$.sendActionExecutionEnd({
                              actionExecutionId: toolCall.id
                         });
                    }
                }
                
                eventStream$.complete();

            } catch (err) {
                console.error("[SimpleQwenAdapter] Error:", err);
                eventStream$.error(err);
            }
        });

        return {
            threadId: request.threadId || "default_thread"
        };
    }
}

const serviceAdapter = new SimpleQwenAdapter();

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

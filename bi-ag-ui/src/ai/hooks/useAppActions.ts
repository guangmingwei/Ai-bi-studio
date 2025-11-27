import { useCopilotAction } from "@copilotkit/react-core";
import { useAppStore } from "../../store";
import type { PageView, CenterMode } from "../../store";

export const useAppActions = () => {
  console.log('[useAppActions] Hook initializing...');
  
  const { 
    setCurrentView, 
    setCenterMode, 
    setEmergency, 
    toggleNav, 
    setPatrolConfig,
    // 图表状态管理 - 改用多图表支持
    addChartConfig,
    chartConfigs,
    isChartModalOpen,
    setIsChartModalOpen,
    clearChartConfigs,
  } = useAppStore();

  // Navigation Action
  useCopilotAction({
    name: "navigateToPage",
    description: "Navigate to a specific page view in the application.",
    parameters: [
      { 
        name: "page", 
        type: "string", 
        description: "The target page view (dashboard, monitor, alert, patrol, broadcast)",
        required: true,
      }
    ],
    // 添加 render 来调试工具调用状态
    render: ({ status, args }) => {
      console.log(`[AI Action - navigateToPage] Render called! Status: ${status}, Args:`, args);
      // 当状态为 executing 时，直接执行导航
      if (status === 'executing' && args.page) {
        const page = args.page;
        const normalizedPage = page.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
        
        let targetView: PageView | null = null;
        if (normalizedPage.includes('dash') || normalizedPage.includes('main') || normalizedPage.includes('home') || normalizedPage.includes('综合') || normalizedPage.includes('大屏')) {
          targetView = 'dashboard';
        } else if (normalizedPage.includes('monitor') || normalizedPage.includes('camera') || normalizedPage.includes('cctv') || normalizedPage.includes('video') || normalizedPage.includes('监控')) {
          targetView = 'monitor';
        } else if (normalizedPage.includes('alert') || normalizedPage.includes('warn') || normalizedPage.includes('alarm') || normalizedPage.includes('预警') || normalizedPage.includes('报警')) {
          targetView = 'alert';
        } else if (normalizedPage.includes('patrol') || normalizedPage.includes('inspect') || normalizedPage.includes('guard') || normalizedPage.includes('巡查') || normalizedPage.includes('巡逻')) {
          targetView = 'patrol';
        } else if (normalizedPage.includes('broad') || normalizedPage.includes('cast') || normalizedPage.includes('speak') || normalizedPage.includes('广播') || normalizedPage.includes('喊话')) {
          targetView = 'broadcast';
        }
        
        if (targetView) {
          console.log(`[AI Action - navigateToPage] Executing navigation to: ${targetView}`);
          setCurrentView(targetView);
        }
      }
      return null; // 不渲染任何 UI
    },
    handler: async ({ page }) => {
      console.log(`[AI Action - navigateToPage] Handler called with page: ${page}`);
      // Validate input
      if (!page || typeof page !== 'string') {
        console.error('[AI Action] Invalid page parameter:', page);
        return 'Error: Invalid page parameter.';
      }
      
      // Normalize input: lowercase and remove extra spaces/hyphens
      const normalizedPage = page.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
      
      let targetView: PageView | null = null;

      // Fuzzy matching logic
      if (normalizedPage.includes('dash') || normalizedPage.includes('main') || normalizedPage.includes('home') || normalizedPage.includes('综合') || normalizedPage.includes('大屏')) {
        targetView = 'dashboard';
      } else if (normalizedPage.includes('monitor') || normalizedPage.includes('camera') || normalizedPage.includes('cctv') || normalizedPage.includes('video') || normalizedPage.includes('监控')) {
        targetView = 'monitor';
      } else if (normalizedPage.includes('alert') || normalizedPage.includes('warn') || normalizedPage.includes('alarm') || normalizedPage.includes('预警') || normalizedPage.includes('报警')) {
        targetView = 'alert';
      } else if (normalizedPage.includes('patrol') || normalizedPage.includes('inspect') || normalizedPage.includes('guard') || normalizedPage.includes('巡查') || normalizedPage.includes('巡逻')) {
        targetView = 'patrol';
      } else if (normalizedPage.includes('broad') || normalizedPage.includes('cast') || normalizedPage.includes('speak') || normalizedPage.includes('广播') || normalizedPage.includes('喊话')) {
        targetView = 'broadcast';
      }

      if (targetView) {
        console.log(`[AI Action] Navigating to: ${targetView} (from input: ${page})`);
        setCurrentView(targetView);
        return `Successfully navigated to ${targetView} view.`;
      } else {
        console.warn(`[AI Action] Unknown page requested: ${page}`);
        return `Could not navigate. Unknown page "${page}". Available pages: Dashboard, Monitor, Alert, Patrol, Broadcast.`;
      }
    },
  });

  // Dashboard Mode Action
  useCopilotAction({
    name: "setDashboardMode",
    description: "Change the center panel mode on the dashboard.",
    parameters: [
      {
        name: "mode",
        type: "string",
        description: "The mode to set (video-grid, map, ai-chat)",
        required: true
      }
    ],
    handler: async ({ mode }) => {
      // Validate input
      if (!mode || typeof mode !== 'string') {
        console.error('[AI Action] Invalid mode parameter:', mode);
        return 'Error: Invalid mode parameter.';
      }
      
      setCurrentView('dashboard'); // Ensure we are on dashboard
      
      const normalizedMode = mode.toLowerCase();
      let targetMode: CenterMode | null = null;

      if (normalizedMode.includes('video') || normalizedMode.includes('grid') || normalizedMode.includes('monitor') || normalizedMode.includes('监控')) {
        targetMode = 'video-grid';
      } else if (normalizedMode.includes('map') || normalizedMode.includes('geo') || normalizedMode.includes('地图')) {
        targetMode = 'map';
      } else if (normalizedMode.includes('ai') || normalizedMode.includes('chat') || normalizedMode.includes('bot') || normalizedMode.includes('助手')) {
        targetMode = 'ai-chat';
      }

      if (targetMode) {
        setCenterMode(targetMode);
        return `Dashboard center mode set to ${targetMode}.`;
      }
       return `Unknown mode ${mode}. Available modes: Video Grid, Map, AI Chat.`;
    },
  });

  // Emergency Action
  useCopilotAction({
    name: "setEmergencyMode",
    description: "Trigger or dismiss the emergency alert mode.",
    parameters: [
      {
        name: "active",
        type: "boolean",
        description: "True to activate emergency mode, false to dismiss",
        required: true
      }
    ],
    handler: async ({ active }) => {
      setEmergency(active);
      return `Emergency mode ${active ? 'activated' : 'deactivated'}.`;
    },
  });

  // Navigation Sidebar Action
  useCopilotAction({
    name: "toggleSidebar",
    description: "Open or close the navigation sidebar.",
    handler: async () => {
      toggleNav();
      return "Toggled navigation sidebar.";
    },
  });

  // Patrol Configuration Action
  useCopilotAction({
    name: "configurePatrol",
    description: "Configure the automated camera patrol system.",
    parameters: [
      {
        name: "active",
        type: "boolean",
        description: "Start or stop patrolling",
      },
      {
        name: "interval",
        type: "number",
        description: "Time interval between camera switches in minutes",
      }
    ],
    handler: async ({ active, interval }) => {
      setPatrolConfig({
        ...(active !== undefined && { isPatrolling: active }),
        ...(interval !== undefined && { interval }),
      });
      return `Patrol configuration updated. Active: ${active}, Interval: ${interval}`;
    },
  });

  // Generate Chart Action
  useCopilotAction({
    name: "generateChart",
    description: "【重要工具】生成数据可视化图表。当用户要求查看数据、统计、趋势、分布、对比时，必须调用此工具生成图表，而不是只回复文字说明。支持折线图、柱状图、饼图等多种图表类型。",
    parameters: [
      {
        name: "dataSource",
        type: "string",
        description: "数据源API端点。可选值：/api/stats/cameras（摄像头统计）、/api/stats/alerts（告警统计）、/api/stats/patrol（巡逻统计）、/api/stats/system（系统性能）",
        required: true,
      },
      {
        name: "chartType",
        type: "string",
        description: "图表类型。line=折线图（趋势分析）、bar=柱状图（数量对比）、pie=饼图（占比分布）、scatter=散点图（相关性分析）、radar=雷达图（多维评估）",
        required: true,
      },
      {
        name: "title",
        type: "string",
        description: "图表标题（中文）",
        required: true,
      },
      {
        name: "description",
        type: "string",
        description: "图表描述说明（可选）",
      },
      {
        name: "timeRange",
        type: "string",
        description: "时间范围。1d=最近1天/24小时，7d=最近7天/一周（默认），30d=最近30天/一月，90d=最近90天/三月",
      },
      {
        name: "dataMapping",
        type: "object",
        description: "数据映射配置（可选，系统会自动检测）。用于指定如何从API数据中提取图表所需字段。示例：折线图/柱状图使用 {xAxis: 'trend.categories', series: 'trend.series'}，饼图使用 {data: 'levelDistribution'} 或 {data: 'typeDistribution'}。如果不提供，系统会自动检测数据字段。",
      }
    ],
    handler: async ({ dataSource, chartType, title, description, timeRange, dataMapping }) => {
      console.log('[AI Action - generateChart] ===== HANDLER CALLED =====');
      console.log('[AI Action - generateChart] Parameters:', { dataSource, chartType, title, description, timeRange, dataMapping });
      
      try {
        // Build API URL with time range parameter
        const apiUrl = timeRange ? `${dataSource}?timeRange=${timeRange}` : dataSource;
        console.log(`[AI Action - generateChart] Fetching data from: ${apiUrl}`);
        const response = await fetch(apiUrl);
        
        console.log(`[AI Action - generateChart] Response status: ${response.status}`);
        console.log(`[AI Action - generateChart] Response ok: ${response.ok}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[AI Action - generateChart] API Error: ${response.status} - ${errorText}`);
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        
        console.log(`[AI Action - generateChart] Parsing JSON response...`);
        const result = await response.json();
        console.log(`[AI Action - generateChart] Parsed result:`, result);
        
        const apiData = result.data as Record<string, unknown>;
        console.log('[AI Action - generateChart] Extracted data:', apiData);
        console.log('[AI Action - generateChart] Available fields:', Object.keys(apiData));
        
        // Build chart configuration based on dataMapping
        let chartData: Record<string, unknown> = {};
        let mappingSuccessful = false;
        
        if (dataMapping && typeof dataMapping === 'object') {
          console.log('[AI Action - generateChart] Attempting AI data mapping:', dataMapping);
          // Use AI's mapping instructions
          Object.keys(dataMapping).forEach(key => {
            const path = (dataMapping as Record<string, string>)[key];
            if (typeof path === 'string') {
              // Simple path like "trend.categories"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const value = path.split('.').reduce((obj: any, prop: string) => obj?.[prop], apiData);
              if (value !== undefined) {
                chartData[key] = value;
                mappingSuccessful = true;
                console.log(`[AI Action - generateChart] ✅ Mapped ${key} from ${path}:`, value);
              } else {
                console.warn(`[AI Action - generateChart] ❌ Failed to map ${key} from ${path}`);
              }
            }
          });
        }
        
        // 如果AI映射失败或没有提供映射，使用自动检测
        if (!mappingSuccessful || Object.keys(chartData).length === 0) {
          console.log('[AI Action - generateChart] 🔄 AI mapping failed or not provided, using auto-detection...');
          console.log('[AI Action - generateChart] Chart type:', chartType);
          console.log('[AI Action - generateChart] Available data fields:', Object.keys(apiData));
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = apiData as any;
          
          // Auto-detect data structure based on chartType
          if (chartType === 'pie') {
            // 尝试多个可能的字段名
            const pieData = 
              data.levelDistribution || 
              data.distribution || 
              data.typeDistribution || 
              data.data || 
              data.values;
            
            chartData.data = pieData || [];
            console.log('[AI Action - generateChart] 📊 Auto-detected pie chart data field:', 
              pieData === data.levelDistribution ? 'levelDistribution' :
              pieData === data.distribution ? 'distribution' :
              pieData === data.typeDistribution ? 'typeDistribution' : 
              pieData === data.data ? 'data' : 'values'
            );
            console.log('[AI Action - generateChart] 📊 Pie data:', chartData.data);
          } else if (chartType === 'line' || chartType === 'bar') {
            chartData.xAxis = data.trend?.categories || data.categories || [];
            chartData.series = data.trend?.series || data.series || data.trend?.data || [];
            console.log('[AI Action - generateChart] 📈 Auto-detected line/bar chart data:', { 
              xAxis: chartData.xAxis, 
              series: chartData.series,
              xAxisLength: (chartData.xAxis as unknown[])?.length,
              seriesLength: (chartData.series as unknown[])?.length
            });
          } else {
            // 对于其他类型，直接使用原始数据
            chartData = apiData;
            console.log('[AI Action - generateChart] 📦 Using raw API data for chart type:', chartType);
          }
        } else {
          console.log('[AI Action - generateChart] ✅ AI mapping successful, using mapped data:', chartData);
        }
        
        // Set chart configuration to trigger modal
        const config = {
          id: `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'chart' as const,
          chartType: chartType as 'line' | 'bar' | 'pie' | 'scatter' | 'radar',
          title,
          description,
          data: chartData,
          timestamp: Date.now(),
        };
        
        console.log('[AI Action - generateChart] Final config:', config);
        console.log('[AI Action - generateChart] Adding chart to panel...');
        
        addChartConfig(config);
        console.log('[AI Action - generateChart] Chart added to panel');
        
        console.log('[AI Action - generateChart] ===== HANDLER COMPLETED =====');
        console.log('[AI Action - generateChart] Returning to CopilotKit...');
        
        return `已添加"${title}"图表到数据分析面板`;
      } catch (error) {
        console.error('[AI Action - generateChart] ===== HANDLER ERROR =====');
        console.error('[AI Action - generateChart] Error details:', error);
        return `生成图表失败：${(error as Error).message}`;
      }
    },
  });

  // Generate Insight/Summary Action
  useCopilotAction({
    name: "generateInsight",
    description: "【重要工具】生成文字分析总结、结论和建议。当用户要求数据分析、总结、结论、建议时，必须调用此工具。通常与generateChart配合使用，实现完整的图表加分析展示。",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "分析总结的标题（中文），如'告警态势分析'、'数据分析报告'",
        required: true,
      },
      {
        name: "content",
        type: "string",
        description: "分析内容（Markdown格式）。应包含数据摘要、趋势分析、建议措施、风险评估等部分。可使用#标题、**加粗**、列表等Markdown语法。",
        required: true,
      },
      {
        name: "contentType",
        type: "string",
        description: "内容类型：markdown（推荐，支持格式化）、text（纯文本）、html（HTML格式）",
      },
      {
        name: "layout",
        type: "string",
        description: "布局方式：half（占半行，与图表并排显示，推荐）、full（占满一行）",
      }
    ],
    handler: async ({ title, content, contentType = 'markdown', layout = 'half' }) => {
      console.log('[AI Action - generateInsight] ===== HANDLER CALLED =====');
      console.log('[AI Action - generateInsight] Parameters:', { title, contentType, layout, contentLength: content.length });
      
      try {
        const config = {
          id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: contentType as 'text' | 'markdown' | 'html',
          title,
          content,
          data: {},
          timestamp: Date.now(),
          layout: layout as 'full' | 'half',
        };
        
        console.log('[AI Action - generateInsight] Adding insight to panel...');
        addChartConfig(config);
        console.log('[AI Action - generateInsight] Insight added to panel');
        
        return `已添加"${title}"分析总结到数据分析面板`;
      } catch (error) {
        console.error('[AI Action - generateInsight] Error:', error);
        return `生成分析总结失败：${(error as Error).message}`;
      }
    },
  });
  
  return {
    chartConfigs,
    isChartModalOpen,
    setIsChartModalOpen,
    clearChartConfigs,
  };
};

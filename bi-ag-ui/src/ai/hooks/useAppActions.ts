import { useCopilotAction } from "@copilotkit/react-core";
import { useAppStore } from "../../store";
import type { PageView, CenterMode } from "../../store";

export const useAppActions = () => {
  const { 
    setCurrentView, 
    setCenterMode, 
    setEmergency, 
    toggleNav, 
    setPatrolConfig,
    // 图表状态管理
    chartConfig,
    isChartModalOpen,
    setChartConfig,
    setIsChartModalOpen,
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
        // Remove strict enum from schema to allow model to guess, we'll handle validation in handler
      }
    ],
    handler: async ({ page }) => {
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
    description: "Generate data visualization charts based on statistics data. Use this when user requests data analysis, trends, or statistics. Supports different time ranges and chart types.",
    parameters: [
      {
        name: "dataSource",
        type: "string",
        description: "API endpoint to fetch data from: /api/stats/cameras, /api/stats/alerts, /api/stats/patrol, /api/stats/system",
        required: true,
      },
      {
        name: "chartType",
        type: "string",
        description: "Type of chart: line (趋势分析), bar (对比分析), pie (占比分布), scatter (散点分析), radar (多维评估)",
        required: true,
      },
      {
        name: "title",
        type: "string",
        description: "Chart title in Chinese",
        required: true,
      },
      {
        name: "description",
        type: "string",
        description: "Brief description of the chart",
      },
      {
        name: "timeRange",
        type: "string",
        description: "Time range for data: 1d (1天/24小时), 7d (7天/一周), 30d (30天/一月), 90d (90天/三月). Default: 7d",
      },
      {
        name: "dataMapping",
        type: "object",
        description: "How to map API data to chart config. Examples: {xAxis: 'trend.categories', series: 'trend.series'} for line/bar, {data: 'levelDistribution'} for pie",
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
            const path = dataMapping[key];
            if (typeof path === 'string') {
              // Simple path like "trend.categories"
              const value = path.split('.').reduce((obj: Record<string, unknown>, prop: string) => obj?.[prop] as Record<string, unknown>, apiData as Record<string, unknown>);
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
          
          // Auto-detect data structure based on chartType
          if (chartType === 'pie') {
            // 尝试多个可能的字段名
            const pieData = 
              apiData.levelDistribution || 
              apiData.distribution || 
              apiData.typeDistribution || 
              apiData.data || 
              apiData.values;
            
            chartData.data = pieData || [];
            console.log('[AI Action - generateChart] 📊 Auto-detected pie chart data field:', 
              pieData === apiData.levelDistribution ? 'levelDistribution' :
              pieData === apiData.distribution ? 'distribution' :
              pieData === apiData.typeDistribution ? 'typeDistribution' : 
              pieData === apiData.data ? 'data' : 'values'
            );
            console.log('[AI Action - generateChart] 📊 Pie data:', chartData.data);
          } else if (chartType === 'line' || chartType === 'bar') {
            chartData.xAxis = apiData.trend?.categories || apiData.categories || [];
            chartData.series = apiData.trend?.series || apiData.series || apiData.trend?.data || [];
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
          type: 'chart' as const,
          chartType: chartType as 'line' | 'bar' | 'pie' | 'scatter' | 'radar',
          title,
          description,
          data: chartData,
        };
        
        console.log('[AI Action - generateChart] Final config:', config);
        console.log('[AI Action - generateChart] Setting chart config and opening modal...');
        
        setChartConfig(config);
        console.log('[AI Action - generateChart] chartConfig state updated');
        
        setIsChartModalOpen(true);
        console.log('[AI Action - generateChart] isChartModalOpen state updated to true');
        
        console.log('[AI Action - generateChart] ===== HANDLER COMPLETED =====');
        console.log('[AI Action - generateChart] Returning to CopilotKit...');
        
        return `已生成"${title}"图表，正在显示...`;
      } catch (error) {
        console.error('[AI Action - generateChart] ===== HANDLER ERROR =====');
        console.error('[AI Action - generateChart] Error details:', error);
        return `生成图表失败：${(error as Error).message}`;
      }
    },
  });
  
  return {
    chartConfig,
    isChartModalOpen,
    setIsChartModalOpen,
  };
};

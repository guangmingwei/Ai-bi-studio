import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CenterMode = 'video-grid' | 'ai-chat' | 'map';
export type NavPosition = 'left' | 'top';
export type PageView = 'dashboard' | 'monitor' | 'alert' | 'patrol' | 'broadcast';

export interface AlertNotification {
  id: string;
  title: string;
  image: string;
  source: string;
  time: string;
  level: 'high' | 'medium' | 'low';
}

// 轮巡配置接口
export interface PatrolConfig {
  isPatrolling: boolean;
  interval: number; // 分钟
  selectedCameras: string[];
  gridSize: 4 | 9;
}

// 图表配置接口
export interface ChartConfig {
  id: string; // 唯一标识
  type: 'chart' | 'table' | 'custom' | 'text' | 'markdown' | 'html';
  chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'radar';
  title?: string;
  description?: string;
  data: Record<string, unknown>;
  options?: Record<string, unknown>;
  content?: string; // 用于text/markdown/html类型
  timestamp: number; // 创建时间
  layout?: 'full' | 'half'; // 布局：full=占满整行，half=占半行
}

interface AppState {
  // 页面导航状态
  currentView: PageView;
  setCurrentView: (view: PageView) => void;

  // 侧边栏状态
  isNavOpen: boolean;
  navPosition: NavPosition;
  toggleNav: () => void;
  setNavPosition: (pos: NavPosition) => void;

  // 中间区域模式 (仅用于 Dashboard)
  centerMode: CenterMode;
  setCenterMode: (mode: CenterMode) => void;

  // 全局快捷键监听状态
  isCmdKPressed: boolean;

  // 紧急模式
  isEmergency: boolean;
  setEmergency: (active: boolean) => void;

  // 全局预警通知
  alertNotification: AlertNotification | null;
  setAlertNotification: (alert: AlertNotification | null) => void;

  // 监控轮巡配置
  patrolConfig: PatrolConfig;
  setPatrolConfig: (config: Partial<PatrolConfig>) => void;
  
  // 图表模态框状态
  chartConfigs: ChartConfig[]; // 改为数组，支持多个图表
  isChartModalOpen: boolean;
  addChartConfig: (config: ChartConfig) => void; // 添加图表
  removeChartConfig: (id: string) => void; // 移除图表
  clearChartConfigs: () => void; // 清空所有图表
  setIsChartModalOpen: (isOpen: boolean) => void;
  
  // 引导层状态
  hasSeenGuide: boolean;
  setHasSeenGuide: (hasSeen: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentView: 'dashboard', // 默认为综合大屏
      setCurrentView: (view) => set({ currentView: view }),

      isNavOpen: false,
      navPosition: 'left', 
      toggleNav: () => set((state) => ({ isNavOpen: !state.isNavOpen })),
      setNavPosition: (pos) => set({ navPosition: pos }),

      centerMode: 'video-grid',
      setCenterMode: (mode) => set({ centerMode: mode }),

      isCmdKPressed: false,

      isEmergency: false,
      setEmergency: (active) => set({ isEmergency: active }),

      alertNotification: null,
      setAlertNotification: (alert) => set({ alertNotification: alert }),

      // 默认轮巡配置
      patrolConfig: {
        isPatrolling: false,
        interval: 5,
        selectedCameras: [],
        gridSize: 4,
      },
      setPatrolConfig: (config) => set((state) => ({
        patrolConfig: { ...state.patrolConfig, ...config }
      })),
      
      // 图表模态框状态
      chartConfigs: [],
      isChartModalOpen: false,
      addChartConfig: (config) => {
        console.log('[Store] Adding chart config:', config);
        set((state) => ({
          chartConfigs: [...state.chartConfigs, config],
          isChartModalOpen: true, // 自动打开面板
        }));
      },
      removeChartConfig: (id) => {
        console.log('[Store] Removing chart config:', id);
        set((state) => ({
          chartConfigs: state.chartConfigs.filter(c => c.id !== id),
        }));
      },
      clearChartConfigs: () => {
        console.log('[Store] Clearing all chart configs');
        set({ chartConfigs: [] });
      },
      setIsChartModalOpen: (isOpen) => {
        console.log('[Store] Setting isChartModalOpen:', isOpen);
        set({ isChartModalOpen: isOpen });
      },
      
      hasSeenGuide: false,
      setHasSeenGuide: (hasSeen) => set({ hasSeenGuide: hasSeen }),
    }),
    {
      name: 'bi-agent-storage', // 本地存储的 key
      // 选择需要持久化的字段
      partialize: (state) => ({
        currentView: state.currentView,
        isNavOpen: state.isNavOpen,
        navPosition: state.navPosition,
        centerMode: state.centerMode,
        patrolConfig: state.patrolConfig,
        hasSeenGuide: state.hasSeenGuide,
        // chartConfig 不持久化,每次刷新都清空
      }),
    }
  ) as any // Zustand persist 类型兼容性
);

import { useCopilotAction } from "@copilotkit/react-core";
import { useAppStore } from "../../store";
import type { PageView, CenterMode } from "../../store";

export const useAppActions = () => {
  const { 
    setCurrentView, 
    setCenterMode, 
    setEmergency, 
    toggleNav, 
    setPatrolConfig 
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
};

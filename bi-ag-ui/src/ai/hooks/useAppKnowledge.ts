import { useCopilotReadable } from "@copilotkit/react-core";
import { useAppStore } from "../../store";

export const useAppKnowledge = () => {
  const state = useAppStore();

  useCopilotReadable({
    description: "Current global state of the BI dashboard, including active view, emergency status, alert notifications, and patrol configuration.",
    value: {
      currentView: state.currentView,
      centerMode: state.centerMode,
      isEmergency: state.isEmergency,
      activeAlert: state.alertNotification,
      patrolConfig: {
        isPatrolling: state.patrolConfig.isPatrolling,
        selectedCameras: state.patrolConfig.selectedCameras,
      },
      navigation: {
        isOpen: state.isNavOpen,
        position: state.navPosition
      }
    },
  });
};


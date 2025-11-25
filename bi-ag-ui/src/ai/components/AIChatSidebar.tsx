import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css"; 

export const AIChatSidebar = () => {
  return (
    <CopilotSidebar
      defaultOpen={false}
      instructions="You are an intelligent assistant for a BI Dashboard. You can navigate pages, control dashboard modes, handle emergency alerts, and configure patrol settings."
      labels={{
        title: "AI Assistant",
        initial: "Hi! I'm your dashboard copilot. How can I help you monitor the facility today?",
      }}
      clickOutsideToClose={true}
    />
  );
};

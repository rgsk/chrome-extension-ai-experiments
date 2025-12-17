import { withErrorBoundary, withSuspense } from "@extension/shared";
import { ErrorDisplay, LoadingSpinner } from "@extension/ui";
import "@src/SidePanel.css";
import { useMemo } from "react";
import { v4 } from "uuid";

const SidePanel = () => {
  const chatId = useMemo(() => v4(), []);

  return (
    <div className="h-screen">
      <iframe
        title="React AI Experiments"
        src={`http://localhost:5173/chat/${chatId}`}
        className="w-full h-full"
      ></iframe>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(SidePanel, <LoadingSpinner />),
  ErrorDisplay,
);

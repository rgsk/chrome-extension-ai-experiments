import { withErrorBoundary, withSuspense } from "@extension/shared";
import { ErrorDisplay, LoadingSpinner } from "@extension/ui";
import "@src/SidePanel.css";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { v4 } from "uuid";

const SidePanel = () => {
  const chatId = useMemo(() => v4(), []);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sendMessageToIframe = useCallback((body: unknown) => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          type: "message-to-iframe-from-extension",
          response: body,
        },
        "http://localhost:5173", // 🔒 exact iframe origin
      );
    }
  }, []);

  const onMessageFromIframe = useCallback((body: unknown) => {
    console.log({ onMessageFromIframe: "onMessageFromIframe", body });
  }, []);

  useEffect(() => {
    window.addEventListener("message", (event) => {
      // 🔒 SECURITY CHECK
      if (event.origin !== "http://localhost:5173") return;

      if (event.data?.type === "message-from-iframe-to-extension") {
        const payload = event.data.payload;
        onMessageFromIframe(payload);
      }
    });
  }, [onMessageFromIframe]);

  return (
    <div className="h-screen">
      <button
        onClick={() => {
          sendMessageToIframe({ chatId });
        }}
      >
        send
      </button>
      <iframe
        ref={iframeRef}
        title="React AI Experiments"
        src={`http://localhost:5173/practice`}
        className="w-full h-full"
      ></iframe>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(SidePanel, <LoadingSpinner />),
  ErrorDisplay,
);

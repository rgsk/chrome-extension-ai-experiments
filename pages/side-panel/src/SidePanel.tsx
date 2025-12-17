import type { MessageFromServiceWorkerToSidepanel } from "@extension/shared";
import { withErrorBoundary, withSuspense } from "@extension/shared";
import { ErrorDisplay, LoadingSpinner } from "@extension/ui";
import type {
  MessageFromExtensionToIframePayload,
  MessageFromIframeToExtensionPayload,
} from "@src/payloadTypes";
import "@src/SidePanel.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 } from "uuid";

const iframeOrigin = "http://localhost:5173";

const SidePanel = () => {
  const chatId = useMemo(() => v4(), []);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeState, setIframeState] = useState<{
    connectionActive: boolean;
  }>({ connectionActive: false });
  const sendMessageToIframe = useCallback(
    (payload: MessageFromExtensionToIframePayload) => {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: "message-to-iframe-from-extension",
            payload: payload,
          },
          iframeOrigin, // 🔒 exact iframe origin
        );
      }
    },
    [],
  );

  const onMessageFromIframe = useCallback(
    (payload: MessageFromIframeToExtensionPayload) => {
      switch (payload.type) {
        case "PING": {
          const { message } = payload.body;
          setIframeState((prev) => ({ ...prev, connectionActive: true }));
          sendMessageToIframe({
            type: "PONG",
            body: {
              messageResponseByExtension: "pong",
              messageReceivedByExtension: message,
            },
          });
          break;
        }
      }
    },
    [sendMessageToIframe],
  );

  useEffect(() => {
    window.addEventListener("message", (event) => {
      // 🔒 SECURITY CHECK
      if (event.origin !== iframeOrigin) return;

      if (event.data?.type === "message-from-iframe-to-extension") {
        const payload = event.data.payload;
        onMessageFromIframe(payload);
      }
    });
  }, [onMessageFromIframe]);

  const onMessageFromServiceWorker = useCallback(
    (payload: MessageFromServiceWorkerToSidepanel) => {
      switch (payload.type) {
        case "TAB_ACTIVATED": {
          const { tab } = payload.body as { tab: chrome.tabs.Tab };
          if (tab.url) {
            sendMessageToIframe({
              type: "TAB_URL_CHANGED",
              body: {
                tabDetails: { url: tab.url, favIconUrl: tab.favIconUrl },
              },
            });
          }
          break;
        }
        case "TAB_UPDATED": {
          const { tab } = payload.body as { tab: chrome.tabs.Tab };
          if (tab.url) {
            sendMessageToIframe({
              type: "TAB_URL_CHANGED",
              body: {
                tabDetails: { url: tab.url, favIconUrl: tab.favIconUrl },
              },
            });
          }
          break;
        }
      }
    },
    [sendMessageToIframe],
  );

  useEffect(() => {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "message-from-service_worker-to-side_panel") {
        const payload = message.payload;
        onMessageFromServiceWorker(payload);
      }
    });
  }, [onMessageFromServiceWorker]);

  useEffect(() => {
    if (iframeState.connectionActive) {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.url) {
          sendMessageToIframe({
            type: "TAB_URL_CHANGED",
            body: {
              tabDetails: { url: tab.url, favIconUrl: tab.favIconUrl },
            },
          });
        }
      });
    }
  }, [iframeState.connectionActive, sendMessageToIframe]);
  return (
    <div className="h-screen">
      <iframe
        ref={iframeRef}
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

import { withErrorBoundary, withSuspense } from "@extension/shared";
import { ErrorDisplay, LoadingSpinner } from "@extension/ui";
import useCopyToClipboard from "@src/hooks/useCopyToClipboard";
import type {
  MessageFromExtensionToIframePayload,
  MessageFromIframeToExtensionPayload,
  TabDetails,
} from "@src/payloadTypes";
import "@src/SidePanel.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 } from "uuid";
import { REACT_EXPERIMENTS_URL } from "../../../packages/env/lib";

const iframeOrigin = REACT_EXPERIMENTS_URL;

const getInnerTextForTab = async (tabId: number) => {
  const result = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => document.body.innerText,
  });
  const innerText = result[0]?.result ?? "";
  return innerText;
};
const getTabScreenshotDataUrl = () => {
  return new Promise<string>((resolve) => {
    // @ts-ignore
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      // dataUrl is a base64 image
      resolve(dataUrl);
    });
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function captureFullPage(tabId: number) {
  const dims = await chrome.tabs.sendMessage(tabId, {
    type: "PAGE_DIMENSIONS",
  });

  const screenshots: string[] = [];
  let y = 0;

  while (y < dims.height) {
    await chrome.tabs.sendMessage(tabId, { type: "SCROLL_TO", y });
    // wait for layout + lazy content
    await sleep(1);
    // @ts-ignore
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "png",
    });
    // @ts-ignore
    screenshots.push(dataUrl);
    y += dims.viewportHeight;
  }

  return { screenshots, pageWidth: dims.width, pageHeight: dims.height };
}

const getTabDetails = (tab: chrome.tabs.Tab) => {
  if (tab.url && tab.id) {
    const tabDetails: TabDetails = {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl,
    };
    return tabDetails;
  }
  return null;
};

const SidePanel = () => {
  const chatId = useMemo(() => v4(), []);
  const { copy } = useCopyToClipboard();
  const copyRef = useRef(copy);
  copyRef.current = copy;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeState, setIframeState] = useState<{
    connectionActive: boolean;
  }>({ connectionActive: false });
  const sendMessageToIframe = useCallback(
    (
      payload: MessageFromExtensionToIframePayload,
      requestResponseId?: string,
    ) => {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: "message-to-iframe-from-extension",
            requestResponseId,
            payload: payload,
          },
          iframeOrigin ?? "*", // 🔒 exact iframe origin
        );
      }
    },
    [],
  );

  const onMessageFromIframe = useCallback(
    async (
      payload: MessageFromIframeToExtensionPayload,
      requestResponseId?: string,
    ) => {
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
        case "GET_TAB_INNER_TEXT": {
          const { tabId } = payload.body;
          const innerText = await getInnerTextForTab(tabId);
          sendMessageToIframe(
            {
              type: "GET_TAB_INNER_TEXT",
              body: {
                innerText,
              },
            },
            requestResponseId,
          );
          break;
        }
        case "GET_TAB_SCREENSHOT_DATA_URL": {
          const dataUrl = await getTabScreenshotDataUrl();
          sendMessageToIframe(
            {
              type: "GET_TAB_SCREENSHOT_DATA_URL",
              body: {
                dataUrl,
              },
            },
            requestResponseId,
          );
          break;
        }
        case "COPY_TO_CLIPBOARD": {
          const { text } = payload.body;
          copyRef.current(text);
          break;
        }
        case "GET_FULL_PAGE_SCREENSHOTS": {
          chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            if (tab?.id) {
              captureFullPage(tab.id).then(
                ({ screenshots, pageWidth, pageHeight }) => {
                  sendMessageToIframe(
                    {
                      type: "GET_FULL_PAGE_SCREENSHOTS",
                      body: {
                        screenshots,
                        pageWidth,
                        pageHeight,
                      },
                    },
                    requestResponseId,
                  );
                },
              );
            }
          });
          break;
        }
      }
    },
    [sendMessageToIframe],
  );

  useEffect(() => {
    const handler = (event: MessageEvent<any>) => {
      // 🔒 SECURITY CHECK
      if (event.origin !== iframeOrigin) return;

      if (event.data?.type === "message-from-iframe-to-extension") {
        const payload = event.data.payload;
        const requestResponseId = event.data.requestResponseId;
        onMessageFromIframe(payload, requestResponseId);
      }
    };
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
    };
  }, [onMessageFromIframe]);

  useEffect(() => {
    if (!iframeState.connectionActive) return;
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      if (tab) {
        const tabDetails = getTabDetails(tab);
        if (tabDetails) {
          sendMessageToIframe({
            type: "TAB_URL_CHANGED",
            body: {
              tabDetails,
            },
          });
        }
      }
    });
    const handleTabActivated: (
      activeInfo: chrome.tabs.TabActiveInfo,
    ) => void = async (activeInfo) => {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      const tabDetails = getTabDetails(tab);
      if (tabDetails) {
        sendMessageToIframe({
          type: "TAB_URL_CHANGED",
          body: {
            tabDetails,
          },
        });
      }
    };
    const handleTabUpdated: (
      tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab,
    ) => void = (tabId, changeInfo, tab) => {
      const tabDetails = getTabDetails(tab);
      if (tabDetails) {
        sendMessageToIframe({
          type: "TAB_URL_CHANGED",
          body: {
            tabDetails,
          },
        });
      }
    };

    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, [iframeState.connectionActive, sendMessageToIframe]);

  return (
    <div className="h-screen">
      <iframe
        ref={iframeRef}
        title="React AI Experiments"
        src={`${REACT_EXPERIMENTS_URL}/chat/${chatId}`}
        className="w-full h-full"
      ></iframe>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(SidePanel, <LoadingSpinner />),
  ErrorDisplay,
);

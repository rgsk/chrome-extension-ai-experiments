import { t } from "@extension/i18n";
import { ToggleButton } from "@extension/ui";
import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    console.log("[CEB] Content ui all loaded");
    chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
      if (msg.type === "PAGE_DIMENSIONS") {
        sendResponse({
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight,
        });
      }

      if (msg.type === "SCROLL_TO") {
        window.scrollTo(0, msg.y);
        setTimeout(sendResponse, 300);
        return true;
      }
    });
  }, []);
  return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded bg-blue-100 px-2 py-1">
      <div className="flex gap-1 text-sm text-blue-500">
        Edit{" "}
        <strong className="text-blue-700">
          pages/content-ui/src/matches/all/App.tsx
        </strong>{" "}
        and save to reload.
      </div>
      <ToggleButton className={"mt-0"}>{t("toggleTheme")}</ToggleButton>
    </div>
  );
}

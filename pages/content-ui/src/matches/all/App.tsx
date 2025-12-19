import { t } from "@extension/i18n";
import { useStorage } from "@extension/shared";
import { ToggleButton } from "@extension/ui";
import { useEffect } from "react";
import { sharedStorage } from "../../../../../packages/storage/lib";

export default function App() {
  const { gemini } = useStorage(sharedStorage);
  useEffect(() => {
    console.log("[CEB] Content ui all loaded");
  }, []);

  useEffect(() => {
    if (window.location.origin === "https://gemini.google.com") {
      const hideRecents = () => {
        const el = document.querySelector(
          "my-stuff-recents-preview",
        ) as HTMLElement;

        if (el) {
          if (gemini.hideMyStuffRecentsPreview) {
            el.style.display = "none";
          } else {
            el.style.display = "";
          }
        }
      };

      // run once in case it already exists
      hideRecents();

      // watch for future DOM changes
      const observer = new MutationObserver(() => {
        hideRecents();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      // ✅ cleanup
      return () => {
        observer.disconnect();
      };
    }
  }, [gemini.hideMyStuffRecentsPreview]);
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

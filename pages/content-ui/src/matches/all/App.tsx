import { t } from "@extension/i18n";
import { useStorage } from "@extension/shared";
import { ToggleButton } from "@extension/ui";
import { useEffect, useRef } from "react";
import { sharedStorage } from "../../../../../packages/storage/lib";

function getSymbol(filled: boolean) {
  return filled ? "★" : "☆";
}

function getProgressLabel(
  completedTasksCount: number,
  totalTasksCount: number,
) {
  return ` ${completedTasksCount}/${totalTasksCount}`;
}

function getSectionKey(heading: HTMLHeadingElement) {
  const existingSectionKey = heading.dataset.sectionKey;
  if (existingSectionKey) return existingSectionKey;

  const sectionKey = heading.textContent;
  if (sectionKey) {
    heading.dataset.sectionKey = sectionKey;
  }

  return sectionKey;
}

export default function App() {
  const { gemini, cses } = useStorage(sharedStorage);
  const lastAudioBlockedUrlRef = useRef("");
  useEffect(() => {
    console.log("[CEB] Content ui all loaded");
  }, []);

  useEffect(() => {
    if (window.location.origin !== "https://gemini.google.com") return;

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

    return () => {
      observer.disconnect();
    };
  }, [gemini.hideMyStuffRecentsPreview]);
  useEffect(() => {
    console.log(cses.bookmarks);
  }, [cses.bookmarks]);

  useEffect(() => {
    if (window.location.href !== "https://cses.fi/problemset/") {
      return;
    }
    const headings = document.querySelectorAll("h2");
    headings.forEach((heading) => {
      const sectionKey = getSectionKey(heading);

      // exclude first heading
      if (sectionKey !== "General") {
        const taskList = heading.nextSibling as HTMLUListElement;
        if (!taskList) return;
        if (!sectionKey) return;
        const tasks = taskList.querySelectorAll("li.task");
        const totalTasksCount = tasks.length;
        const completedTasksCount =
          Object.keys(cses.bookmarks?.[sectionKey] ?? {}).length || 0;
        const existingMeta = heading.querySelector(
          ".section-meta",
        ) as HTMLSpanElement | null;
        const existingProgress = heading.querySelector(
          ".section-progress-count",
        ) as HTMLSpanElement | null;
        const existingResetButton = heading.querySelector(
          ".section-reset-button",
        ) as HTMLButtonElement | null;

        heading.style.display = "flex";
        heading.style.alignItems = "center";

        if (existingProgress) {
          existingProgress.textContent = getProgressLabel(
            completedTasksCount,
            totalTasksCount,
          );
        } else {
          const meta = existingMeta ?? document.createElement("span");
          const progress = document.createElement("span");

          meta.className = "section-meta";
          meta.style.marginLeft = "auto";
          meta.style.display = "inline-flex";
          meta.style.alignItems = "center";
          meta.style.gap = "12px";

          progress.className = "section-progress-count";
          progress.textContent = getProgressLabel(
            completedTasksCount,
            totalTasksCount,
          );
          progress.style.fontSize = "20px";
          progress.style.fontWeight = "400";
          progress.style.color = "#666";

          meta.appendChild(progress);
          heading.appendChild(meta);
        }

        if (!existingResetButton) {
          const meta =
            existingMeta ??
            (heading.querySelector(".section-meta") as HTMLSpanElement | null);
          if (!meta) return;

          const resetButton = document.createElement("button");

          resetButton.type = "button";
          resetButton.className = "section-reset-button";
          resetButton.textContent = "🔁";
          resetButton.style.fontSize = "20px";
          resetButton.style.border = "none";
          resetButton.style.background = "none";
          resetButton.style.boxShadow = "none";
          resetButton.style.padding = "8px";
          resetButton.style.cursor = "pointer";

          resetButton.addEventListener("click", () => {
            const confirmReset = confirm(
              `Reset progress for section "${sectionKey}"?`,
            );
            if (!confirmReset) return;
            sharedStorage.set((prev) => {
              const prevCses = prev.cses ?? { bookmarks: {} };
              const prevBookmarks = { ...(prevCses.bookmarks ?? {}) };

              delete prevBookmarks[sectionKey];

              return {
                ...prev,
                cses: {
                  ...prevCses,
                  bookmarks: prevBookmarks,
                },
              };
            });
          });

          meta.appendChild(resetButton);
        }
        tasks.forEach((task) => {
          const problemLink = task.querySelector("a");
          const taskKey = problemLink?.textContent;
          if (!taskKey) return;

          const isChecked = Boolean(cses.bookmarks?.[sectionKey]?.[taskKey]);
          const existingCheckmark = task.querySelector(
            ".task-check-toggle",
          ) as HTMLButtonElement | null;

          if (existingCheckmark) {
            existingCheckmark.dataset.checked = String(isChecked);
            existingCheckmark.textContent = getSymbol(isChecked);
            return;
          }

          const checkmark = document.createElement("button");

          checkmark.type = "button";
          checkmark.className = "task-check-toggle";
          checkmark.dataset.checked = String(isChecked);
          checkmark.style.fontSize = "18px";
          checkmark.textContent = getSymbol(isChecked);
          checkmark.style.margin = "0px 8px";
          checkmark.style.border = "none";
          checkmark.style.background = "transparent";
          checkmark.style.padding = "0";
          checkmark.style.boxShadow = "none";
          checkmark.style.cursor = "pointer";

          checkmark.addEventListener("click", () => {
            const nextChecked = checkmark.dataset.checked !== "true";

            checkmark.dataset.checked = String(nextChecked);
            checkmark.textContent = getSymbol(nextChecked);

            sharedStorage.set((prev) => {
              const prevCses = prev.cses ?? { bookmarks: {} };
              const prevBookmarks = prevCses.bookmarks ?? {};
              const sectionBookmarks = { ...(prevBookmarks[sectionKey] ?? {}) };

              if (nextChecked) {
                sectionBookmarks[taskKey] = true;
              } else {
                delete sectionBookmarks[taskKey];
              }

              const nextBookmarks = { ...prevBookmarks };

              if (Object.keys(sectionBookmarks).length === 0) {
                delete nextBookmarks[sectionKey];
              } else {
                nextBookmarks[sectionKey] = sectionBookmarks;
              }

              return {
                ...prev,
                cses: {
                  ...prevCses,
                  bookmarks: nextBookmarks,
                },
              };
            });
          });

          task.appendChild(checkmark);
        });
      }
    });
  }, [cses.bookmarks]);

  useEffect(() => {
    if (window.location.origin !== "https://chatgpt.com") return;

    const onCspViolation = (e: SecurityPolicyViolationEvent) => {
      lastAudioBlockedUrlRef.current = e.blockedURI;
      console.log("⚠️ CSP VIOLATION DETECTED:", {
        blockedURI: e.blockedURI,
      });
    };

    document.addEventListener("securitypolicyviolation", onCspViolation);

    const attached = new WeakSet<Element>();
    let observer: MutationObserver | null = null;
    let rafId: number | null = null;

    const waitForBubble = () => {
      const host = document.querySelector("#gdx-bubble-host");
      if (!host) {
        // The extension injects this later — keep waiting
        rafId = requestAnimationFrame(waitForBubble);
        return;
      }

      // Shadow root is open, so we can read it directly
      const shadowRoot = host.shadowRoot;
      if (!shadowRoot) {
        rafId = requestAnimationFrame(waitForBubble);
        return;
      }

      const root = shadowRoot;

      function attachListener() {
        const icon = root.querySelector("#gdx-bubble-audio-icon");
        if (!icon) {
          // Bubble content is dynamic — watch for changes
          return;
        }

        // Avoid double-binding
        if (attached.has(icon)) return;
        attached.add(icon);

        icon.addEventListener("click", () => {
          console.log("Audio icon clicked!");
          console.log("Element:", icon);
          const blockedUrl = lastAudioBlockedUrlRef.current;
          if (!blockedUrl) {
            console.warn("No blocked audio URL captured yet.");
            return;
          }

          chrome.runtime.sendMessage({
            type: "play-audio-url",
            url: blockedUrl,
          });
        });

        console.log("Listener attached to #gdx-bubble-audio-icon");
      }

      // Observe shadow DOM updates
      observer = new MutationObserver(attachListener);
      observer.observe(root, { childList: true, subtree: true });

      // Try attaching right now too
      attachListener();
    };

    waitForBubble();

    return () => {
      document.removeEventListener("securitypolicyviolation", onCspViolation);
      if (observer) observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
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

import { useStorage } from "@extension/shared";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { sharedStorage } from "../../../../../packages/storage/lib";

type Task = {
  key: string;
  number: string;
  start: HTMLElement;
  end: HTMLElement;
};

type Section = {
  key: string;
  // null for "General", which isn't numbered and has no tasks of its own
  number: string | null;
  heading: HTMLHeadingElement;
  start: HTMLElement;
  end: HTMLElement;
  tasks: Task[];
};

const GENERAL_SECTION_KEY = "General";

function padNumber(n: number) {
  return String(n).padStart(2, "0");
}

// Returns an empty span at the start or end of `parent` for React to portal
// into. `display: contents` keeps it out of the layout, so whatever is rendered
// inside behaves like a direct child (e.g. a flex item of the heading).
function getContainer(parent: HTMLElement, position: "start" | "end") {
  const className = `ceb-${position}`;
  const existing = parent.querySelector<HTMLElement>(`:scope > .${className}`);
  if (existing) return existing;

  const container = document.createElement("span");
  container.className = className;
  container.style.display = "contents";
  if (position === "start") parent.prepend(container);
  else parent.append(container);
  return container;
}

function collectSections(): Section[] {
  const sections: Section[] = [];
  let sectionNumber = 0;

  document.querySelectorAll("h2").forEach((heading) => {
    // read the key before adding containers, since it comes from the heading
    // text; cached so a remount doesn't pick up our own labels
    const key = heading.dataset.sectionKey ?? heading.textContent;
    if (!key) return;
    heading.dataset.sectionKey = key;

    const isGeneral = key === GENERAL_SECTION_KEY;
    const taskList = heading.nextElementSibling;
    const taskItems = isGeneral
      ? []
      : Array.from(taskList?.querySelectorAll<HTMLElement>("li.task") ?? []);
    if (!isGeneral && taskItems.length === 0) return;

    const tasks: Task[] = [];
    taskItems.forEach((task) => {
      const taskKey = task.querySelector("a")?.textContent;
      if (!taskKey) return;
      tasks.push({
        key: taskKey,
        number: padNumber(tasks.length + 1),
        start: getContainer(task, "start"),
        end: getContainer(task, "end"),
      });
    });

    sections.push({
      key,
      number: isGeneral ? null : padNumber(++sectionNumber),
      heading,
      start: getContainer(heading, "start"),
      end: getContainer(heading, "end"),
      tasks,
    });
  });

  return sections;
}

const iconButtonStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  padding: 0,
  boxShadow: "none",
  cursor: "pointer",
};

function SectionMeta({
  completed,
  total,
  onReset,
}: {
  completed: number;
  total: number;
  onReset: () => void;
}) {
  return (
    <span
      style={{
        marginLeft: "auto",
        display: "inline-flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <span style={{ fontSize: "20px", fontWeight: 400, color: "#666" }}>
        {completed}/{total}
      </span>
      <button
        type="button"
        onClick={onReset}
        style={{
          ...iconButtonStyle,
          fontSize: "20px",
          padding: "8px",
          transform: "translateY(1px)",
        }}
      >
        🔁
      </button>
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      title="Copy"
      onClick={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          console.log("[CEB] copied task key", text);
        } catch (error) {
          console.warn("[CEB] failed to copy task key", text, error);
        }
      }}
      style={{
        ...iconButtonStyle,
        fontSize: "20px",
        margin: "0px 8px 0px 0px",
      }}
    >
      ⧉
    </button>
  );
}

function StarButton({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{ ...iconButtonStyle, fontSize: "18px", margin: "0px 8px" }}
    >
      {checked ? "★" : "☆"}
    </button>
  );
}

function toggleBookmark(sectionKey: string, taskKey: string) {
  sharedStorage.set((prev) => {
    const sectionBookmarks = { ...(prev.cses.bookmarks[sectionKey] ?? {}) };
    if (sectionBookmarks[taskKey]) {
      delete sectionBookmarks[taskKey];
    } else {
      sectionBookmarks[taskKey] = true;
    }

    const bookmarks = { ...prev.cses.bookmarks };
    if (Object.keys(sectionBookmarks).length === 0) {
      delete bookmarks[sectionKey];
    } else {
      bookmarks[sectionKey] = sectionBookmarks;
    }

    return { ...prev, cses: { ...prev.cses, bookmarks } };
  });
}

function resetSection(sectionKey: string) {
  const isGeneral = sectionKey === GENERAL_SECTION_KEY;
  const confirmReset = confirm(
    isGeneral
      ? "Reset all CSES progress?"
      : `Reset progress for section "${sectionKey}"?`,
  );
  if (!confirmReset) return;

  sharedStorage.set((prev) => {
    const bookmarks = isGeneral ? {} : { ...prev.cses.bookmarks };
    delete bookmarks[sectionKey];
    return { ...prev, cses: { ...prev.cses, bookmarks } };
  });
}

export function isCsesProblemsetPage() {
  return /^https:\/\/cses\.fi\/problemset\/(list\/)?$/.test(
    window.location.origin + window.location.pathname,
  );
}

export default function CsesProblemset() {
  const { cses } = useStorage(sharedStorage);
  const [sections] = useState(collectSections);
  const enabled = cses.problemBookmarksEnabled;

  // the heading becomes a flex row so the progress/reset sit on the right
  useEffect(() => {
    if (!enabled) return;
    sections.forEach(({ heading }) => {
      heading.style.display = "flex";
      heading.style.alignItems = "center";
    });
    return () => {
      sections.forEach(({ heading }) => {
        heading.style.display = "";
        heading.style.alignItems = "";
      });
    };
  }, [enabled, sections]);

  if (!enabled) return null;

  const isChecked = (sectionKey: string, taskKey: string) =>
    Boolean(cses.bookmarks[sectionKey]?.[taskKey]);
  const countCompleted = (section: Section) =>
    section.tasks.filter((task) => isChecked(section.key, task.key)).length;

  const taskSections = sections.filter((s) => s.number !== null);
  const allTasksCount = taskSections.reduce((n, s) => n + s.tasks.length, 0);
  const allCompletedCount = taskSections.reduce(
    (n, s) => n + countCompleted(s),
    0,
  );

  return (
    <>
      {sections.map((section) => {
        const isGeneral = section.number === null;
        return [
          section.number !== null &&
            createPortal(
              <span style={{ marginRight: "10px" }}>{section.number}.</span>,
              section.start,
              `${section.key}-start`,
            ),
          createPortal(
            <SectionMeta
              completed={
                isGeneral ? allCompletedCount : countCompleted(section)
              }
              total={isGeneral ? allTasksCount : section.tasks.length}
              onReset={() => resetSection(section.key)}
            />,
            section.end,
            `${section.key}-end`,
          ),
          ...section.tasks.flatMap((task) => [
            createPortal(
              <>
                <CopyButton text={`${task.number}. ${task.key}`} />
                <span style={{ marginRight: "6px" }}>{task.number}.</span>
              </>,
              task.start,
              `${section.key}/${task.key}-start`,
            ),
            createPortal(
              <StarButton
                checked={isChecked(section.key, task.key)}
                onToggle={() => toggleBookmark(section.key, task.key)}
              />,
              task.end,
              `${section.key}/${task.key}-end`,
            ),
          ]),
        ];
      })}
    </>
  );
}

"use client";

import { type Link, type Requirement, type Section } from "@/lib/schema";
import { STATUS_LABELS, PANE_HEADERS } from "@/lib/labels";
import {
  getRequirementProgress,
  hasEvidence,
} from "@/lib/computed/sections";
import { cn } from "@/lib/utils";

type NavAsideProps = {
  sections: Section[];
  requirements: Requirement[];
  links: Link[];
  activeId: string | null;
  onSelect: (id: string) => void;
};

/** ① 章立て・進捗 — Sidebar なしの素朴な左ペイン（道B 自由ルート）。 */
export function NavAside({
  sections,
  requirements,
  links,
  activeId,
  onSelect,
}: NavAsideProps) {
  const chapters = sections.filter((s) => s.level === 1);

  return (
    <aside className="flex min-h-0 flex-col border-r border-border bg-card">
      <div className="shrink-0 border-b border-border bg-secondary px-3 py-2 text-xs font-semibold text-primary">
        {PANE_HEADERS.nav}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {chapters.map((chapter) => (
          <div key={chapter.id} className="flex flex-col gap-0.5">
            <p className="mt-2 px-2 text-xs font-bold text-foreground first:mt-0">
              {chapter.number} {chapter.title}
            </p>
            {sections
              .filter((s) => s.parentId === chapter.id)
              .map((section) => {
                const active = activeId === section.id;
                const { total, done } = getRequirementProgress(
                  section.id,
                  requirements,
                );
                const evidence = hasEvidence(section.id, links);
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => onSelect(section.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-secondary",
                    )}
                  >
                    <span>
                      {section.number} {section.title}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      <span className="rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
                        {STATUS_LABELS[section.status]}
                      </span>
                      {total > 0 && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-px text-[10px]",
                            done === total
                              ? "bg-secondary text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          要件 {done}/{total}
                        </span>
                      )}
                      {evidence && (
                        <span className="rounded-full bg-primary px-1.5 py-px text-[10px] text-primary-foreground">
                          根拠あり
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    </aside>
  );
}

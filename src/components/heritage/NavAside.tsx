"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import {
  type Link,
  type Requirement,
  type Section,
  type Workspace,
} from "@/lib/schema";
import { STATUS_LABELS, PANE_HEADERS } from "@/lib/labels";
import {
  getRequirementProgress,
  hasEvidence,
} from "@/lib/computed/sections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type NavAsideProps = {
  sections: Section[];
  requirements: Requirement[];
  links: Link[];
  activeId: string | null;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  workspace: Workspace;
  onWorkspaceChange: (patch: Partial<Workspace>) => void;
};

/** 提出用Word の表紙に出る項目。左ペイン上部でインライン編集する。 */
const COVER_FIELDS: {
  key: keyof Pick<Workspace, "name" | "status" | "date" | "publisher">;
  label: string;
  placeholder: string;
}[] = [
  { key: "name", label: "計画名", placeholder: "○○市 文化財保存活用地域計画" },
  { key: "status", label: "種別（案など）", placeholder: "（案）" },
  { key: "date", label: "策定年月", placeholder: "令和○年（202○）○月" },
  { key: "publisher", label: "発行者", placeholder: "○○市" },
];

/** ① 章立て・進捗 — Sidebar なしの素朴な左ペイン（道B 自由ルート）。 */
export function NavAside({
  sections,
  requirements,
  links,
  activeId,
  onSelect,
  collapsed,
  onToggleCollapsed,
  workspace,
  onWorkspaceChange,
}: NavAsideProps) {
  const chapters = sections.filter((s) => s.level === 1);

  if (collapsed) {
    return (
      <aside className="flex min-h-0 flex-col items-center border-r border-border bg-card py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggleCollapsed}
          aria-label="章立て・進捗を開く"
          title="章立て・進捗を開く（⌘B）"
          className="text-primary"
        >
          <PanelLeftOpen />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="flex min-h-0 flex-col border-r border-border bg-card">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-secondary px-3 py-1.5">
        <span className="text-xs font-semibold text-primary">
          {PANE_HEADERS.nav}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggleCollapsed}
          aria-label="章立て・進捗を閉じる"
          title="章立て・進捗を閉じる（⌘B）"
          className="ml-auto text-primary"
        >
          <PanelLeftClose />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="mb-3 flex flex-col gap-2 rounded-md border border-border bg-secondary/40 p-3">
          <span className="text-xs font-semibold text-primary">表紙</span>
          {COVER_FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <Label
                htmlFor={`cover-${field.key}`}
                className="text-[11px] text-muted-foreground"
              >
                {field.label}
              </Label>
              <Input
                id={`cover-${field.key}`}
                value={workspace[field.key]}
                placeholder={field.placeholder}
                onChange={(e) =>
                  onWorkspaceChange({ [field.key]: e.target.value })
                }
              />
            </div>
          ))}
        </div>
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

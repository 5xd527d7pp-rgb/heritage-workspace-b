"use client";

import { useRef, useState } from "react";
import { Sparkles, ListChecks } from "lucide-react";

import { type Section, type SectionStatus } from "@/lib/schema";
import { STATUS_LABELS, STATUS_ORDER, PANE_HEADERS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EditorPaneProps = {
  section: Section | null;
  onSaveBody: (body: string) => void;
  onChangeStatus: (status: SectionStatus) => void;
  onAiDraft: () => void;
  onAiCheck: () => void;
};

/**
 * ② 本文エディタ。親（Workspace）が `key={section.id}` でリマウントするため、
 * 節切り替え時の初期化は useState の初期値で行い、Effect での同期はしない。
 */
export function EditorPane({
  section,
  onSaveBody,
  onChangeStatus,
  onAiDraft,
  onAiCheck,
}: EditorPaneProps) {
  if (!section) {
    return (
      <section className="flex min-w-0 flex-1 flex-col border-r border-border bg-background">
        <PaneHeader title={PANE_HEADERS.editor} />
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          左の章立てから節を選んでください。
        </div>
      </section>
    );
  }

  return (
    <EditorBody
      section={section}
      onSaveBody={onSaveBody}
      onChangeStatus={onChangeStatus}
      onAiDraft={onAiDraft}
      onAiCheck={onAiCheck}
    />
  );
}

function EditorBody({
  section,
  onSaveBody,
  onChangeStatus,
  onAiDraft,
  onAiCheck,
}: {
  section: Section;
  onSaveBody: (body: string) => void;
  onChangeStatus: (status: SectionStatus) => void;
  onAiDraft: () => void;
  onAiCheck: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);

  const scheduleSave = (next: string) => {
    setDirty(true);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      onSaveBody(next);
      setDirty(false);
    }, 700);
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col border-r border-border bg-background">
      <PaneHeader
        title={`${PANE_HEADERS.editor} — ${section.number} ${section.title}`}
        status={dirty ? "保存中…" : "保存済み"}
      />
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <span className="text-xs text-muted-foreground">状態</span>
        <Select
          value={section.status}
          onValueChange={(v) => onChangeStatus(v as SectionStatus)}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="flex-1" />
        <Button variant="secondary" size="sm" onClick={onAiDraft}>
          <Sparkles />
          AI下書き
        </Button>
        <Button variant="secondary" size="sm" onClick={onAiCheck}>
          <ListChecks />
          AI要件チェック
        </Button>
      </div>
      <div className="min-h-0 flex-1 p-4">
        <Textarea
          defaultValue={section.body}
          aria-label={`${section.number} ${section.title} の本文`}
          placeholder="ここに本文を執筆します。AI下書きで素材と要件をもとにした下書きを挿入できます。"
          onChange={(e) => scheduleSave(e.target.value)}
          onBlur={(e) => {
            window.clearTimeout(saveTimer.current);
            onSaveBody(e.target.value);
            setDirty(false);
          }}
          className="h-full min-h-full resize-none bg-card text-[0.95rem] leading-loose"
        />
      </div>
    </section>
  );
}

function PaneHeader({ title, status }: { title: string; status?: string }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
      <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
      {status && (
        <span className="ml-auto text-xs text-muted-foreground">{status}</span>
      )}
    </header>
  );
}

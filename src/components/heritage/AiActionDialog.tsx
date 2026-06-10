"use client";

import { useState } from "react";

import {
  type AiContext,
  type CheckResultItem,
  type DraftResult,
  type LinkSuggestion,
  type Requirement,
} from "@/lib/schema";
import {
  generateDraft,
  checkRequirements,
  suggestLinks,
} from "@/lib/ai/heritage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AiMode = "draft" | "check" | "suggest";

type AiActionDialogProps = {
  mode: AiMode | null;
  context: AiContext | null;
  allRequirements: Requirement[];
  approvedMaterialIds: Set<string>;
  onClose: () => void;
  onApplyDraft: (text: string) => void;
  onToggleRequirement: (requirementId: string, satisfied: boolean) => void;
  onApproveSuggestion: (
    materialId: string,
    requirementId: string | null,
  ) => void;
};

const MODE_TITLE: Record<AiMode, string> = {
  draft: "AI: 下書き作成",
  check: "AI: 要件チェック",
  suggest: "AI: 素材紐付け候補",
};

export function AiActionDialog(props: AiActionDialogProps) {
  const open = props.mode !== null && props.context !== null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && props.onClose()}>
      <DialogContent className="sm:max-w-xl">
        {props.mode && props.context && (
          <AiDialogBody key={props.mode} {...props} mode={props.mode} context={props.context} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AiDialogBody({
  mode,
  context,
  allRequirements,
  approvedMaterialIds,
  onApplyDraft,
  onToggleRequirement,
  onApproveSuggestion,
}: AiActionDialogProps & { mode: AiMode; context: AiContext }) {
  const [stage, setStage] = useState<"confirm" | "result">("confirm");
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [checks, setChecks] = useState<CheckResultItem[] | null>(null);
  const [suggestions, setSuggestions] = useState<LinkSuggestion[] | null>(null);

  const run = () => {
    if (mode === "draft") setDraft(generateDraft(context));
    else if (mode === "check") setChecks(checkRequirements(context));
    else setSuggestions(suggestLinks(context, allRequirements));
    setStage("result");
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {MODE_TITLE[mode]} — {context.section.number} {context.section.title}
        </DialogTitle>
        <DialogDescription>
          送信するのは下の内容のみです。写真や資料全文・台帳全体は送りません。確定は人が行います。
        </DialogDescription>
      </DialogHeader>

      {stage === "confirm" && (
        <div className="flex flex-col gap-3">
          <ContextBlock title="① 章・節本文">
            <p className="text-sm">
              {context.section.number} {context.section.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {context.section.body
                ? `本文 ${context.section.body.length} 文字`
                : "本文は未記入"}
            </p>
          </ContextBlock>
          <ContextBlock title={`② 記載要件カード（${context.requirements.length}件）`}>
            {context.requirements.length === 0 ? (
              <p className="text-xs text-muted-foreground">なし</p>
            ) : (
              <ul className="list-disc pl-5 text-sm">
                {context.requirements.map((r) => (
                  <li key={r.id}>{r.title}</li>
                ))}
              </ul>
            )}
          </ContextBlock>
          <ContextBlock
            title={`③ 承認済み素材（${context.approvedMaterials.length}件）`}
          >
            {context.approvedMaterials.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                承認済み素材なし（下書きは材料不足を報告します）
              </p>
            ) : (
              <ul className="list-disc pl-5 text-sm">
                {context.approvedMaterials.map((m) => (
                  <li key={m.id}>{m.title}</li>
                ))}
              </ul>
            )}
          </ContextBlock>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">キャンセル</Button>} />
            <Button onClick={run}>この内容で実行</Button>
          </DialogFooter>
        </div>
      )}

      {stage === "result" && mode === "draft" && draft && (
        <div className="flex flex-col gap-3">
          {draft.insufficient.length > 0 && (
            <div className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
              <p className="font-semibold">不足の報告（捏造していません）</p>
              <ul className="mt-1 list-disc pl-5">
                {draft.insufficient.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {draft.groundedOn.length > 0 && (
            <p className="text-xs text-muted-foreground">
              根拠素材: {draft.groundedOn.join(" / ")}
            </p>
          )}
          {draft.draft ? (
            <pre className="max-h-64 overflow-y-auto rounded-lg bg-card p-3 text-sm whitespace-pre-wrap ring-1 ring-foreground/10">
              {draft.draft}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              生成された下書きはありません。
            </p>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline">閉じる</Button>} />
            {draft.draft && (
              <DialogClose
                render={
                  <Button onClick={() => onApplyDraft(draft.draft)}>
                    本文に挿入
                  </Button>
                }
              />
            )}
          </DialogFooter>
        </div>
      )}

      {stage === "result" && mode === "check" && checks && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            要件ごとの充足判定（最終確認は人が行います）。
          </p>
          {checks.length === 0 && (
            <p className="text-sm text-muted-foreground">
              この節に要件カードがありません。
            </p>
          )}
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {checks.map((c) => (
              <div
                key={c.requirementId}
                className="flex flex-col gap-1.5 rounded-lg bg-card p-3 ring-1 ring-foreground/10"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={c.satisfied ? "default" : "outline"}>
                    {c.satisfied ? "充足" : "要対応"}
                  </Badge>
                  <span className="text-sm font-medium">
                    {c.requirementTitle}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{c.reason}</p>
                <Button
                  variant="outline"
                  size="xs"
                  className="self-start"
                  onClick={() =>
                    onToggleRequirement(c.requirementId, c.satisfied)
                  }
                >
                  {c.satisfied ? "達成にする" : "未達成にする"}
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">閉じる</Button>} />
          </DialogFooter>
        </div>
      )}

      {stage === "result" && mode === "suggest" && suggestions && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            素材と要件の紐付け候補。承認すると正式な根拠になります。
          </p>
          {suggestions.length === 0 && (
            <p className="text-sm text-muted-foreground">候補なし</p>
          )}
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {suggestions.map((s) => {
              const linked = approvedMaterialIds.has(s.materialId);
              return (
                <div
                  key={s.materialId}
                  className="flex items-center gap-2 rounded-lg bg-card p-3 ring-1 ring-foreground/10"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {s.materialTitle}
                    </p>
                    {s.requirementTitle && (
                      <p className="truncate text-xs text-muted-foreground">
                        → 要件: {s.requirementTitle}（一致度 {s.score}）
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={linked}
                    onClick={() =>
                      onApproveSuggestion(s.materialId, s.requirementId)
                    }
                  >
                    {linked ? "紐付済" : "承認"}
                  </Button>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">閉じる</Button>} />
          </DialogFooter>
        </div>
      )}
    </>
  );
}

function ContextBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <h4 className="mb-1 text-xs font-semibold">{title}</h4>
      {children}
    </div>
  );
}

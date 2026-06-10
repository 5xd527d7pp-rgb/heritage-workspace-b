"use client";

import { useState } from "react";
import { Link2, Plus, Sparkles } from "lucide-react";

import { type Material, type Section } from "@/lib/schema";
import { KIND_LABELS, PANE_HEADERS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddItemDialog } from "@/components/heritage/AddItemDialog";

type MaterialsPaneProps = {
  section: Section | null;
  materials: Material[];
  approvedMaterialIds: Set<string>;
  onLinkMaterial: (materialId: string) => void;
  onAddMaterial: (title: string) => void;
  onAiSuggest: () => void;
};

export function MaterialsPane({
  section,
  materials,
  approvedMaterialIds,
  onLinkMaterial,
  onAddMaterial,
  onAiSuggest,
}: MaterialsPaneProps) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-background">
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/40 px-3">
        <h2 className="truncate text-xs font-semibold text-foreground">
          {PANE_HEADERS.materials}
        </h2>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setAdding(true)}
          aria-label="素材を取り込み"
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus />
        </Button>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-2 p-3">
          {section && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onAiSuggest}
              className="self-start"
            >
              <Sparkles />
              AI素材紐付け候補
            </Button>
          )}
          {materials.length === 0 && (
            <p className="px-1 py-4 text-center text-xs text-muted-foreground">
              素材がありません。
            </p>
          )}
          {materials.map((m) => {
            const linked = approvedMaterialIds.has(m.id);
            return (
              <Card key={m.id} size="sm">
                <CardContent className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {KIND_LABELS[m.kind]}
                    </Badge>
                    <span className="flex-1 truncate text-sm font-medium">
                      {m.title}
                    </span>
                  </div>
                  {m.textExcerpt && (
                    <p className="text-xs text-muted-foreground">
                      {m.textExcerpt}
                    </p>
                  )}
                  {section && (
                    <Button
                      variant={linked ? "ghost" : "outline"}
                      size="xs"
                      disabled={linked}
                      onClick={() => onLinkMaterial(m.id)}
                      className="self-start"
                    >
                      <Link2 />
                      {linked ? "この節に紐付済" : "この節に紐付け"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <AddItemDialog
        open={adding}
        onOpenChange={setAdding}
        title="素材を取り込み"
        description="台帳・資料・画像などの素材を追加します"
        fieldLabel="素材タイトル"
        fieldId="material-title"
        placeholder="例: 文化財保護審議会 議事録"
        onAdd={onAddMaterial}
      />
    </section>
  );
}

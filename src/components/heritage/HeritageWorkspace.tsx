"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, FileCheck2, PanelRightOpen, RotateCcw } from "lucide-react";

import {
  type AiContext,
  type Link,
  type Material,
  type Requirement,
  type Section,
  type SectionStatus,
  type Workspace as WorkspaceMeta,
} from "@/lib/schema";
import {
  approvedMaterialIds,
  defaultActiveSectionId,
} from "@/lib/computed/sections";
import { downloadWord, openReviewPreview } from "@/lib/export/client";
import {
  clearPersisted,
  clearRemotePersisted,
  flushRemotePersisted,
  loadPersisted,
  loadRemotePersisted,
  savePersisted,
  saveRemotePersisted,
  type PersistedPayload,
} from "@/lib/persistence/storage";
import { Button } from "@/components/ui/button";
import { NavAside } from "@/components/heritage/NavAside";
import { EditorPane } from "@/components/heritage/EditorPane";
import { RequirementsPane } from "@/components/heritage/RequirementsPane";
import { MaterialsPane } from "@/components/heritage/MaterialsPane";
import {
  AiActionDialog,
  type AiMode,
} from "@/components/heritage/AiActionDialog";

type HeritageWorkspaceProps = {
  initialSections: Section[];
  initialRequirements: Requirement[];
  initialMaterials: Material[];
  initialLinks: Link[];
  workspace: WorkspaceMeta;
};

/**
 * 道B（自由ルート）: heritage-plan-tool に近い CSS Grid レイアウト。
 * SidebarProvider 等の workspace-ui-kit 部品は使わず、素朴な grid + 茶系テーマ。
 */
export function HeritageWorkspace({
  initialSections,
  initialRequirements,
  initialMaterials,
  initialLinks,
  workspace,
}: HeritageWorkspaceProps) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [requirements, setRequirements] =
    useState<Requirement[]>(initialRequirements);
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const [workspaceMeta, setWorkspaceMeta] = useState<WorkspaceMeta>(workspace);
  const [aiMode, setAiMode] = useState<AiMode | null>(null);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  // 直後の保存をスキップするフラグ（ハイドレーション/リセット直後の上書き防止）。
  const skipNextSave = useRef(false);
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const remoteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPayloadRef = useRef<PersistedPayload | null>(null);
  const [activeId, setActiveId] = useState<string | null>(() =>
    defaultActiveSectionId(initialSections),
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === "b") {
        e.preventDefault();
        setNavCollapsed((prev) => !prev);
      } else if (key === "j") {
        e.preventDefault();
        setRightCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const applyPersisted = useCallback(
    (saved: {
      sections: Section[];
      requirements: Requirement[];
      materials: Material[];
      links: Link[];
      workspace?: WorkspaceMeta;
    }) => {
      skipNextSave.current = true;
      setSections(saved.sections);
      setRequirements(saved.requirements);
      setMaterials(saved.materials);
      setLinks(saved.links);
      if (saved.workspace) setWorkspaceMeta(saved.workspace);
      setActiveId((prev) =>
        prev && saved.sections.some((s) => s.id === prev)
          ? prev
          : defaultActiveSectionId(saved.sections),
      );
    },
    [],
  );

  // マウント後に DB → localStorage の順で復元。初回レンダーは props（SSR と同じ）。
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const remote = await loadRemotePersisted();
      if (cancelled) return;

      setRemoteEnabled(remote.enabled);

      const local = loadPersisted();
      const saved = remote.state ?? local;
      if (!saved) return;

      applyPersisted(saved);

      // DB は空だが local にだけデータがある → 次の保存で DB に同期
      if (remote.enabled && !remote.state && local) {
        skipNextSave.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyPersisted]);

  // 編集状態を localStorage +（任意）Neon API に保存する。
  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    const payload: PersistedPayload = {
      sections,
      requirements,
      materials,
      links,
      workspace: workspaceMeta,
    };
    latestPayloadRef.current = payload;

    savePersisted(payload);

    if (!remoteEnabled) return;

    if (remoteSaveTimer.current) clearTimeout(remoteSaveTimer.current);
    // 本文エディタ側で 700ms デバounce済みのため、DB 同期は短めにする。
    remoteSaveTimer.current = setTimeout(() => {
      void saveRemotePersisted(payload);
    }, 200);

    return () => {
      if (remoteSaveTimer.current) clearTimeout(remoteSaveTimer.current);
    };
  }, [sections, requirements, materials, links, workspaceMeta, remoteEnabled]);

  // リロード・タブ閉じの直前に DB へフラッシュ（debounce 待ちの保存を逃さない）。
  useEffect(() => {
    if (!remoteEnabled) return;

    const flush = () => {
      if (remoteSaveTimer.current) {
        clearTimeout(remoteSaveTimer.current);
        remoteSaveTimer.current = null;
      }
      const payload = latestPayloadRef.current;
      if (payload) flushRemotePersisted(payload);
    };

    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [remoteEnabled]);

  const resetToInitial = useCallback(() => {
    clearPersisted();
    if (remoteEnabled) void clearRemotePersisted();
    skipNextSave.current = true;
    setSections(initialSections);
    setRequirements(initialRequirements);
    setMaterials(initialMaterials);
    setLinks(initialLinks);
    setWorkspaceMeta(workspace);
    setActiveId(defaultActiveSectionId(initialSections));
  }, [
    initialSections,
    initialRequirements,
    initialMaterials,
    initialLinks,
    workspace,
    remoteEnabled,
  ]);

  const updateWorkspaceMeta = useCallback((patch: Partial<WorkspaceMeta>) => {
    setWorkspaceMeta((prev) => ({ ...prev, ...patch }));
  }, []);

  // 復元後に activeId が存在しない節を指している場合は補正する。
  useEffect(() => {
    if (activeId && sections.some((s) => s.id === activeId)) return;
    const next = defaultActiveSectionId(sections);
    if (next !== activeId) setActiveId(next);
  }, [sections, activeId]);

  const active = sections.find((s) => s.id === activeId) ?? null;

  const approvedIds = useMemo(
    () => (activeId ? approvedMaterialIds(activeId, links) : new Set<string>()),
    [activeId, links],
  );

  const saveBody = useCallback(
    (body: string) => {
      if (!activeId) return;
      setSections((prev) =>
        prev.map((s) => (s.id === activeId ? { ...s, body } : s)),
      );
    },
    [activeId],
  );

  const changeStatus = useCallback(
    (status: SectionStatus) => {
      if (!activeId) return;
      setSections((prev) =>
        prev.map((s) => (s.id === activeId ? { ...s, status } : s)),
      );
    },
    [activeId],
  );

  const changePageRef = useCallback(
    (pageRef: string) => {
      if (!activeId) return;
      setSections((prev) =>
        prev.map((s) => (s.id === activeId ? { ...s, pageRef } : s)),
      );
    },
    [activeId],
  );

  const toggleRequirement = useCallback(
    (requirementId: string, satisfied: boolean) => {
      setRequirements((prev) =>
        prev.map((r) => (r.id === requirementId ? { ...r, satisfied } : r)),
      );
    },
    [],
  );

  const addRequirement = useCallback(
    (title: string) => {
      if (!activeId) return;
      setRequirements((prev) => [
        ...prev,
        {
          id: `r-${Date.now()}`,
          sectionId: activeId,
          title,
          description: "",
          sourceDoc: "手入力",
          sourceLocation: "",
          condition: "",
          satisfied: false,
        },
      ]);
    },
    [activeId],
  );

  const addMaterial = useCallback((title: string) => {
    setMaterials((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        kind: "document",
        title,
        refType: "",
        location: "",
        textExcerpt: "",
      },
    ]);
  }, []);

  const linkMaterial = useCallback(
    (materialId: string, requirementId: string | null = null) => {
      if (!activeId) return;
      setLinks((prev) => {
        if (
          prev.some(
            (l) =>
              l.sectionId === activeId &&
              l.materialId === materialId &&
              l.status === "approved",
          )
        ) {
          return prev;
        }
        return [
          ...prev,
          {
            id: `l-${Date.now()}-${materialId}`,
            sectionId: activeId,
            requirementId,
            materialId,
            status: "approved",
            note: "",
          },
        ];
      });
    },
    [activeId],
  );

  const applyDraft = useCallback(
    (text: string) => {
      if (!activeId) return;
      setSections((prev) =>
        prev.map((s) =>
          s.id === activeId
            ? {
                ...s,
                body: s.body ? `${s.body}\n\n${text}` : text,
                status: "drafted",
              }
            : s,
        ),
      );
    },
    [activeId],
  );

  const exportInput = useMemo(
    () => ({
      workspaceName: workspaceMeta.name,
      sections,
      requirements,
      materials,
      links,
      coverStatus: workspaceMeta.status,
      coverDate: workspaceMeta.date,
      coverPublisher: workspaceMeta.publisher,
    }),
    [workspaceMeta, sections, requirements, materials, links],
  );

  const aiContext: AiContext | null = useMemo(() => {
    if (!active) return null;
    return {
      section: {
        number: active.number,
        title: active.title,
        body: active.body,
      },
      requirements: requirements.filter((r) => r.sectionId === active.id),
      approvedMaterials: materials.filter((m) => approvedIds.has(m.id)),
    };
  }, [active, requirements, materials, approvedIds]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-3 bg-primary px-4 py-2 text-primary-foreground">
        <h1 className="text-sm font-semibold">{workspaceMeta.name}</h1>
        <span className="flex-1" />
        {active && (
          <span className="truncate text-xs opacity-90">
            {active.number} {active.title}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => openReviewPreview(exportInput)}
          className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
        >
          <FileText />
          レビュー版
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadWord(exportInput)}
          className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
        >
          <FileCheck2 />
          提出用Word
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (
              window.confirm(
                "保存した編集内容を消して初期データに戻します。よろしいですか？",
              )
            ) {
              resetToInitial();
            }
          }}
          aria-label="初期データに戻す"
          title="保存した編集内容を消して初期データに戻す"
          className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
        >
          <RotateCcw />
          初期化
        </Button>
      </header>

      <div
        className="grid min-h-0 flex-1"
        style={{
          gridTemplateColumns: `${navCollapsed ? "44px" : "250px"} 1fr ${
            rightCollapsed ? "44px" : "340px"
          }`,
        }}
      >
        <NavAside
          sections={sections}
          requirements={requirements}
          links={links}
          activeId={activeId}
          onSelect={setActiveId}
          collapsed={navCollapsed}
          onToggleCollapsed={() => setNavCollapsed((prev) => !prev)}
          workspace={workspaceMeta}
          onWorkspaceChange={updateWorkspaceMeta}
        />
        <EditorPane
          key={active?.id ?? "none"}
          section={active}
          onSaveBody={saveBody}
          onChangeStatus={changeStatus}
          onChangePageRef={changePageRef}
          onAiDraft={() => setAiMode("draft")}
          onAiCheck={() => setAiMode("check")}
        />
        {rightCollapsed ? (
          <aside className="flex min-h-0 flex-col items-center border-l border-border bg-card py-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setRightCollapsed(false)}
              aria-label="要件・素材パネルを開く"
              title="要件・素材パネルを開く（⌘J）"
              className="text-primary"
            >
              <PanelRightOpen />
            </Button>
          </aside>
        ) : (
          <div className="flex min-h-0 flex-col border-l border-border">
            <RequirementsPane
              section={active}
              requirements={requirements}
              onToggleSatisfied={toggleRequirement}
              onAddRequirement={addRequirement}
              onToggleCollapsed={() => setRightCollapsed(true)}
            />
            <MaterialsPane
              section={active}
              materials={materials}
              approvedMaterialIds={approvedIds}
              onLinkMaterial={(materialId) => linkMaterial(materialId)}
              onAddMaterial={addMaterial}
              onAiSuggest={() => setAiMode("suggest")}
            />
          </div>
        )}
      </div>

      <AiActionDialog
        mode={aiMode}
        context={aiContext}
        allRequirements={requirements}
        approvedMaterialIds={approvedIds}
        onClose={() => setAiMode(null)}
        onApplyDraft={applyDraft}
        onToggleRequirement={toggleRequirement}
        onApproveSuggestion={(materialId, requirementId) =>
          linkMaterial(materialId, requirementId)
        }
      />
    </div>
  );
}

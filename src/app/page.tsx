import { HeritageWorkspace } from "@/components/heritage/HeritageWorkspace";
import sectionsData from "@/data/sections.json";
import requirementsData from "@/data/requirements.json";
import materialsData from "@/data/materials.json";
import linksData from "@/data/links.json";
import workspaceData from "@/data/workspace.json";
import {
  sectionsSchema,
  requirementsSchema,
  materialsSchema,
  linksSchema,
  workspaceSchema,
} from "@/lib/schema";

export default function Page() {
  const sectionsResult = sectionsSchema.safeParse(sectionsData);
  const requirementsResult = requirementsSchema.safeParse(requirementsData);
  const materialsResult = materialsSchema.safeParse(materialsData);
  const linksResult = linksSchema.safeParse(linksData);
  const wsResult = workspaceSchema.safeParse(workspaceData);

  if (
    !sectionsResult.success ||
    !requirementsResult.success ||
    !materialsResult.success ||
    !linksResult.success ||
    !wsResult.success
  ) {
    const errors = [
      !sectionsResult.success &&
        `sections.json: ${sectionsResult.error.issues[0]?.message}`,
      !requirementsResult.success &&
        `requirements.json: ${requirementsResult.error.issues[0]?.message}`,
      !materialsResult.success &&
        `materials.json: ${materialsResult.error.issues[0]?.message}`,
      !linksResult.success &&
        `links.json: ${linksResult.error.issues[0]?.message}`,
      !wsResult.success && `workspace.json: ${wsResult.error.issues[0]?.message}`,
    ].filter(Boolean);
    throw new Error(`データの形式が正しくありません:\n${errors.join("\n")}`);
  }

  return (
    <HeritageWorkspace
      initialSections={sectionsResult.data}
      initialRequirements={requirementsResult.data}
      initialMaterials={materialsResult.data}
      initialLinks={linksResult.data}
      workspace={wsResult.data}
    />
  );
}

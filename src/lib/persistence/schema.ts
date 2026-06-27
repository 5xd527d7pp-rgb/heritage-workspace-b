import {
  linksSchema,
  materialsSchema,
  requirementsSchema,
  sectionsSchema,
  workspaceSchema,
} from "@/lib/schema";
import { z } from "zod";

/** localStorage / DB 共通の保存形式。 */
export const persistedSchema = z.object({
  sections: sectionsSchema,
  requirements: requirementsSchema,
  materials: materialsSchema,
  links: linksSchema,
  workspace: workspaceSchema.optional(),
});

export type PersistedState = z.infer<typeof persistedSchema>;

import { z } from "zod";
z.config(z.locales.es());

const name = z
  .string()
  .trim()
  .min(2, "Escribe al menos dos caracteres.")
  .max(120);
const note = z.string().trim().max(2000);
const id = z.string().min(1).max(100);
const uniqueIds = z
  .array(id)
  .max(500)
  .refine((ids) => new Set(ids).size === ids.length, "No repitas opciones.");
const location = z
  .object({
    address: z.string().trim().max(250),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
  })
  .refine((v) => (v.lat === null) === (v.lng === null), {
    path: ["lat"],
    message: "Completa las dos coordenadas o deja ambas vacías.",
  });

export const profileSchema = location.safeExtend({
  name,
  program: z.string().trim().max(150),
  department: z.string().trim().max(150),
  maxDistanceKm: z.number().int().min(1).max(1000).nullable(),
  maxStudents: z.number().int().min(0).max(1000),
  priority: z.boolean(),
});
export const companySchema = z.object({
  name,
  taxId: z.string().trim().max(40),
});
export const placementSchema = location.safeExtend({
  title: name,
  description: note,
  companyId: id,
  competencyFormId: id,
  seats: z.number().int().min(0).max(1000),
  active: z.boolean(),
  requirements: z.record(id, z.number().int().min(1).max(5)),
});
export const competencySchema = z.object({ name, description: note });
export const competencyFormSchema = competencySchema.extend({
  competencyIds: uniqueIds.refine(
    (ids) => ids.length > 0,
    "Selecciona alguna competencia.",
  ),
});
export const preferencesSchema = z.object({
  placementIds: uniqueIds,
  competencies: z.record(
    id,
    z.object({
      level: z.number().int().min(1).max(5),
      wantsToDevelop: z.boolean(),
    }),
  ),
});
export const feedbackSchema = z.object({
  assignmentId: id,
  rating: z.number().int().min(1).max(5),
  comment: note,
});
export const pilotSchema = z.object({
  usability: z.number().int().min(1).max(5),
  usefulness: z.number().int().min(1).max(5),
  satisfaction: z.number().int().min(1).max(5),
  barriers: note,
});
export type ProfileValues = z.infer<typeof profileSchema>;
export type PlacementValues = z.infer<typeof placementSchema>;
export type PreferencesValues = z.infer<typeof preferencesSchema>;

export function validationMessage(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .slice(0, 5)
    .join(" · ");
}

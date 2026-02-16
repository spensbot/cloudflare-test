import z from "zod";

export const OkSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({ ok: z.literal(true), val: dataSchema });
export const ErrSchema = <E extends z.ZodType>(errSchema: E) =>
  z.object({
    ok: z.literal(false),
    err: errSchema,
  });

export function ResultSchema<T extends z.ZodType, E extends z.ZodType>(
  dataSchema: T,
  errSchema: E,
) {
  return z.union([
    OkSchema(dataSchema),
    ErrSchema(errSchema),
  ]);
}

import z from "zod"
import type { Result } from "./Result"

export const OkSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({ ok: z.literal(true), val: dataSchema })
export const ErrSchema = <E extends z.ZodType>(errSchema: E) =>
  z.object({
    ok: z.literal(false),
    err: errSchema,
  })

export function ResultSchema<T extends z.ZodType, E extends z.ZodType>(
  dataSchema: T,
  errSchema: E,
): z.ZodType<Result<z.output<T>, z.output<E>>> {
  // Cast needed because Zod's internal object mapping types don't resolve
  // to the clean discriminated union shape of Result<T, E>
  return z.union([
    OkSchema(dataSchema),
    ErrSchema(errSchema),
  ]) as unknown as z.ZodType<Result<z.output<T>, z.output<E>>>
}

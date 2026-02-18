import { TypedRpc } from "@repo/core"
import { z } from "zod"

const InputSchema = z.object({
  name: z.string(),
})
type Input = z.infer<typeof InputSchema>

const OutputSchema = z.object({
  message: z.string(),
})
type Output = z.infer<typeof OutputSchema>

export const GreetRpc = new TypedRpc<
  Input,
  Output,
  never,
  typeof InputSchema,
  typeof OutputSchema
>("/api/greet", InputSchema, OutputSchema)

import { describe, it, expect, vi } from "vitest"
import { z } from "zod"
import { Ok, Err } from "../result/Result"
import { TypedRpc } from "./TypedRpc"

vi.mock("cross-fetch")

const inputSchema = z.object({ name: z.string() })
const outputSchema = z.object({ greeting: z.string() })
type Input = z.infer<typeof inputSchema>
type Output = z.infer<typeof outputSchema>
type AppError = { code: "appError"; message: string }

const rpc = new TypedRpc<Input, Output, AppError, typeof inputSchema, typeof outputSchema>(
  "/greet",
  inputSchema,
  outputSchema,
)

describe("TypedRpc.execute", () => {
  it("returns a serialized Ok result on success", async () => {
    const cb = async (input: Input) => Ok({ greeting: `Hello, ${input.name}!` })
    const result = await rpc.execute(JSON.stringify({ name: "Alice" }), cb)
    expect(JSON.parse(result)).toEqual({ ok: true, val: { greeting: "Hello, Alice!" } })
  })

  it("returns a serialized Err result when the callback returns Err", async () => {
    const appErr: AppError = { code: "appError", message: "something went wrong" }
    const cb = async (_input: Input) => Err(appErr)
    const result = await rpc.execute(JSON.stringify({ name: "Alice" }), cb)
    expect(JSON.parse(result)).toEqual({ ok: false, err: appErr })
  })

  it("returns a serialized schemaValidationError for invalid input", async () => {
    const cb = async (input: Input) => Ok({ greeting: `Hello, ${input.name}!` })
    const result = await rpc.execute(JSON.stringify({ name: 123 }), cb)
    const parsed = JSON.parse(result)
    expect(parsed.ok).toBe(false)
    expect(parsed.err.code).toBe("schemaValidationError")
  })

  it("returns a serialized jsonParseError for malformed JSON input", async () => {
    const cb = async (input: Input) => Ok({ greeting: `Hello, ${input.name}!` })
    const result = await rpc.execute("{not valid json}", cb)
    const parsed = JSON.parse(result)
    expect(parsed.ok).toBe(false)
    expect(parsed.err.code).toBe("jsonParseError")
  })

  it("returns a serialized unexpectedThrownError when the callback throws", async () => {
    const cb = async (_input: Input): Promise<ReturnType<typeof Ok<Output>>> => {
      throw new Error("boom")
    }
    const result = await rpc.execute(JSON.stringify({ name: "Alice" }), cb)
    const parsed = JSON.parse(result)
    expect(parsed.ok).toBe(false)
    expect(parsed.err.code).toBe("unexpectedThrownError")
    expect(parsed.err.message).toContain("boom")
  })
})


import { describe, it, expect, vi, beforeEach } from "vitest"
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

describe("TypedRpc.call", () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const crossFetch = await import("cross-fetch")
    mockFetch = vi.mocked(crossFetch.default)
    mockFetch.mockReset()
  })

  function mockResponse(body: unknown, ok = true, status = 200) {
    mockFetch.mockResolvedValue({
      ok,
      status,
      statusText: ok ? "OK" : "Error",
      text: async () => JSON.stringify(body),
    } as Response)
  }

  it("returns Ok when the server responds with a successful result", async () => {
    mockResponse({ ok: true, val: { greeting: "Hello, Alice!" } })
    const result = await rpc.call("https://api.example.com", { name: "Alice" })
    expect(result).toEqual({ ok: true, val: { greeting: "Hello, Alice!" } })
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/greet",
      expect.objectContaining({ body: JSON.stringify({ name: "Alice" }) }),
    )
  })

  it("returns Err when the server responds with an error result", async () => {
    const appErr = { code: "appError", message: "not found" }
    mockResponse({ ok: false, err: appErr })
    const result = await rpc.call("https://api.example.com", { name: "Alice" })
    expect(result).toEqual({ ok: false, err: appErr })
  })

  it("returns httpError when the server returns a non-2xx status", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response)
    const result = await rpc.call("https://api.example.com", { name: "Alice" })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("httpError")
  })

  it("returns fetchError when the network request throws", async () => {
    mockFetch.mockRejectedValue(new Error("Network unreachable"))
    const result = await rpc.call("https://api.example.com", { name: "Alice" })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("fetchError")
  })

  it("returns schemaValidationError when the server returns an unexpected shape", async () => {
    mockResponse({ ok: true, val: { wrong: "shape" } })
    const result = await rpc.call("https://api.example.com", { name: "Alice" })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("schemaValidationError")
  })

  it("returns jsonParseError when the server returns malformed JSON", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => "{not valid json}",
    } as Response)
    const result = await rpc.call("https://api.example.com", { name: "Alice" })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("jsonParseError")
  })
})

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

describe("TypedRpc.call", () => {
  const makeSuccessResponse = (output: Output) =>
    new Response(JSON.stringify({ ok: true, val: output }), { status: 200 })

  const makeErrResponse = (err: unknown) =>
    new Response(JSON.stringify({ ok: false, err }), { status: 200 })

  it("returns Ok with parsed output on a successful response", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      makeSuccessResponse({ greeting: "Hello, Alice!" })
    )
    const result = await rpc.call(mockFetch, "https://example.com", { name: "Alice" })
    // The outer Ok means parsing succeeded; val is the server's Result
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/greet",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "Alice" }) })
    )
    expect(result).toEqual({ ok: true, val: { greeting: "Hello, Alice!" } })
  })

  it("returns schemaValidationError when the server returns an Err with an unrecognized error code", async () => {
    // call() only knows about RpcError codes in the Err branch; app-level errors
    // that don't match RpcErrorSchema result in a schemaValidationError.
    const appErr: AppError = { code: "appError", message: "something went wrong" }
    const mockFetch = vi.fn().mockResolvedValue(makeErrResponse(appErr))
    const result = await rpc.call(mockFetch, "https://example.com", { name: "Alice" })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("schemaValidationError")
  })

  it("returns Err when the server returns an Err result with a known RpcError code", async () => {
    const rpcErr = { code: "httpError", message: "HTTP error 503: Service Unavailable" }
    const mockFetch = vi.fn().mockResolvedValue(makeErrResponse(rpcErr))
    const result = await rpc.call(mockFetch, "https://example.com", { name: "Alice" })
    // Parsing succeeded, so outer is Ok; inner is the server's Err
    expect(result).toEqual({ ok: false, err: rpcErr })
  })

  it("returns fetchError when fetch throws", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("network failure"))
    const result = await rpc.call(mockFetch, "https://example.com", { name: "Alice" })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("fetchError")
    expect(!result.ok && result.err.message).toContain("network failure")
  })

  it("returns httpError when the server returns a non-ok HTTP status", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response("Internal Server Error", { status: 500, statusText: "Internal Server Error" })
    )
    const result = await rpc.call(mockFetch, "https://example.com", { name: "Alice" })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("httpError")
    expect(!result.ok && result.err.message).toContain("500")
  })

  it("returns jsonParseError when the response body is not valid JSON", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response("not json at all", { status: 200 })
    )
    const result = await rpc.call(mockFetch, "https://example.com", { name: "Alice" })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("jsonParseError")
  })

  it("returns schemaValidationError when the response output fails schema validation", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, val: { greeting: 12345 } }), { status: 200 })
    )
    const result = await rpc.call(mockFetch, "https://example.com", { name: "Alice" })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("schemaValidationError")
  })

  it("uses the correct URL by concatenating urlBase and path", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      makeSuccessResponse({ greeting: "Hello, Bob!" })
    )
    await rpc.call(mockFetch, "https://api.example.com", { name: "Bob" })
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/greet",
      expect.anything()
    )
  })
})


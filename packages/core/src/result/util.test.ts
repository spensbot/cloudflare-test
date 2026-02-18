import { describe, it, expect, vi, beforeEach } from "vitest"
import z from "zod"
import { Result } from "./Result"
import { ResultSchema } from "./ResultSchema"
import { rJsonParse, rJsonStringify, rSchemaParse, rParse, rFetch } from "./util"

vi.mock("cross-fetch")

describe("rJsonParse", () => {
  it("parses a valid JSON object", () => {
    const result = rJsonParse('{"key":"value"}')
    expect(result.ok).toBe(true)
    expect(result.ok && result.val).toEqual({ key: "value" })
  })

  it("parses a valid JSON array", () => {
    const result = rJsonParse("[1,2,3]")
    expect(result.ok).toBe(true)
    expect(result.ok && result.val).toEqual([1, 2, 3])
  })

  it("parses a JSON primitive", () => {
    expect(rJsonParse("42").ok && (rJsonParse("42") as any).val).toBe(42)
    expect(rJsonParse('"hello"').ok && (rJsonParse('"hello"') as any).val).toBe("hello")
    expect(rJsonParse("true").ok && (rJsonParse("true") as any).val).toBe(true)
    expect(rJsonParse("null").ok && (rJsonParse("null") as any).val).toBe(null)
  })

  it("returns Err for invalid JSON", () => {
    const result = rJsonParse("{invalid}")
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("jsonParseError")
    expect(!result.ok && result.err.message).toContain("Failed to parse JSON")
  })

  it("returns Err for empty string", () => {
    const result = rJsonParse("")
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("jsonParseError")
  })
})

describe("rJsonStringify", () => {
  it("stringifies a valid object", () => {
    const result = rJsonStringify({ key: "value" })
    expect(result.ok).toBe(true)
    expect(result.ok && result.val).toBe('{"key":"value"}')
  })

  it("stringifies an array", () => {
    const result = rJsonStringify([1, 2, 3])
    expect(result.ok).toBe(true)
    expect(result.ok && result.val).toBe("[1,2,3]")
  })

  it("stringifies primitives", () => {
    expect(rJsonStringify(42).ok && (rJsonStringify(42) as any).val).toBe("42")
    expect(rJsonStringify("hello").ok && (rJsonStringify("hello") as any).val).toBe('"hello"')
    expect(rJsonStringify(true).ok && (rJsonStringify(true) as any).val).toBe("true")
    expect(rJsonStringify(null).ok && (rJsonStringify(null) as any).val).toBe("null")
  })

  it("returns Err for circular references", () => {
    const obj: any = {}
    obj.self = obj
    const result = rJsonStringify(obj)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("jsonStringifyError")
    expect(!result.ok && result.err.message).toContain("Failed to stringify JSON")
  })
})

describe("rSchemaParse", () => {
  const schema = z.object({ name: z.string(), age: z.number() })

  it("returns Ok for valid data", () => {
    const result = rSchemaParse({ name: "Alice", age: 30 }, schema)
    expect(result.ok).toBe(true)
    expect(result.ok && result.val).toEqual({ name: "Alice", age: 30 })
  })

  it("returns Err for missing field", () => {
    const result = rSchemaParse({ name: "Alice" }, schema)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("schemaValidationError")
    expect(!result.ok && result.err.message).toContain("Schema validation failed")
  })

  it("returns Err for wrong field type", () => {
    const result = rSchemaParse({ name: "Alice", age: "thirty" }, schema)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("schemaValidationError")
  })

  it("returns Err for non-object input", () => {
    const result = rSchemaParse(null, schema)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("schemaValidationError")
  })

  it("works with primitive schemas", () => {
    const numResult = rSchemaParse(42, z.number())
    expect(numResult.ok).toBe(true)
    expect(numResult.ok && numResult.val).toBe(42)

    const strResult = rSchemaParse(42, z.string())
    expect(strResult.ok).toBe(false)
  })
})

describe("rParse", () => {
  const schema = z.object({ name: z.string(), age: z.number() })

  it("parses valid JSON matching the schema", () => {
    const result = rParse('{"name":"Alice","age":30}', schema)
    expect(result.ok).toBe(true)
    expect(result.ok && result.val).toEqual({ name: "Alice", age: 30 })
  })

  it("returns jsonParseError for invalid JSON", () => {
    const result = rParse("{invalid}", schema)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("jsonParseError")
  })

  it("returns schemaValidationError for valid JSON that fails the schema", () => {
    const result = rParse('{"name":"Alice"}', schema)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("schemaValidationError")
  })

  it("returns schemaValidationError for wrong types", () => {
    const result = rParse('{"name":"Alice","age":"thirty"}', schema)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("schemaValidationError")
  })

  it("works with primitive schemas", () => {
    const result = rParse("42", z.number())
    expect(result.ok).toBe(true)
    expect(result.ok && result.val).toBe(42)
  })
})

describe("rFetch", () => {
  // Import the mocked module so we can control its behavior per test
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const crossFetch = await import("cross-fetch")
    mockFetch = vi.mocked(crossFetch.default)
    mockFetch.mockReset()
  })

  it("returns Ok with response text on a successful GET", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '{"hello":"world"}',
    } as Response)

    const result = await rFetch("https://example.com/api")
    expect(result.ok).toBe(true)
    expect(result.ok && result.val).toBe('{"hello":"world"}')
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/api", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      body: undefined,
    })
  })

  it("sends a POST with body when body is provided", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => "created",
    } as Response)

    const result = await rFetch("https://example.com/api", '{"name":"Alice"}')
    expect(result.ok).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"name":"Alice"}',
    })
  })

  it("returns httpError when response.ok is false", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response)

    const result = await rFetch("https://example.com/missing")
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("httpError")
    expect(!result.ok && result.err.message).toContain("404")
    expect(!result.ok && result.err.message).toContain("Not Found")
  })

  it("returns fetchError when fetch throws (e.g. network failure)", async () => {
    mockFetch.mockRejectedValue(new Error("Network unreachable"))

    const result = await rFetch("https://example.com/api")
    expect(result.ok).toBe(false)
    expect(!result.ok && result.err.code).toBe("fetchError")
    expect(!result.ok && result.err.message).toContain("Network unreachable")
  })
})

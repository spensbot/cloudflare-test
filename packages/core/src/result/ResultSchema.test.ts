import { describe, it, expect } from "vitest"
import z from "zod"
import { ResultSchema } from "./ResultSchema"

describe("ResultSchema", () => {
  it("should validate an ok result", () => {
    const schema = ResultSchema(z.string(), z.string())
    const result = schema.safeParse({ ok: true, val: "success" })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ ok: true, val: "success" })
    }
  })

  it("should validate an error result", () => {
    const schema = ResultSchema(z.string(), z.string())
    const result = schema.safeParse({ ok: false, err: "error" })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ ok: false, err: "error" })
    }
  })

  it("should reject invalid structures", () => {
    const schema = ResultSchema(z.string(), z.string())
    const result = schema.safeParse({ ok: true, err: "error" })

    expect(result.success).toBe(false)
  })

  it("should work with different data and error types", () => {
    const schema = ResultSchema(
      z.object({ id: z.number(), name: z.string() }),
      z.object({ code: z.number(), message: z.string() })
    )

    const okResult = schema.safeParse({
      ok: true,
      val: { id: 1, name: "Alice" }
    })
    expect(okResult.success).toBe(true)

    const errResult = schema.safeParse({
      ok: false,
      err: { code: 500, message: "Server error" }
    })
    expect(errResult.success).toBe(true)
  })

  it("should enforce correct types for both branches", () => {
    const schema = ResultSchema(z.number(), z.string())

    // Wrong type for val
    const wrongVal = schema.safeParse({ ok: true, val: "not a number" })
    expect(wrongVal.success).toBe(false)

    // Wrong type for err
    const wrongErr = schema.safeParse({ ok: false, err: 123 })
    expect(wrongErr.success).toBe(false)
  })

  it("should work with nullable and optional types", () => {
    const schema = ResultSchema(
      z.string().nullable(),
      z.string().optional()
    )

    const nullVal = schema.safeParse({ ok: true, val: null })
    expect(nullVal.success).toBe(true)

    const undefinedErr = schema.safeParse({ ok: false, err: undefined })
    expect(undefinedErr.success).toBe(true)
  })

  it("should work with union types", () => {
    const schema = ResultSchema(
      z.union([z.string(), z.number()]),
      z.union([z.string(), z.object({ code: z.number() })])
    )

    const stringVal = schema.safeParse({ ok: true, val: "test" })
    expect(stringVal.success).toBe(true)

    const numberVal = schema.safeParse({ ok: true, val: 42 })
    expect(numberVal.success).toBe(true)

    const stringErr = schema.safeParse({ ok: false, err: "error" })
    expect(stringErr.success).toBe(true)

    const objectErr = schema.safeParse({ ok: false, err: { code: 404 } })
    expect(objectErr.success).toBe(true)
  })

  it("should type narrow correctly based on ok field", () => {
    const schema = ResultSchema(z.string(), z.number())
    const okResult = schema.parse({ ok: true, val: "success" })
    const errResult = schema.parse({ ok: false, err: 404 })

    if (okResult.ok) {
      // TypeScript should know val is a string here
      expect(typeof okResult.val).toBe("string")
    }

    if (!errResult.ok) {
      // TypeScript should know err is a number here
      expect(typeof errResult.err).toBe("number")
    }
  })
})

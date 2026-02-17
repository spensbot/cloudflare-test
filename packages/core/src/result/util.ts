import z from "zod"
import { Err, Ok, rThen } from "./Result"
import type { Result } from "./Result"
import fetch from "cross-fetch"

export interface BaseError {
  message: string
  originalError?: any
}

export function errorUnionSchema<Code extends string>(code: Code) {
  return z.object({
    code: z.literal(code),
    message: z.string(),
  })
}

export const JsonParseErrorSchema = errorUnionSchema("jsonParseError")
export type JsonParseError = z.infer<typeof JsonParseErrorSchema>

export function rJsonParse<T>(
  json: string,
): Result<T, JsonParseError> {
  try {
    const parsed = JSON.parse(json)
    return parsed
  } catch (error) {
    return Err({
      code: "jsonParseError",
      message: `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)
        }`,
    })
  }
}

export const JsonStringifyErrorSchema = errorUnionSchema("jsonStringifyError")
export type JsonStringifyError = z.infer<typeof JsonStringifyErrorSchema>

export function rJsonStringify(
  data: unknown,
): Result<string, JsonStringifyError> {
  try {
    const json = JSON.stringify(data)
    return Ok(json)
  } catch (error) {
    return Err({
      code: "jsonStringifyError",
      message: `Failed to stringify JSON: ${error instanceof Error ? error.message : String(error)
        }`,
    })
  }
}

export function safeJsonStringify(data: unknown): string {
  const result = rJsonStringify(data)
  if (result.ok) {
    return result.val
  } else {
    return JSON.stringify(result.err)
  }
}

export const SchemaValidationErrorSchema = errorUnionSchema(
  "schemaValidationError",
)
export type SchemaValidationError = z.infer<typeof SchemaValidationErrorSchema>

export function rSchemaParse<T>(
  data: unknown,
  schema: z.ZodType<T, unknown>,
): Result<T, SchemaValidationError> {
  const parseResult = schema.safeParse(data)
  if (parseResult.success) {
    return Ok(parseResult.data)
  } else {
    return Err({
      code: "schemaValidationError",
      message: "Schema validation failed: " + parseResult.error.message,
    })
  }
}

export function rParse<T>(
  json: string,
  schema: z.ZodType<T, unknown>,
): Result<T, JsonParseError | SchemaValidationError> {
  const parsedResult = rJsonParse<any>(json)
  if (!parsedResult.ok) {
    return parsedResult
  }
  return rSchemaParse(schema, parsedResult.val)
}

export const HttpErrorSchema = errorUnionSchema("httpError")
export type HttpError = z.infer<typeof HttpErrorSchema>

export const FetchErrorSchema = errorUnionSchema("fetchError")
export type FetchError = z.infer<typeof FetchErrorSchema>

export async function rFetch(
  url: string,
): Promise<Result<string, FetchError | HttpError>> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return Err({
        code: "httpError",
        message: `HTTP error ${response.status}: ${response.statusText}`,
      })
    }
    return Ok(await response.text())
  } catch (error) {
    return Err({
      code: "fetchError",
      message: `Fetch failed: ${error instanceof Error ? error.message : String(error)
        }`,
    })
  }
}

export async function rFetchObject<T>(
  url: string,
  schema: z.ZodType<T, unknown>,
): Promise<
  Result<T, FetchError | HttpError | JsonParseError | SchemaValidationError>
> {
  const fetchResult = await rFetch(url)
  return rThen(fetchResult, (body) => rParse<T>(body, schema))
}

import {
  errorUnionSchema,
  FetchErrorSchema,
  HttpErrorSchema,
  JsonParseErrorSchema,
  JsonStringifyErrorSchema,
  SchemaValidationErrorSchema,
} from "../result/util"
import { z } from "zod"

const UnexpectedThrownErrorSchema = errorUnionSchema("unexpectedThrownError")
type UnexpectedThrownError = z.infer<typeof UnexpectedThrownErrorSchema>

export function newUnexpectedThrownError(
  error: unknown,
): UnexpectedThrownError {
  return {
    code: "unexpectedThrownError",
    message: `An unexpected error was thrown: ${error instanceof Error ? error.message : String(error)
      }`,
  }
}

export const RpcErrorSchema = z.union([
  JsonStringifyErrorSchema,
  SchemaValidationErrorSchema,
  FetchErrorSchema,
  HttpErrorSchema,
  JsonParseErrorSchema,
  UnexpectedThrownErrorSchema,
])
export type RpcError = z.infer<typeof RpcErrorSchema>

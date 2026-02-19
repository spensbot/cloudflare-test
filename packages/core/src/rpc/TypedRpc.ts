import { z } from "zod"
import { Err } from "../result/Result"
import type { Result } from "../result/Result"
import { ResultSchema } from '../result/ResultSchema'
import {
  JsonParseError,
  rFetch,
  rJsonStringify,
  rParse,
  safeJsonStringify,
  SchemaValidationError,
} from "../result/util"
import { newUnexpectedThrownError, RpcErrorSchema } from "./RpcError"
import type { RpcError } from "./RpcError"

/** Create type-safe, non-throwing methods for calling and executing a Remote Procedure Call */
export class TypedRpc<
  Input,
  Output,
  Error,
  InputSchema extends z.ZodType<Input, unknown>,
  OutputSchema extends z.ZodType<Output, unknown>,
> {
  constructor(
    readonly path: string,
    readonly inputSchema: InputSchema,
    readonly outputSchema: OutputSchema,
  ) { }

  /** Execute the RPC
   * - Parses and validates the input
   * - Calls `cb()` with the validated input
   * - Serializes & returns the ouput
   *
   * DOES NOT THROW. Any internal errors will be captured in the stringified result.
   */
  async execute(
    requestBody: string,
    cb: (input: Input) => Promise<Result<Output, Error>>,
  ): Promise<string> {
    const output = await this.executeTyped(requestBody, cb)
    return safeJsonStringify(output)
  }

  /** DOES NOT THROW */
  private async executeTyped(
    requestBody: string,
    cb: (input: Input) => Promise<Result<Output, Error>>,
  ): Promise<Result<Output, Error | RpcError>> {
    const input = rParse<Input>(requestBody, this.inputSchema)
    if (!input.ok) return input

    try {
      const output = await cb(input.val)
      return output
    } catch (error) {
      return Err(newUnexpectedThrownError(error))
    }
  }

  /** Calls the RPC
   * - Serializes & validates the input
   * - Calls the remote function endpoint
   * - Parses & validates the output
   *
   * DOES NOT THROW. Any internal errors will be captured in the stringified result.
   */
  async call(
    fetchFn: typeof fetch,
    urlBase: string,
    input: Input,
  ): Promise<Result<Output, RpcError>> {
    const url = `${urlBase}${this.path}`

    const body = rJsonStringify(input)
    if (!body.ok) return body

    const fetchResult = await rFetch(fetchFn, url, body.val)
    if (!fetchResult.ok) return fetchResult

    // TODO(spenser): Why is this coming across as a json serialized string!?
    const json = JSON.parse(fetchResult.val) as string

    const schema = ResultSchema(this.outputSchema, RpcErrorSchema)

    const parseResult = rParse(json, schema) as Result<Result<Output, RpcError>, JsonParseError | SchemaValidationError>

    const finalResult = flatten(parseResult) as Result<Output, RpcError>

    return finalResult
  }
}

function flatten<T, E1, E2>(nestedResult: Result<Result<T, E1>, E2>): Result<T, E1 | E2> {
  if (!nestedResult.ok) {
    return nestedResult
  }
  return nestedResult.val
}
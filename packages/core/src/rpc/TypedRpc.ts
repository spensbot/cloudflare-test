import { z } from "zod"
import { Err } from "../result/Result"
import type { Result } from "../result/Result"
import { ResultSchema } from '../result/ResultSchema'
import {
  rFetch,
  rJsonStringify,
  rParse,
  safeJsonStringify,
} from "../result/util"
import { newUnexpectedThrownError, RpcErrorSchema } from "./RpcError"
import type { RpcError } from "./RpcError"
import { Log } from "../log"

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
    private inputSchema: InputSchema,
    private outputSchema: OutputSchema,
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
    Log.debug("RPC raw input", requestBody)
    if (!input.ok) return input

    Log.debug("RPC input", input.val)

    try {
      const output = await cb(input.val)
      Log.debug("RPC output", output)
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
    urlBase: string,
    input: Input,
  ): Promise<Result<Output, Error | RpcError>> {
    const inputJson = rJsonStringify(input)
    console.log("inputJson", inputJson)
    if (!inputJson.ok) return inputJson

    const fetchResult = await rFetch(`${urlBase}${this.path}`, inputJson.val)
    console.log("fetchResult", fetchResult)
    if (!fetchResult.ok) return fetchResult

    const resultSchema = ResultSchema(this.outputSchema, RpcErrorSchema)

    const output = rParse<Result<Output, Error | RpcError>>(fetchResult.val, resultSchema)

    console.log("output", output)

    if (!output.ok) return output

    const output2 = output.val

    console.log("output2", output2)
    return output2
  }
}

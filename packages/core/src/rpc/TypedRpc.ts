import { z } from "zod"
import { Err } from "../result/Result"
import type { Result } from "../result/Result"
import {
  rJsonStringify,
  rParse,
  rSchemaParse,
  safeJsonStringify,
} from "../result/util"
import { newUnexpectedThrownError } from "./RpcError"
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
  // async call(
  //   urlBase: string,
  //   input: Input,
  // ): Promise<Result<Output, Error | RpcError>> {
  //   const inputJson = rJsonStringify(input);
  //   if (!inputJson.ok) return inputJson;

  //   const fetchResult = await rFetch(`${urlBase}${this.urlPath}`);
  //   if (!fetchResult.ok) return fetchResult;

  //   const output = rParse<Output>(fetchResult.val, this.outputSchema);
  //   return output;
  // }

  /** Calls the RPC
   * - Serializes & validates the input
   * - Calls the remote function endpoint
   * - Parses & validates the output
   *
   * DOES NOT THROW. Any internal errors will be captured in the stringified result.
   */
  async callData(
    input: Input,
    cb: (inputJson: string) => Promise<unknown>,
  ): Promise<Result<Output, Error | RpcError>> {
    const inputJson = rJsonStringify(input)
    if (!inputJson.ok) return inputJson

    try {
      const response = await cb(inputJson.val)

      console.log("response", response)

      const output = rSchemaParse<Output>(response, this.outputSchema)
      return output
    } catch (error) {
      return Err(newUnexpectedThrownError(error))
    }
  }
}

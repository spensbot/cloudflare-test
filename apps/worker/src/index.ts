import { Result, TypedRpc } from '@repo/core'
import { Context, Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// Add CORS middleware
app.use('/*', cors({
  origin: '*', // Configure this based on your needs
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

app.post('/api/greet', async (c) => {
  const { GreetRpc } = await import('@repo/shared')
  return executeRpcHono(c, GreetRpc, async (input) => {
    const message = `Hello, ${input.name}!`
    return { ok: true, val: { message } }
  })
})

export default app

/** A convenience function for executing RPCs in a Hono context */
async function executeRpcHono<Input, Output, Error>(
  c: Context,
  rpc: TypedRpc<Input, Output, Error>,
  cb: (input: Input) => Promise<Result<Output, any>>
): Promise<Response> {
  const body = await c.req.text()
  const response = await rpc.execute(body, cb)
  return c.body(response)
}
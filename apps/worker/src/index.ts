import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { GreetRpc } from '@repo/shared'

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

app.get('/', (c) => {
  console.log("Received request for /")
  return c.text('Hello, Hono!')
})

app.post('/api/greet', async (c) => {
  const body = await c.req.text()
  console.log("body text", body)

  const response = await GreetRpc.execute(body, async (input) => {
    const message = `Hello, ${input.name}!`
    return { ok: true, val: { message } }
  })

  console.log("RPC response", response)

  return c.json(response)
})

export default app

export interface Env {
  ENVIRONMENT: "development" | "staging" | "production"
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env)
  },
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return handleCORS(env)
  }

  // Route to appropriate RPC handler
  if (url.pathname === "/api/hello-world" && request.method === "POST") {
    return handleHelloWorld(request, env)
  }

  // 404 for unknown routes
  return new Response("Not Found", { status: 404 })
}

async function handleHelloWorld(
  request: Request,
  env: Env
): Promise<Response> {
  const { HelloWorldRpc } = await import("@repo/shared")
  const { Ok } = await import("@repo/core")

  try {
    const body = await request.text()

    const resultString = await HelloWorldRpc.execute(body, async (validInput) => {
      return Ok({
        message: `Hello, ${validInput.name}! (from ${env.ENVIRONMENT})`,
      })
    })

    return corsResponse(resultString, env, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return corsResponse(
      JSON.stringify({ error: "Internal server error" }),
      env,
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

function handleCORS(env: Env): Response {
  return corsResponse("", env, {
    status: 204,
  })
}

function corsResponse(
  body: string,
  env: Env,
  init?: ResponseInit
): Response {
  const headers = new Headers(init?.headers)

  // Environment-aware CORS
  // In development, allow localhost origins
  // In staging/production, allow specific origins (configure as needed)
  if (env.ENVIRONMENT === "development") {
    headers.set("Access-Control-Allow-Origin", "*")
  } {
    // TODO: Replace with your actual production domain
    headers.set("Access-Control-Allow-Origin", "https://example.com")
  }

  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  headers.set("Access-Control-Allow-Headers", "Content-Type")

  return new Response(body, { ...init, headers })
}

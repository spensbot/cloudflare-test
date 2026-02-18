import { useState } from "react"
import { GreetRpc } from "@repo/shared"

function App() {
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    // Get worker URL from environment variable or default to local dev
    const workerUrl = import.meta.env.VITE_WORKER_URL || "http://localhost:8787"

    const result = await GreetRpc.call(workerUrl, { name })

    console.log("RPC Result:", result)

    setLoading(false)

    if (result.ok) {
      setMessage(result.val.message)
    } else {
      console.log("err", result)
      setError(`Error: ${JSON.stringify(result.err)}`)
    }
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Cloudflare Pages + Workers Demo</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="name">Your name: </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            style={{ padding: "0.5rem", marginLeft: "0.5rem" }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !name}
          style={{ padding: "0.5rem 1rem" }}
        >
          {loading ? "Loading..." : "Say Hello"}
        </button>
      </form>
      {message && (
        <div style={{ marginTop: "1rem", color: "green" }}>{message}</div>
      )}
      {error && <div style={{ marginTop: "1rem", color: "red" }}>{error}</div>}
    </div>
  )
}

export default App

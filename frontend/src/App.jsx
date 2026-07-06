import { useState } from 'react'

function App() {
  const [description, setDescription] = useState(
    `Epic EHR
Azure OpenAI
Azure Blob Storage
Microsoft Entra ID
Azure API Management
Azure Key Vault
Microsoft Sentinel

Doctors submit patient notes to Azure OpenAI to generate visit summaries.
Summaries are stored in Blob Storage and then written back to Epic.`
  )
  const [detectedComponents, setDetectedComponents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleAnalyze() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('http://127.0.0.1:8000/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      if (!response.ok) throw new Error('Request failed')
      const data = await response.json()
      setDetectedComponents(data.detected_components)
    } catch (err) {
      setError('Could not reach the backend. Is it running on port 8000?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1 text-teal-400">
          Healthcare AI Architecture Reviewer
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Step 1: Describe the architecture
        </p>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <label className="text-xs text-slate-400 block mb-2">
            Architecture description
          </label>
          <textarea
            className="w-full min-h-[180px] bg-slate-900 border border-slate-700 rounded-md p-3 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal-400"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex justify-between items-center mt-4">
            <span className="text-xs text-slate-500">
              Detection is keyword-based against a fixed component library.
            </span>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="bg-teal-400 hover:bg-teal-300 text-slate-900 font-semibold text-sm px-4 py-2 rounded-md disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Analyze Architecture →'}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm mt-4">{error}</p>
        )}

        {detectedComponents.length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-slate-400 mb-2">
              DETECTED COMPONENTS ({detectedComponents.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {detectedComponents.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono text-slate-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  {c.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
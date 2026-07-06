import { useState } from 'react'

// Maps each component category to a color, used for the diagram's trust-boundary coding.
const CATEGORY_COLORS = {
  ehr_system: '#4C8DD9',      // internal network - blue
  ai_service: '#E0A458',      // AI service - amber
  storage: '#3FBFAD',         // azure tenant - teal
  database: '#3FBFAD',
  compute: '#3FBFAD',
  identity: '#3FBFAD',
  gateway: '#3FBFAD',
  secrets: '#3FBFAD',
  monitoring: '#3FBFAD',
}

function App() {
  const [step, setStep] = useState('input') // 'input' | 'diagram'
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
      setStep('diagram') // move to diagram screen once analysis completes
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

        {/* Simple step tabs */}
        <div className="flex gap-2 mb-6 mt-3">
          <button
            onClick={() => setStep('input')}
            className={`text-xs px-3 py-1.5 rounded-md border ${
              step === 'input'
                ? 'border-teal-400 text-teal-400 bg-slate-800'
                : 'border-slate-700 text-slate-400'
            }`}
          >
            01 Input
          </button>
          <button
            onClick={() => detectedComponents.length > 0 && setStep('diagram')}
            disabled={detectedComponents.length === 0}
            className={`text-xs px-3 py-1.5 rounded-md border disabled:opacity-40 ${
              step === 'diagram'
                ? 'border-teal-400 text-teal-400 bg-slate-800'
                : 'border-slate-700 text-slate-400'
            }`}
          >
            02 Architecture Map
          </button>
        </div>

        {step === 'input' && (
          <>
            <p className="text-slate-400 text-sm mb-6">Step 1: Describe the architecture</p>
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

            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

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
          </>
        )}

        {step === 'diagram' && (
          <>
            <p className="text-slate-400 text-sm mb-6">
              Step 2: Architecture map & trust boundaries
            </p>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              {/* Legend */}
              <div className="flex gap-6 mb-6 flex-wrap text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#4C8DD9' }}></span>
                  EHR / Internal system
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#E0A458' }}></span>
                  AI service
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3FBFAD' }}></span>
                  Azure infrastructure
                </div>
              </div>

              {/* Simple vertical flow diagram */}
              <div className="flex flex-col items-start gap-3">
                {detectedComponents.map((c, index) => (
                  <div key={c.id} className="flex items-center gap-3 w-full">
                    <div
                      className="rounded-md px-4 py-3 text-sm font-semibold text-slate-900 min-w-[220px]"
                      style={{ backgroundColor: CATEGORY_COLORS[c.category] || '#8FA0B5' }}
                    >
                      {c.name}
                      <div className="text-[10px] font-mono font-normal opacity-70">
                        {c.category}
                      </div>
                    </div>
                    {index < detectedComponents.length - 1 && (
                      <span className="text-slate-500 text-lg">↓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App
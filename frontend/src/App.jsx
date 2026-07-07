import { useState } from 'react'

const CATEGORY_COLORS = {
  ehr_system: '#4C8DD9',
  ai_service: '#E0A458',
  storage: '#3FBFAD',
  database: '#3FBFAD',
  compute: '#3FBFAD',
  identity: '#3FBFAD',
  gateway: '#3FBFAD',
  secrets: '#3FBFAD',
  monitoring: '#3FBFAD',
}

const STATUS_OPTIONS = ['missing', 'warning', 'pass']

function App() {
  const [step, setStep] = useState('input') // 'input' | 'diagram' | 'controls'
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
  const [controlsCatalog, setControlsCatalog] = useState({})
  // controlStatuses shape: { "component_id::control_id": "missing" | "warning" | "pass" }
  const [controlStatuses, setControlStatuses] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleAnalyze() {
    setLoading(true)
    setError(null)
    try {
      const detectResponse = await fetch('http://127.0.0.1:8000/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      if (!detectResponse.ok) throw new Error('Request failed')
      const detectData = await detectResponse.json()
      setDetectedComponents(detectData.detected_components)

      const controlsResponse = await fetch('http://127.0.0.1:8000/controls')
      if (!controlsResponse.ok) throw new Error('Request failed')
      const controlsData = await controlsResponse.json()
      setControlsCatalog(controlsData)

      setStep('diagram')
    } catch (err) {
      setError('Could not reach the backend. Is it running on port 8000?')
    } finally {
      setLoading(false)
    }
  }

  function setStatus(componentId, controlId, status) {
    setControlStatuses((prev) => ({
      ...prev,
      [`${componentId}::${controlId}`]: status,
    }))
  }

  function getStatus(componentId, controlId) {
    return controlStatuses[`${componentId}::${controlId}`] || 'pass'
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1 text-teal-400">
          Healthcare AI Architecture Reviewer
        </h1>

        <div className="flex gap-2 mb-6 mt-3">
          {['input', 'diagram', 'controls'].map((s, i) => (
            <button
              key={s}
              onClick={() => detectedComponents.length > 0 && setStep(s)}
              disabled={detectedComponents.length === 0 && s !== 'input'}
              className={`text-xs px-3 py-1.5 rounded-md border disabled:opacity-40 ${
                step === s
                  ? 'border-teal-400 text-teal-400 bg-slate-800'
                  : 'border-slate-700 text-slate-400'
              }`}
            >
              {['01 Input', '02 Architecture Map', '03 Control Review'][i]}
            </button>
          ))}
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
          </>
        )}

        {step === 'diagram' && (
          <>
            <p className="text-slate-400 text-sm mb-6">
              Step 2: Architecture map & trust boundaries
            </p>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
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
              <button
                onClick={() => setStep('controls')}
                className="mt-6 bg-teal-400 hover:bg-teal-300 text-slate-900 font-semibold text-sm px-4 py-2 rounded-md"
              >
                Continue to Control Review →
              </button>
            </div>
          </>
        )}

        {step === 'controls' && (
          <>
            <p className="text-slate-400 text-sm mb-6">
              Step 3: Control review — mark each control's status
            </p>
            {detectedComponents.map((component) => {
              const controlsForComponent = controlsCatalog[component.id]
              if (!controlsForComponent) return null

              return (
                <div
                  key={component.id}
                  className="bg-slate-800 border border-slate-700 rounded-lg mb-4 overflow-hidden"
                >
                  <div className="px-4 py-3 bg-slate-700/40 border-b border-slate-700">
                    <span className="text-xs font-mono font-semibold">
                      {component.name.toUpperCase()}
                    </span>
                  </div>
                  {controlsForComponent.map((control) => {
                    const status = getStatus(component.id, control.id)
                    return (
                      <div
                        key={control.id}
                        className="flex justify-between items-center px-4 py-3 border-b border-slate-700/50 last:border-b-0"
                      >
                        <span className="text-sm">{control.name}</span>
                        <div className="flex gap-1 bg-slate-900 border border-slate-700 rounded-md p-0.5">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => setStatus(component.id, control.id, opt)}
                              className={`text-[10px] font-mono px-2.5 py-1 rounded ${
                                status === opt
                                  ? opt === 'missing'
                                    ? 'bg-red-500/20 text-red-400'
                                    : opt === 'warning'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-green-500/20 text-green-400'
                                  : 'text-slate-500'
                              }`}
                            >
                              {opt.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

export default App
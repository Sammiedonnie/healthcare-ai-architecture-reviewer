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

const SEVERITY_STYLES = {
  critical: 'border-red-500 bg-red-500/10 text-red-400',
  high: 'border-orange-400 bg-orange-400/10 text-orange-400',
  medium: 'border-yellow-400 bg-yellow-400/10 text-yellow-400',
  low: 'border-green-400 bg-green-400/10 text-green-400',
}

function App() {
  const [step, setStep] = useState('input') // 'input' | 'diagram' | 'controls' | 'findings' | 'dashboard'
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
  const [controlStatuses, setControlStatuses] = useState({})
  const [findings, setFindings] = useState([])
  const [riskScore, setRiskScore] = useState(0)
  const [riskLevel, setRiskLevel] = useState('Minimal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleAnalyze() {
    setLoading(true)
    setError(null)
    try {
      const detectResponse = await fetch(`${import.meta.env.VITE_API_URL}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      if (!detectResponse.ok) throw new Error('Request failed')
      const detectData = await detectResponse.json()
      setDetectedComponents(detectData.detected_components)

      const controlsResponse = await fetch(`${import.meta.env.VITE_API_URL}/controls`)
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

  async function handleGenerateFindings() {
    setLoading(true)
    setError(null)
    try {
      const componentControls = []
      for (const key in controlStatuses) {
        const [componentId, controlId] = key.split('::')
        componentControls.push({
          component_id: componentId,
          control_id: controlId,
          status: controlStatuses[key],
        })
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ component_controls: componentControls }),
      })
      if (!response.ok) throw new Error('Request failed')
      const data = await response.json()
      setFindings(data.findings)
      setRiskScore(data.risk_score)
      setRiskLevel(data.risk_level)
      setStep('findings')
    } catch (err) {
      setError('Could not reach the backend. Is it running on port 8000?')
    } finally {
      setLoading(false)
    }
  }

  async function handleExportFindings(format) {
  try {
    const payload = {
      findings: findings,
      total_findings: findings.length,
      risk_score: riskScore,
      risk_level: riskLevel
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL}/export?format=${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error('Export failed')

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `findings.${format}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    setError('Export failed. Is the backend running on port 8000?')
  }
}

  const tabs = ['input', 'diagram', 'controls', 'findings', 'dashboard']
  const tabLabels = ['01 Input', '02 Architecture Map', '03 Control Review', '04 Findings', '05 Dashboard']

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1 text-teal-400">
          Healthcare AI Architecture Reviewer
        </h1>

        <div className="flex gap-2 mb-6 mt-3 flex-wrap">
          {tabs.map((s, i) => (
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
              {tabLabels[i]}
            </button>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {step === 'input' && (
          <>
            <p className="text-slate-400 text-sm mb-6">Step 1: Describe the architecture</p>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <label className="text-xs text-slate-400 block mb-2">Architecture description</label>
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
          </>
        )}

        {step === 'diagram' && (
          <>
            <p className="text-slate-400 text-sm mb-6">Step 2: Architecture map & trust boundaries</p>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div className="flex flex-col items-start gap-3">
                {detectedComponents.map((c, index) => (
                  <div key={c.id} className="flex items-center gap-3 w-full">
                    <div
                      className="rounded-md px-4 py-3 text-sm font-semibold text-slate-900 min-w-[220px]"
                      style={{ backgroundColor: CATEGORY_COLORS[c.category] || '#8FA0B5' }}
                    >
                      {c.name}
                      <div className="text-[10px] font-mono font-normal opacity-70">{c.category}</div>
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
            <p className="text-slate-400 text-sm mb-6">Step 3: Control review — mark each control's status</p>
            {detectedComponents.map((component) => {
              const controlsForComponent = controlsCatalog[component.id]
              if (!controlsForComponent) return null
              return (
                <div key={component.id} className="bg-slate-800 border border-slate-700 rounded-lg mb-4 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-700/40 border-b border-slate-700">
                    <span className="text-xs font-mono font-semibold">{component.name.toUpperCase()}</span>
                  </div>
                  {controlsForComponent.map((control) => {
                    const status = getStatus(component.id, control.id)
                    return (
                      <div key={control.id} className="flex justify-between items-center px-4 py-3 border-b border-slate-700/50 last:border-b-0">
                        <span className="text-sm">{control.name}</span>
                        <div className="flex gap-1 bg-slate-900 border border-slate-700 rounded-md p-0.5">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => setStatus(component.id, control.id, opt)}
                              className={`text-[10px] font-mono px-2.5 py-1 rounded ${
                                status === opt
                                  ? opt === 'missing' ? 'bg-red-500/20 text-red-400'
                                  : opt === 'warning' ? 'bg-yellow-500/20 text-yellow-400'
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
            <button
              onClick={handleGenerateFindings}
              disabled={loading}
              className="bg-teal-400 hover:bg-teal-300 text-slate-900 font-semibold text-sm px-4 py-2 rounded-md disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Findings →'}
            </button>
          </>
        )}

        {step === 'findings' && (
          <>
            <p className="text-slate-400 text-sm mb-6">Step 4: Findings ({findings.length})</p>
            <div className="flex gap-3 mb-6">
  <button
    onClick={() => handleExportFindings('json')}
    className="bg-slate-700 hover:bg-slate-600 text-sm px-4 py-2 rounded-lg"
  >
    Export JSON
  </button>
  <button
    onClick={() => handleExportFindings('csv')}
    className="bg-slate-700 hover:bg-slate-600 text-sm px-4 py-2 rounded-lg"
  >
    Export CSV
  </button>
</div>
            {findings.length === 0 && (
              <p className="text-slate-500 text-sm">No findings — all reviewed controls passed.</p>
            )}
            {findings.map((f) => (
              <div key={f.finding_id} className={`border-l-4 rounded-lg mb-4 p-4 bg-slate-800 border border-slate-700 ${SEVERITY_STYLES[f.severity]?.split(' ')[0] || ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-[10px] font-mono text-slate-500">{f.finding_id}</div>
                    <div className="text-sm font-semibold mt-1">{f.control_name} — {f.component}</div>
                  </div>
                  <span className={`text-[10px] font-mono font-semibold px-2 py-1 rounded ${SEVERITY_STYLES[f.severity] || ''}`}>
                    {f.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">{f.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {f.framework_mapping.hipaa && (
                    <span className="text-[10px] font-mono bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-400">HIPAA {f.framework_mapping.hipaa}</span>
                  )}
                  {f.framework_mapping.nist_800_53 && (
                    <span className="text-[10px] font-mono bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-400">NIST 800-53 {f.framework_mapping.nist_800_53.join(', ')}</span>
                  )}
                  {f.framework_mapping.owasp_llm_top10 && f.framework_mapping.owasp_llm_top10 !== 'N/A' && (
                    <span className="text-[10px] font-mono bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-400">{f.framework_mapping.owasp_llm_top10}</span>
                  )}
                  {f.framework_mapping.nist_ai_rmf && (
                    <span className="text-[10px] font-mono bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-400">AI RMF {f.framework_mapping.nist_ai_rmf}</span>
                  )}
                  {f.framework_mapping.mitre_attack && (
                    <span className="text-[10px] font-mono bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-400">{f.framework_mapping.mitre_attack}</span>
                  )}
                  {f.framework_mapping.mitre_atlas && f.framework_mapping.mitre_atlas !== 'N/A' && (
                    <span className="text-[10px] font-mono bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-400">{f.framework_mapping.mitre_atlas}</span>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={() => setStep('dashboard')}
              className="bg-teal-400 hover:bg-teal-300 text-slate-900 font-semibold text-sm px-4 py-2 rounded-md"
            >
              View Dashboard →
            </button>
          </>
        )}

        {step === 'dashboard' && (
          <>
            <p className="text-slate-400 text-sm mb-6">Step 5: Executive dashboard</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Risk Score</div>
                <div className="text-3xl font-bold mt-1 text-teal-400">{riskScore}/100</div>
                <div className="text-xs text-slate-500 mt-1">{riskLevel}</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Total Findings</div>
                <div className="text-3xl font-bold mt-1">{findings.length}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {findings.filter((f) => f.severity === 'critical').length} critical
                </div>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="text-[10px] font-mono text-slate-500 uppercase mb-3">Findings by severity</div>
              {['critical', 'high', 'medium', 'low'].map((sev) => {
                const count = findings.filter((f) => f.severity === sev).length
                return (
                  <div key={sev} className="flex justify-between items-center text-xs mb-2">
                    <span className="text-slate-400 capitalize">{sev}</span>
                    <span className="font-mono text-slate-300">{count}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App
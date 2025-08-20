import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE ||'https://ai-notes-summarizer-backend-n0ih.onrender.com'

// Notification component
const Notification = ({ message, type, show, onClose }: {
  message: string;
  type: 'success' | 'error' | 'info';
  show: boolean;
  onClose: () => void;
}) => {
  if (!show) return null;
  
  setTimeout(() => onClose(), 4000);
  
  return (
    <div className={`notification ${type} ${show ? 'show' : ''}`}>
      {message}
    </div>
  );
};

export default function App() {
  const [transcript, setTranscript] = useState('')
  const [instruction, setInstruction] = useState('Summarize in bullet points for executives and list action items at the end.')
  const [summary, setSummary] = useState('')
  const [edited, setEdited] = useState('')
  const [to, setTo] = useState('') // comma-separated
  const [subject, setSubject] = useState('Meeting Summary')
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState('')
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' as 'success' | 'error' | 'info' })
  const [dragOver, setDragOver] = useState(false)

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ show: true, message, type });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  const readTextFile = async (file: File) => {
    const text = await file.text()
    setTranscript(text)
    showNotification('File uploaded successfully! 📄', 'success')
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) readTextFile(f)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      readTextFile(files[0])
    }
  }

  const generateSummary = async () => {
    setGenerating(true)
    setStatus('🤖 Generating summary...')
    try {
      const res = await fetch(`${API_BASE}/api/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, instruction })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to summarize')
      }
      setSummary(data.summary)
      setEdited(data.summary)
      setStatus('✅ Summary ready! You can edit below.')
      showNotification('Summary generated successfully! ✨', 'success')
    } catch (e: any) {
      const errorMsg = e.message || 'Error while summarizing.'
      setStatus(`❌ ${errorMsg}`)
      showNotification(errorMsg, 'error')
    } finally {
      setGenerating(false)
    }
  }

  const sendEmail = async () => {
  setStatus('📧 Sending email...')
  try {
    const res = await fetch(`${API_BASE}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: to, summary: edited }) // <- keys must match backend
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Failed to send email')
    setStatus('✅ Email sent successfully!')
    showNotification('Email sent successfully! 📧', 'success')
  } catch (e: any) {
    const errorMsg = e.message || 'Error sending email.'
    setStatus(`❌ ${errorMsg}`)
    showNotification(errorMsg, 'error')
  }
}


  const createShare = async () => {
    setStatus('🔗 Creating shareable link...')
    try {
      const res = await fetch(`${API_BASE}/api/create-share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: edited })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create share link')
      }
      navigator.clipboard.writeText(data.url)
      setStatus(`✅ Share link created and copied!`)
      showNotification('Share link copied to clipboard! 🔗', 'success')
    } catch (e: any) {
      const errorMsg = e.message || 'Error creating share link.'
      setStatus(`❌ ${errorMsg}`)
      showNotification(errorMsg, 'error')
    }
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(edited)
    setStatus('✅ Copied to clipboard!')
    showNotification('Content copied to clipboard! 📋', 'success')
  }

  const downloadTxt = () => {
    const blob = new Blob([edited], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'summary.txt'
    a.click()
    URL.revokeObjectURL(url)
    showNotification('File downloaded successfully! 💾', 'success')
  }

  return (
    <>
      <Notification 
        message={notification.message} 
        type={notification.type} 
        show={notification.show} 
        onClose={hideNotification} 
      />
      <div className="container">
        <h1>🤖 AI Meeting Notes Summarizer</h1>
        <div className="help">
          <div className="tag">💡 Tip</div> 
          <span style={{marginLeft: '8px'}}>Upload your transcript, customize the instruction, then generate your summary!</span>
        </div>

        <div className="row">
          <label>📄 Upload Transcript</label>
          <div 
            className={`file-upload-area ${dragOver ? 'dragover' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div className="upload-icon">📁</div>
            <div className="upload-text">Drop your transcript file here or click to browse</div>
            <div className="upload-subtext">Supports .txt files</div>
            <input 
              type="file" 
              accept=".txt,text/plain" 
              onChange={onFileChange}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
            />
          </div>
          <label>✏️ Or paste your transcript below</label>
          <textarea 
            placeholder="Paste your meeting transcript here..." 
            value={transcript} 
            onChange={e => setTranscript(e.target.value)} 
          />
        </div>

        <div className="row">
          <label>🎯 AI Instruction</label>
          <input 
            type="text" 
            value={instruction} 
            onChange={e => setInstruction(e.target.value)} 
            placeholder='e.g., "Summarize in bullet points for executives and highlight key decisions"' 
          />
        </div>

        <div className="actions">
          <button 
            className={`primary ${generating ? 'generating' : ''}`} 
            onClick={generateSummary} 
            disabled={generating || transcript.trim().length < 10}
          >
            {generating ? (
              <>
                <span className="loading-spinner"></span>
                Generating...
              </>
            ) : (
              '✨ Generate Summary'
            )}
          </button>
          {status && <span className="status">{status}</span>}
        </div>

        {summary && (
          <div className="summary-section">
            <h2>📝 Your Summary</h2>
            <textarea 
              value={edited} 
              onChange={e => setEdited(e.target.value)}
              placeholder="Your generated summary will appear here. You can edit it as needed."
            />
            <div className="actions">
              <button onClick={copyToClipboard}>📋 Copy</button>
              <button onClick={downloadTxt}>💾 Download</button>
              <button className="secondary" onClick={createShare}>🔗 Share Link</button>
            </div>

            <div className="email-section">
              <h3>📧 Share via Email</h3>
              <div className="row grid-2">
                <div>
                  <label>👥 Recipients</label>
                  <input 
                    type="text" 
                    placeholder="alice@example.com, bob@company.com" 
                    value={to} 
                    onChange={e => setTo(e.target.value)} 
                  />
                  <div className="small" style={{marginTop: '4px', color: 'var(--text-muted)'}}>
                    Separate multiple emails with commas
                  </div>
                </div>
                <div>
                  <label>📋 Subject</label>
                  <input 
                    type="text" 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)} 
                  />
                </div>
              </div>
              <div className="actions">
                <button className="primary" onClick={sendEmail} disabled={!to.trim()}>
                  📧 Send Email
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

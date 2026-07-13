import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

export default function App() {
  // --- INGESTION STATES ---
  const [fileName, setFileName] = useState('network_config.py');
  const [rawCode, setRawCode] = useState(`def connect_to_server():\n    ip_address = "192.168.1.100"\n    port = 8080\n    return "Connected to cloud server"`);
  const [engineOutput, setEngineOutput] = useState<any>(null);
  const [loadingStore, setLoadingStore] = useState(false);

  // --- SEARCH STATES ---
  const [searchQuery, setSearchQuery] = useState('Explain how the system handles the server connection port setup.');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [frontendError, setFrontendError] = useState<any>(null);

  // --- LIVE CHAT STATES ---
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; parts: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  // --- NEW REPOSITORY CRAWLER STATES ---
  const [repoPath, setRepoPath] = useState('');
  const [scanOutput, setScanOutput] = useState<any>(null);
  const [loadingScan, setLoadingScan] = useState(false);

  // --- ACTIONS ---
  const triggerEngineAnalysis = async () => {
    setLoadingStore(true);
    setEngineOutput(null);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/analyze-code', {
        file_name: fileName,
        raw_code: rawCode
      });
      setEngineOutput(response.data);
    } catch (error: any) {
      console.error("Connection error:", error);
      setEngineOutput({ error: error.message, details: "Failed to communicate with backend." });
    } finally {
      setLoadingStore(false);
    }
  };

  const triggerSemanticSearch = async () => {
    setLoadingSearch(true);
    setSearchResults(null);
    setFrontendError(null);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/search-code', {
        query_text: searchQuery
      });
      setSearchResults(response.data);
    } catch (error: any) {
      console.error("Search error:", error);
      setFrontendError(error.response?.data || error.message);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user', parts: chatInput };
    setChatHistory((prev) => [...prev, userMessage]);
    const currentInput = chatInput;
    setChatInput('');
    setLoadingChat(true);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/chat-code', {
        history: chatHistory,
        new_message: currentInput
      });

      if (response.data.status === "chat_successful") {
        const aiMessage = { role: 'model', parts: response.data.reply };
        setChatHistory((prev) => [...prev, aiMessage]);
      } else {
        console.error("Backend Chat Error:", response.data.error);
      }
    } catch (error) {
      console.error("Network Chat Error:", error);
    } finally {
      setLoadingChat(false);
    }
  };

  const triggerRepositoryScan = async () => {
    if (!repoPath.trim()) return;
    setLoadingScan(true);
    setScanOutput(null);
    setFrontendError(null);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/scan-repository', {
        repo_path: repoPath
      });
      setScanOutput(response.data);
    } catch (error: any) {
      console.error("Repository scan error:", error);
      setFrontendError(error.response?.data || error.message);
    } finally {
      setLoadingScan(false);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      minHeight: '100vh', backgroundColor: '#0f172a', color: '#ffffff',
      fontFamily: 'sans-serif', padding: '5vw 4vw', boxSizing: 'border-box', width: '100%'
    }}>

      {/* CATCHY DESIGNER HEADER WITH LOGO */}
      <div style={{ textAlign: 'center', marginBottom: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        
        {/* Sleek Nexus Vector Logo */}
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <svg width="50" height="50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
              <filter id="neon">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <polygon points="50,5 90,27 90,73 50,95 10,73 10,27" stroke="url(#logoGlow)" strokeWidth="3" fill="none" opacity="0.3" />
            <path d="M30,35 L50,20 L70,35 L70,65 L50,80 L30,65 Z" stroke="url(#logoGlow)" strokeWidth="4" fill="none" filter="url(#neon)" />
            <circle cx="50" cy="50" r="6" fill="#22d3ee" filter="url(#neon)" />
            <circle cx="30" cy="35" r="4" fill="#818cf8" />
            <circle cx="70" cy="35" r="4" fill="#818cf8" />
            <circle cx="50" cy="20" r="4" fill="#22d3ee" />
          </svg>
        </div>

        <h1 style={{
          fontSize: 'clamp(24px, 6vw, 38px)',
          fontWeight: '800',
          letterSpacing: '-0.5px',
          background: 'linear-gradient(to right, #22d3ee, #818cf8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 6px 0',
          width: '100%'
        }}>
          Nexus_Code AI
        </h1>
        <p style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>
          Vector-Driven Cognitive Engine • Active
        </p>
      </div>

      {/* AUTOMATED CODEBASE CRAWLER PANEL */}
      <div style={{ width: '100%', maxWidth: '1200px', background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #4338ca', marginBottom: '25px', boxSizing: 'border-box', boxShadow: '0 4px 20px rgba(67, 56, 202, 0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <span style={{ backgroundColor: '#818cf8', color: '#0f172a', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px' }}>⚡</span>
          <h2 style={{ margin: 0, color: '#a5b4fc', fontSize: '16px', fontWeight: '600' }}>Enterprise Automated Repository Ingestion</h2>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', width: '100%' }}>
          <div style={{ flex: '1 1 280px', width: '100%' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#cbd5e1', fontSize: '13px', fontWeight: '500' }}>Target Local System Root Directory Path</label>
            <input
              type="text"
              placeholder="e.g. D:\My projects\Verisight 2"
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px', background: '#0f172a', border: '1px solid #4f46e5', borderRadius: '8px', color: '#fff', fontSize: '14px', fontFamily: 'monospace' }}
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
            />
          </div>
          <button
            onClick={triggerRepositoryScan}
            disabled={loadingScan}
            style={{
              flex: '1 1 auto', padding: '12px 25px', backgroundColor: '#6366f1',
              color: '#ffffff', border: 'none', borderRadius: '8px',
              fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
              whiteSpace: 'nowrap', transition: 'all 0.2s', minWidth: '140px'
            }}
          >
            {loadingScan ? 'Mapping Stack...' : 'Execute Repository Sync'}
          </button>
        </div>

        {scanOutput && (
          <div style={{ marginTop: '15px', padding: '12px', background: '#0f172a', borderRadius: '8px', border: scanOutput.status === 'scan_successful' ? '1px solid #10b981' : '1px solid #ef4444', wordBreak: 'break-all' }}>
            <div style={{ color: scanOutput.status === 'scan_successful' ? '#34d399' : '#f87171', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
              {scanOutput.status === 'scan_successful' ? '✓ SYSTEM DIRECTORY SYNCED SUCCESSFULLY' : '✗ REPOSITORY INGESTION FAILED'}
            </div>
            {scanOutput.metrics && (
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#94a3b8' }}>
                Discovered <strong style={{ color: '#22d3ee' }}>{scanOutput.metrics.total_files_found} files</strong> into <strong style={{ color: '#818cf8' }}>{scanOutput.metrics.total_vector_chunks_committed} memory chunks</strong>.
              </p>
            )}
            {scanOutput.indexed_files_manifest && (
              <div style={{ maxHeight: '100px', overflowY: 'auto', background: '#1e293b', padding: '10px', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                {scanOutput.indexed_files_manifest.map((f: string, i: number) => <div key={i}>📁 indexed: {f}</div>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* TWO COLUMN GATEWAY SYSTEM (Responsive Breakpoint Column Wrap) */}
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '25px', width: '100%', maxWidth: '1200px', boxSizing: 'border-box', marginBottom: '25px' }}>
        
        {/* LEFT COLUMN: INGEST ARCHITECTURE */}
        <div style={{ flex: '1 1 340px', background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', boxSizing: 'border-box', overflow: 'hidden', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <span style={{ backgroundColor: '#06b6d4', color: '#0f172a', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px' }}>01</span>
            <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>Ingest Codebase Asset</h2>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#cbd5e1', fontSize: '13px', fontWeight: '500' }}>Target Identifier (File Name)</label>
            <input
              type="text"
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', fontSize: '14px', fontFamily: 'monospace' }}
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#cbd5e1', fontSize: '13px', fontWeight: '500' }}>Source Token Matrix (Raw Code)</label>
            <textarea
              rows={8}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#38bdf8', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5', resize: 'vertical' }}
              value={rawCode}
              onChange={(e) => setRawCode(e.target.value)}
            />
          </div>

          <button
            onClick={triggerEngineAnalysis}
            disabled={loadingStore}
            style={{
              width: '100%', padding: '12px', backgroundColor: '#06b6d4',
              color: '#0f172a', border: 'none', borderRadius: '8px',
              fontWeight: 'bold', cursor: 'pointer', fontSize: '14px'
            }}
          >
            {loadingStore ? 'Analyzing Architecture...' : 'Commit to Vector Layer'}
          </button>

          {engineOutput && (
            <div style={{ marginTop: '15px', padding: '12px', background: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', maxWidth: '100%', overflowX: 'hidden' }}>
              <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px', color: '#34d399', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(engineOutput, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CONCEPT SCANNING */}
        <div style={{ flex: '1 1 340px', background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', boxSizing: 'border-box', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <span style={{ backgroundColor: '#10b981', color: '#0f172a', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px' }}>02</span>
            <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>Semantic Concept Mapping</h2>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#cbd5e1', fontSize: '13px', fontWeight: '500' }}>Natural Language Query Input</label>
            <input
              type="text"
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            onClick={triggerSemanticSearch}
            disabled={loadingSearch}
            style={{
              width: '100%', padding: '12px', backgroundColor: '#10b981',
              color: '#0f172a', border: 'none', borderRadius: '8px',
              fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
              marginBottom: '15px'
            }}
          >
            {loadingSearch ? 'Computing Distances...' : 'Execute Vector Scan'}
          </button>

          {searchResults && searchResults.status === "search_successful" && (
            <div style={{ padding: '12px', background: '#0f172a', borderRadius: '8px', border: '1px solid #065f46', maxWidth: '100%' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#a7f3d0', fontSize: '13px', fontWeight: '600', wordBreak: 'break-all' }}>
                Most Relevant File: <span style={{ color: '#38bdf8' }}>{searchResults.matched_file}</span>
              </h4>
              <pre style={{ margin: '0 0 12px 0', fontFamily: 'monospace', fontSize: '12px', color: '#e2e8f0', background: '#1e293b', padding: '10px', borderRadius: '6px', overflowX: 'auto', border: '1px solid #334155', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {searchResults.retrieved_code}
              </pre>
              {searchResults.ai_explanation && (
                <div style={{ background: '#022c22', borderLeft: '4px solid #10b981', padding: '12px', borderRadius: '6px' }}>
                  <h5 style={{ margin: '0 0 6px 0', color: '#34d399', fontSize: '12px', fontWeight: 'bold' }}>Gemini AI Insights:</h5>
                  <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
                    <ReactMarkdown>{searchResults.ai_explanation}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM SECTION: LIVE STREAMING INTERACTIVE CHAT */}
      <div style={{ width: '100%', maxWidth: '1200px', background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', boxSizing: 'border-box', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <span style={{ backgroundColor: '#22d3ee', color: '#0f172a', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px' }}>03</span>
          <h2 style={{ margin: 0, color: '#22d3ee', fontSize: '16px', fontWeight: '600' }}>Live Codebase Chat (Continuous Context Memory)</h2>
        </div>

        {/* Chat Log View */}
        <div style={{ height: '300px', overflowY: 'auto', background: '#0f172a', borderRadius: '8px', padding: '15px', marginBottom: '15px', border: '1px solid #475569' }}>
          {chatHistory.length === 0 && (
            <p style={{ color: '#64748b', textAlign: 'center', marginTop: '110px', fontSize: '13px', padding: '0 10px' }}>
              No messages yet. Ask a question here to start a continuous conversation about your codebase!
            </p>
          )}
          {chatHistory.map((msg, index) => (
            <div key={index} style={{ marginBottom: '15px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
              <div style={{
                display: 'inline-block',
                padding: '10px 14px',
                borderRadius: '12px',
                maxWidth: '90%',
                textAlign: 'left',
                lineHeight: '1.5',
                fontSize: '13px',
                backgroundColor: msg.role === 'user' ? '#0284c7' : '#1e293b',
                color: '#ffffff',
                border: msg.role === 'user' ? 'none' : '1px solid #334155',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <strong style={{ color: msg.role === 'user' ? '#bae6fd' : '#34d399', display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                  {msg.role === 'user' ? 'You' : 'Gemini 2.5'}
                </strong>
                <div style={{ color: '#edf2f7', wordBreak: 'break-word' }} className="chat-markdown-container">
                  <ReactMarkdown
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        return inline ? (
                          <code style={{ background: '#0f172a', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace' }} {...props}>
                            {children}
                          </code>
                        ) : (
                          <pre style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', overflowX: 'auto', border: '1px solid #334155', maxWidth: '100%' }}>
                            <code style={{ fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre' }} {...props}>
                              {children}
                            </code>
                          </pre>
                        );
                      }
                    }}
                  >
                    {msg.parts}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Form Input Bar */}
        <div style={{ display: 'flex', gap: '10px', flexDirection: 'row', width: '100%' }}>
          <input
            type="text"
            placeholder="Type a follow up question..."
            style={{ flex: 1, padding: '12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', fontSize: '14px', minWidth: '100px' }}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={loadingChat}
            style={{ padding: '0 20px', backgroundColor: '#22d3ee', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
          >
            {loadingChat ? '...' : 'Send'}
          </button>
        </div>
      </div>

      {/* ERROR CAPTURE SYSTEM */}
      {frontendError && (
        <div style={{ width: '100%', maxWidth: '1200px', marginTop: '15px', padding: '12px', background: '#451a03', borderRadius: '8px', border: '1px solid #9a3412', wordBreak: 'break-all' }}>
          <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px', color: '#fca5a5', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(frontendError, null, 2)}
          </pre>
        </div>
      )}

    </div>
  );
}
"use client";

import React, { useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function ExperianTraceUltra() {
  const [fileName, setFileName] = useState("Nahrajte .txt trace file");
  const editorRef = useRef<any>(null);

  // --- REKURZIVNÍ FORMÁTOVAČ S PODPOROU PRO VIDITELNÝ OUT ---
  const formatTraceLogic = () => {
    if (!editorRef.current) return;
    
    const model = editorRef.current.getModel();
    const lines = model.getLinesContent();
    let indentLevel = 0;
    const tab = "    "; 
    const newLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line === "") {
        newLines.push("");
        continue;
      }

      const isOut = line.match(/^OUT\s*:/i);
      const isIn = line.match(/^IN\s*:/i);
      const isValue = line.match(/^VALUE\s*:/i);

      // Pokud je to OUT, vracíme se o úroveň zpět PŘED vypsáním,
      // aby OUT lícovalo se svým IN
      if (isOut) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      let currentLineIndent = indentLevel;

      // VALUE je vždy o jeden tab hlouběji než aktuální úroveň
      if (isValue) {
        currentLineIndent += 1;
      }

      newLines.push(tab.repeat(currentLineIndent) + line);

      // Pokud je to IN, zvyšujeme úroveň pro obsah uvnitř
      if (isIn) {
        indentLevel++;
      }
    }
    editorRef.current.setValue(newLines.join('\n'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => editorRef.current?.setValue(ev.target?.result);
      reader.readAsText(file);
    }
  };

  const handleEditorWillMount = (monaco: any) => {
    monaco.languages.register({ id: 'pcsm-trace' });

    // CSS pro Breakpointy (červená kolečka)
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.innerHTML = `.myBreakpoint { background: #ff4444; border-radius: 50%; width: 12px!important; height: 12px!important; margin-left: 5px; }`;
      document.head.appendChild(style);
    }

    // 1. DEFINICE BAREV
    monaco.languages.setMonarchTokensProvider('pcsm-trace', {
      ignoreCase: true,
      tokenizer: {
        root: [
          [/IN\s*:/i, 'keyword'],
          [/OUT\s*:/i, 'keyword'],
          [/GETTING\s*:/i, 'comment'],
          [/SETTING\s*:/i, 'attribute'],
          [/VALUE\s*:/i, 'number'],
          [/'[^']*'/, 'string'],
        ]
      }
    });

    // 2. DEFINICE FOLDINGU (Sbalování)
    // Nastaveno tak, aby OUT: byl brán jako konec, ale zůstal viditelný
    monaco.languages.setLanguageConfiguration('pcsm-trace', {
      folding: {
        markers: {
          start: /^\s*IN\s*:/i,
          end: /^\s*OUT\s*:/i
        }
      }
    });

    // 3. TÉMA
    monaco.editor.defineTheme('traceTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'FF9D00', fontStyle: 'bold' }, 
        { token: 'comment', foreground: 'A78BFA' }, 
        { token: 'attribute', foreground: '38BDF8', fontStyle: 'bold' }, 
        { token: 'number', foreground: '34D399' }, 
        { token: 'string', foreground: 'FDE047' }, 
      ],
      colors: { 
        'editor.background': '#0F172A',
        'editorGutter.background': '#0F172A',
        'editor.glyphMarginBackground': '#1E293B',
        'editor.lineHighlightBackground': '#1E293B33',
      }
    });
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Obsluha klikání na breakpointy
    editor.onMouseDown((e: any) => {
      if (e.target.type === 2) { 
        const line = e.target.position.lineNumber;
        const decs = editor.getLineDecorations(line).filter((d: any) => d.options.glyphMarginClassName === 'myBreakpoint');
        if (decs.length > 0) {
          editor.deltaDecorations([decs[0].id], []);
        } else {
          editor.deltaDecorations([], [{
            range: new monaco.Range(line, 1, line, 1),
            options: { isWholeLine: true, glyphMarginClassName: 'myBreakpoint' }
          }]);
        }
      }
    });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      <header style={{ padding: '10px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Experian Trace Ultra-View 🔴</h1>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{fileName}</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="file" onChange={handleFileUpload} style={{ fontSize: '0.8rem' }} />
          <button 
            onClick={formatTraceLogic} 
            style={{ padding: '8px 15px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🪄 Re-Format & Structure
          </button>
        </div>
      </header>

      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          defaultLanguage="pcsm-trace"
          theme="traceTheme"
          onMount={handleEditorDidMount}
          beforeMount={handleEditorWillMount}
          options={{
            fontSize: 13,
            glyphMargin: true,
            folding: true,
            foldingHighlight: true,
            lineNumbers: 'on',
            minimap: { enabled: true },
            wordWrap: 'off',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            // Tato volba zajistí, že uvidíš šipky pro folding hned
            showFoldingControls: 'always'
          }}
        />
      </div>
    </div>
  );
}

"use client";

import React, { useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamický import editoru pro Next.js (SSR safe)
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function ExperianTraceUltra() {
  const [fileName, setFileName] = useState("Nahrajte .txt trace file");
  const editorRef = useRef<any>(null);

  // --- REKURZIVNÍ FORMÁTOVAČ ---
  // Vytváří odsazení tak, aby vnitřek byl vnořený a OUT zůstal viditelný pod IN
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

      // Pokud je to OUT, snižujeme úroveň PŘED vypsáním řádku
      if (isOut) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      let currentLineIndent = indentLevel;

      // VALUE odsazujeme o úroveň hlouběji než aktuální kontext
      if (isValue) {
        currentLineIndent += 1;
      }

      newLines.push(tab.repeat(currentLineIndent) + line);

      // Pokud je to IN, vše pod ním bude o úroveň hlouběji
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
      reader.onload = (ev) => {
        if (editorRef.current) {
          editorRef.current.setValue(ev.target?.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleEditorWillMount = (monaco: any) => {
    monaco.languages.register({ id: 'pcsm-trace' });

    // Injekce CSS pro breakpointy (červená kolečka)
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.innerHTML = `
        .myBreakpoint { 
          background: #ff4444; 
          border-radius: 50%; 
          width: 12px !important; 
          height: 12px !important; 
          margin-left: 5px; 
        }
      `;
      document.head.appendChild(style);
    }

    // Definice barev pro Trace
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

    // Definice tématu
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

    // Obsluha přidávání/debírání breakpointů
    editor.onMouseDown((e: any) => {
      // 2 = Glyph Margin (oblast pro zarážky)
      if (e.target.type === 2) { 
        const line = e.target.position.lineNumber;
        const currentDecorations = editor.getLineDecorations(line);
        const bpoints = currentDecorations.filter(
          (d: any) => d.options.glyphMarginClassName === 'myBreakpoint'
        );

        if (bpoints.length > 0) {
          editor.deltaDecorations([bpoints[0].id], []);
        } else {
          editor.deltaDecorations([], [{ 
            range: new monaco.Range(line, 1, line, 1), 
            options: { 
              isWholeLine: true, 
              glyphMarginClassName: 'myBreakpoint' 
            } 
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
          onMount={(editor, monaco) => handleEditorDidMount(editor, monaco)}
          beforeMount={handleEditorWillMount}
          options={{
            fontSize: 13,
            glyphMargin: true,
            folding: true,
            foldingStrategy: 'indentation', // Klíčové pro sbalování podle tabulátorů
            showFoldingControls: 'always',
            lineNumbers: 'on',
            minimap: { enabled: true },
            wordWrap: 'off',
            automaticLayout: true,
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
}

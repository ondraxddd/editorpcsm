"use client";

import React, { useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function ExperianTraceUltra() {
  const [fileName, setFileName] = useState("Nahrajte .txt trace file");
  const editorRef = useRef<any>(null);

  // --- REKURZIVNÍ FORMÁTOVAČ PRO SPECIFICKOU SYNTAX ---
  const formatTraceLogic = () => {
    if (!editorRef.current) return;
    
    const model = editorRef.current.getModel();
    const lines = model.getLinesContent();
    let indentLevel = 0;
    const tab = "    "; 
    const newLines = [];

    for (let i = 0; i < lines.length; i++) {
      // 1. Očistíme řádek od prefixu "1:TestExec:" a od původních mezer
      let cleanLine = lines[i].replace(/^\d+:TestExec:/i, '').trim();
      
      if (cleanLine === "" || cleanLine.startsWith('*****')) {
        newLines.push(lines[i]); // Ponecháme hlavičky beze změny
        continue;
      }

      // Detekce klíčových slov
      const isOut = cleanLine.match(/^OUT\s*:/i);
      const isIn = cleanLine.match(/^IN\s*:/i);
      const isValue = cleanLine.match(/^\*\s*Value\s*:/i);
      const isGettingSetting = cleanLine.match(/^\*\s*(Getting|Setting)\s*:/i);

      // 2. Logika odsazení
      // Pokud je to OUT, jdeme o úroveň zpět PŘED vypsáním
      if (isOut) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      let currentLineIndent = indentLevel;

      // VALUE chceme mít vždy o úroveň hlouběji než Getting/Setting
      if (isValue) {
        currentLineIndent += 1;
      }

      // 3. Sestavení řádku s novým prefixem (nebo bez něj, podle chuti)
      // Tady přidáváme tabulátory podle naší vypočítané hloubky
      newLines.push(tab.repeat(currentLineIndent) + cleanLine);

      // 4. Pokud je to IN, vše pod ním bude hlouběji
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
        if (editorRef.current) editorRef.current.setValue(ev.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleEditorWillMount = (monaco: any) => {
    monaco.languages.register({ id: 'pcsm-trace' });

    // CSS pro Breakpointy
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.innerHTML = `.myBreakpoint { background: #ff4444; border-radius: 50%; width: 12px!important; height: 12px!important; margin-left: 5px; }`;
      document.head.appendChild(style);
    }

    // Barevné zvýraznění (upraveno na tvou syntaxi s hvězdičkami)
    monaco.languages.setMonarchTokensProvider('pcsm-trace', {
      tokenizer: {
        root: [
          [/IN\s*:/i, 'keyword'],
          [/OUT\s*:/i, 'keyword'],
          [/Getting\s*:/i, 'comment'],
          [/Setting\s*:/i, 'attribute'],
          [/Value\s*:/i, 'number'],
          [/Outcome\s*:/i, 'string'],
        ]
      }
    });

    // Definice folding markerů - TEĎ TO BUDE FUNGOVAT
    monaco.languages.setLanguageConfiguration('pcsm-trace', {
      folding: {
        markers: {
          start: /^\s*IN\s*:/i,
          end: /^\s*OUT\s*:/i
        }
      }
    });

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
        'editor.glyphMarginBackground': '#1E293B'
      }
    });
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    editor.onMouseDown((e: any) => {
      if (e.target.type === 2) { 
        const line = e.target.position.lineNumber;
        const currentDecorations = editor.getLineDecorations(line);
        const bpoints = currentDecorations.filter((d: any) => d.options.glyphMarginClassName === 'myBreakpoint');
        if (bpoints.length > 0) editor.deltaDecorations([bpoints[0].id], []);
        else editor.deltaDecorations([], [{ range: new monaco.Range(line, 1, line, 1), options: { isWholeLine: true, glyphMarginClassName: 'myBreakpoint' } }]);
      }
    });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', color: 'white' }}>
      <header style={{ padding: '10px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Experian Trace Ultra-View 🔴</h1>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{fileName}</div>
        </div>
        <button onClick={formatTraceLogic} style={{ padding: '8px 15px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          🪄 Re-Format & Enable Folding
        </button>
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
            foldingStrategy: 'indentation', // Důležité pro tvou odsazenou strukturu
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

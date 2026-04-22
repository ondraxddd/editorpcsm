"use client";

import React, { useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function ExperianTraceUltra() {
  const [fileName, setFileName] = useState("Nahrajte .txt trace file");
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // Funkce pro formátování textu podle tvojí logiky
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

    // 1. Pokud řádek začíná OUT, musíme snížit úroveň PŘED vytvořením řádku,
    // aby OUT lícovalo se svým otevíracím IN.
    if (line.match(/^OUT\s*:/i)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // 2. Výpočet odsazení pro aktuální řádek
    let currentLineIndent = indentLevel;

    // Speciální pravidlo pro VALUE: Chceme ho mít vizuálně "pod" předchozím řádkem,
    // ale nesmí to ovlivnit indentLevel pro zbytek vnořeného bloku.
    if (line.match(/^VALUE\s*:/i)) {
      currentLineIndent += 1;
    }

    // 3. Přidání zformátovaného řádku do pole
    newLines.push(tab.repeat(currentLineIndent) + line);

    // 4. Pokud řádek začíná IN, zvýšíme úroveň pro VŠECHNY následující řádky,
    // dokud nenarazíme na odpovídající OUT. Tím dosáhneme rekurze.
    if (line.match(/^IN\s*:/i)) {
      indentLevel++;
    }
  }

  // Přepsání obsahu editoru zformátovaným textem
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

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Logika pro přidávání breakpointů (kliknutí do levého pruhu)
    editor.onMouseDown((e: any) => {
      if (e.target.type === 2) { // Glyph margin
        const line = e.target.position.lineNumber;
        const currentDecorations = editor.getLineDecorations(line);
        const bpoint = currentDecorations.filter((d: any) => d.options.glyphMarginClassName === 'myBreakpoint');

        if (bpoint.length > 0) {
          editor.deltaDecorations([bpoint[0].id], []);
        } else {
          editor.deltaDecorations([], [{
            range: new monaco.Range(line, 1, line, 1),
            options: {
              isWholeLine: true,
              glyphMarginClassName: 'myBreakpoint',
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
            }
          }]);
        }
      }
    });
  };

  const handleEditorWillMount = (monaco: any) => {
    monaco.languages.register({ id: 'pcsm-trace' });

    // CSS pro Breakpointy
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

    monaco.languages.setMonarchTokensProvider('pcsm-trace', {
      tokenizer: {
        root: [
          [/^.*IN :.*$/, 'keyword'],
          [/^.*OUT :.*$/, 'keyword'],
          [/^.*GETTING.*$/, 'comment'],
          [/^.*SETTING.*$/, 'attribute'],
          [/^.*VALUE.*$/, 'number'],
          [/'[^']*'/, 'string'],
        ]
      }
    });

    monaco.editor.defineTheme('traceTheme', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // IN a OUT: Výrazná oranžová pro navigaci v procesu
    { token: 'keyword', foreground: 'FF9D00', fontStyle: 'bold' }, 
    
    // GETTING: Místo šedé teď bude elegantní levandulová/fialová
    { token: 'comment', foreground: 'A78BFA' }, 
    
    // SETTING: Jasná neonově modrá, aby z logu "vyskakovalo", kde se mění data
    { token: 'attribute', foreground: '38BDF8', fontStyle: 'bold' }, 
    
    // VALUE: Svítivá mentolová/zelená pro samotné hodnoty
    { token: 'number', foreground: '34D399' }, 
    
    // Atributy v uvozovkách: Jemná žlutá/krémová
    { token: 'string', foreground: 'FDE047' }, 
  ],
  colors: { 
    'editor.background': '#0F172A',         // Velmi tmavě modrá (Slate 950)
    'editor.lineHighlightBackground': '#1E293B', // Zvýraznění aktuálního řádku
    'editorGutter.background': '#0F172A',   // Pozadí pruhu s čísly
    'editor.glyphMarginBackground': '#1E293B', // Pruh pro breakpointy
    'editorLineNumber.foreground': '#475569', // Barva čísel řádků
    'editorCursor.foreground': '#F8FAFC',    // Barva kurzoru
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
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input type="file" onChange={handleFileUpload} style={{ fontSize: '0.8rem' }} />
          <button 
            onClick={formatTraceLogic}
            style={{ padding: '8px 15px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🪄 Re-Format Trace
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
            foldingStrategy: 'indentation',
            lineNumbers: 'on',
            minimap: { enabled: true },
            wordWrap: 'off',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
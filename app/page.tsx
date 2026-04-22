"use client";

import React, { useRef } from 'react';
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function PCSMEditor() {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const formatCode = () => {
    if (editorRef.current) {
      // Monaco použije naše definovaná indentationRules
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  };

  const copyToClipboard = () => {
    if (editorRef.current) {
      const code = editorRef.current.getValue();
      navigator.clipboard.writeText(code);
      alert("Zkopírováno! Teď to můžeš vložit do Experianu.");
    }
  };

  const handleEditorWillMount = (monaco: any) => {
  monaco.languages.register({ id: 'pcsm' });

  // 1. Zvýraznění syntaxe (zůstává stejné)
  // 1. Úprava Tokenizeru (aby else if nepřebilo highlightování hlavního if)
monaco.languages.setMonarchTokensProvider('pcsm', {
  ignoreCase: true,
  tokenizer: {
    root: [
      // 1. Priorita: else if (obarvíme jako keyword, ale Monaco už nebude hledat vnitřní "if")
      [/\belse\s+if\b/i, 'keyword'],
      
      // 2. Samostatné klíčová slova
      [/\b(if|then|else|end\s+if|while|end\s+while|function|return|end\s+function)\b/i, 'keyword'],
      
      // Ostatní zůstává
      [/'[^']*'/, 'attribute'],
      [/' .*$/, 'comment'],
      [/\b\d+(\.\d+)?\b/, 'number'],
    ]
  }
});

// 2. Úprava Language Configuration (Klíčové pro barevné párování a folding)
monaco.languages.setLanguageConfiguration('pcsm', {
  comments: { lineComment: "'" },
  
  // ZCELA VYPRÁZDNIT - tohle zabrání Monacu, aby si samo párovalo 'if' a 'end if'
  brackets: [], 
  
  // Tohle zajistí, že po Enteru se nebude automaticky odsazovat chybně
  onEnterRules: [
    {
      // Pokud řádek končí "then", další řádek odsaď
      beforeText: /then\s*$/i,
      action: { indentAction: monaco.languages.IndentAction.Indent }
    },
    {
      // Pokud píšeš "end if" nebo "else", zruš odsazení aktuálního řádku
      beforeText: /^\s*(end\s+if|else|else\s+if|end\s+while|end\s+function)$/i,
      action: { indentAction: monaco.languages.IndentAction.Outdent }
    }
  ],
  
  folding: {
    markers: {
      // Startuje pouze řádek, který začíná s "if" (před ním smí být jen mezery)
      start: /^\s*if\b|while\b|function\b/i,
      end: /^\s*end\s+(if|while|function)\b/i
    }
  }
});

  // 2. Registrace Formátování (Tohle opraví to tlačítko)
  monaco.languages.registerDocumentFormattingEditProvider('pcsm', {
  provideDocumentFormattingEdits(model:any) {
    const lines = model.getLinesContent();
    const edits = [];
    let indentLevel = 0;
    const tab = "    "; 

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line === "") {
        edits.push({ range: new monaco.Range(i + 1, 1, i + 1, lines[i].length + 1), text: "" });
        continue;
      }

      // Krok 1: Pokud řádek zavírá blok, sniž indent PŘED vytvořením řádku
      const isEnd = line.match(/^end\s+(if|while|function)\b/i);
      const isElseBranch = line.match(/^else\b/i); // Chytne "else" i "else if"

      if (isEnd || isElseBranch) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // Krok 2: Vytvoř naformátovaný řádek
      edits.push({
        range: new monaco.Range(i + 1, 1, i + 1, lines[i].length + 1),
        text: tab.repeat(indentLevel) + line
      });

      // Krok 3: Pokud řádek otevírá blok, zvyš indent pro DALŠÍ řádek
      // Pozor: "else if" musí indent zase zvýšit, protože po něm následuje tělo
      const isStart = line.match(/^if\b.*then$/i) || line.match(/^while\b/i) || line.match(/^function\b/i);
      
      if (isStart || isElseBranch) {
        indentLevel++;
      }
    }
    return edits;
  }
});

  // 3. Konfigurace jazyka (pro folding a psaní)
  monaco.languages.setLanguageConfiguration('pcsm', {
    comments: { lineComment: "'" },
    brackets: [
      ['if', 'end if'],
      ['while', 'end while'],
      ['function', 'end function'],
    ]
  });

  // Definice tématu (volitelné)
  monaco.editor.defineTheme('pcsmTheme', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
      { token: 'attribute', foreground: '9CDCFE' },
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    ],
    colors: { 'editor.background': '#1e1e1e' }
  });
};

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      <header style={{ padding: '1rem', background: '#252526', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
        <div>
          <h1 style={{ fontSize: '1.1rem', margin: 0 }}>PCSM Script Formatter ✨</h1>
          <span style={{ fontSize: '0.7rem', color: '#888' }}>Vlož kód bez odsazení a klikni na tlačítko</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={formatCode}
            style={{ padding: '8px 16px', background: '#007acc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🪄 Zformátovat (Odsadit)
          </button>
          <button 
            onClick={copyToClipboard}
            style={{ padding: '8px 16px', background: '#3c3c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📋 Kopírovat kód
          </button>
        </div>
      </header>
      
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          defaultLanguage="pcsm"
          theme="pcsmTheme"
          beforeMount={handleEditorWillMount}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            automaticLayout: true,
            formatOnPaste: true, // Zkusí to zformátovat hned po vložení
            folding: true
          }}
        />
      </div>
    </div>
  );
}
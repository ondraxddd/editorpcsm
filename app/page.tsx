"use client";

import React, { useRef } from 'react';
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function PcsmCodeEditor() {
  const editorRef = useRef<any>(null);

  // --- ROBUSTNÍ FORMÁTOVAČ KÓDU ---
  const formatCode = () => {
    if (!editorRef.current) return;

    const model = editorRef.current.getModel();
    const lines = model.getLinesContent();
    let indentLevel = 0;
    const tab = "    "; 
    const formattedLines = [];

    // Klíčová slova - upraveno pro komplexní PCSM logiku
    const openKeywords = /^(IF|WHILE|FUNCTION)\b/i;
    const closeKeywords = /^(ENDIF|END\s+IF|ENDWHILE|END\s+WHILE|END\s+FUNCTION)\b/i;
    const middleKeywords = /^(ELSE|ELSEIF)\b/i;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      if (line === "") {
        formattedLines.push("");
        continue;
      }

      // 1. Detekce snížení úrovně (pro ELSE, ELSEIF a ENDIF)
      // Musí se provést PŘED přidáním řádku do pole
      const isClosing = closeKeywords.test(line);
      const isMiddle = middleKeywords.test(line);

      if (isClosing || isMiddle) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // 2. Přidání řádku s aktuálním odsazením
      formattedLines.push(tab.repeat(indentLevel) + line);

      // 3. Detekce zvýšení úrovně pro DALŠÍ řádek
      const isOpening = openKeywords.test(line);
      
      // Zvýšíme indent, pokud řádek otevírá blok nebo je to větev ELSE
      if (isOpening || isMiddle) {
        // Kontrola, zda není ENDIF na stejném řádku (one-liner)
        const hasEndOnSameLine = closeKeywords.test(line);
        if (!hasEndOnSameLine) {
          indentLevel++;
        }
      }
    }

    editorRef.current.setValue(formattedLines.join('\n'));
  };

  const handleEditorWillMount = (monaco: any) => {
    // Registrace PCSM jazyka
    monaco.languages.register({ id: 'pcsm' });

    // Syntax Highlighting
    monaco.languages.setMonarchTokensProvider('pcsm', {
      ignoreCase: true,
      tokenizer: {
        root: [
          [/\b(IF|THEN|ELSE|ELSEIF|ENDIF|END\s+IF|WHILE|ENDWHILE|FUNCTION|RETURN|END\s+FUNCTION|SUBPOP|INLIST|FIND|TODATE)\b/i, 'keyword'],
          [/'[^']*'/, 'attribute'], // Pole v uvozovkách
          [/"[^"]*"/, 'string'],      // Stringy
          [/\/\/.*$/, 'comment'],     // Komentáře //
          [/'\s.*$/, 'comment'],      // Komentáře '
          [/\b\d+(\.\d+)?\b/, 'number'],
          [/\b(TRUE|FALSE)\b/i, 'keyword.constant'],
        ]
      }
    });

    // Language Configuration pro Folding a Párování
    monaco.languages.setLanguageConfiguration('pcsm', {
      comments: {
        lineComment: '//',
      },
      brackets: [
        ['IF', 'ENDIF'],
        ['IF', 'END IF'],
        ['WHILE', 'ENDWHILE'],
        ['FUNCTION', 'END FUNCTION']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: "'", close: "'" },
        { open: '"', close: '"' },
      ]
    });

    // Definice Tématu
    monaco.editor.defineTheme('pcsmTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
        { token: 'attribute', foreground: '9CDCFE' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editorLineNumber.foreground': '#858585',
        'editor.lineHighlightBackground': '#2F3337',
      }
    });
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
      <header style={{ 
        padding: '10px 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '1px solid #333',
        color: '#ccc'
      }}>
        <h1 style={{ fontSize: '1rem', margin: 0 }}>PCSM Script Editor v2.0</h1>
        <button 
          onClick={formatCode}
          style={{
            padding: '6px 14px',
            background: '#007ACC',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🪄 Format Script
        </button>
      </header>

      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          defaultLanguage="pcsm"
          theme="pcsmTheme"
          onMount={handleEditorDidMount}
          beforeMount={handleEditorWillMount}
          options={{
            fontSize: 13,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            folding: true,
            renderIndentGuides: true,
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>
    </div>
  );
}

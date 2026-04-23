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

    const openKeywords = /^(IF|WHILE|FUNCTION)\b/i;
    const closeKeywords = /^(ENDIF|END\s+IF|ENDWHILE|END\s+WHILE|END\s+FUNCTION)\b/i;
    const middleKeywords = /^(ELSE|ELSEIF)\b/i;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      if (line === "") {
        formattedLines.push("");
        continue;
      }

      const isClosing = closeKeywords.test(line);
      const isMiddle = middleKeywords.test(line);

      if (isClosing || isMiddle) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      formattedLines.push(tab.repeat(indentLevel) + line);

      const isOpening = openKeywords.test(line);
      
      if (isOpening || isMiddle) {
        const hasEndOnSameLine = closeKeywords.test(line);
        if (!hasEndOnSameLine) {
          indentLevel++;
        }
      }
    }

    editorRef.current.setValue(formattedLines.join('\n'));
  };

  const handleEditorWillMount = (monaco: any) => {
    monaco.languages.register({ id: 'pcsm' });

    monaco.languages.setMonarchTokensProvider('pcsm', {
      ignoreCase: true,
      tokenizer: {
        root: [
          [/\b(IF|THEN|ELSE|ELSEIF|ENDIF|END\s+IF|WHILE|ENDWHILE|FUNCTION|RETURN|END\s+FUNCTION|SUBPOP|INLIST|FIND|TODATE)\b/i, 'keyword'],
          [/'[^']*'/, 'attribute'],
          [/"[^"]*"/, 'string'],
          [/\/\/.*$/, 'comment'],
          [/'\s.*$/, 'comment'],
          [/\b\d+(\.\d+)?\b/, 'number'],
          [/\b(TRUE|FALSE)\b/i, 'keyword.constant'],
        ]
      }
    });

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
        <h1 style={{ fontSize: '1rem', margin: 0 }}>PCSM Script Editor v2.1</h1>
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
            // OPRAVA: renderIndentGuides byl nahrazen tímto objektem
            guides: {
                indentation: true
            },
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>
    </div>
  );
}

import React from 'react';
// import AceEditor from 'react-ace'; // Or any other code editor library
// import 'ace-builds/src-noconflict/mode-javascript';
// import 'ace-builds/src-noconflict/theme-github';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string; // e.g., 'javascript', 'python'
  disabled?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language = 'javascript', disabled = false }) => {
  // Basic textarea as a placeholder
  // Replace with a proper code editor component like AceEditor, MonacoEditor, or CodeMirror
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Write your ${language} code here...`}
      rows={15}
      style={{ width: '100%', fontFamily: 'monospace', fontSize: '14px', border: '1px solid #ccc', padding: '10px' }}
      disabled={disabled}
    />
    // <AceEditor
    //   readOnly={disabled}
    //   mode={language}
    //   theme={theme}
    //   onChange={onChange}
    //   name="UNIQUE_ID_OF_DIV"
    //   editorProps={{ $blockScrolling: true }}
    //   value={value}
    //   fontSize={14}
    //   showPrintMargin={true}
    //   showGutter={true}
    //   highlightActiveLine={true}
    //   width="100%"
    //   setOptions={{
    //     enableBasicAutocompletion: true,
    //     enableLiveAutocompletion: true,
    //     enableSnippets: true,
    //     showLineNumbers: true,
    //     tabSize: 2,
    //   }}
    // />
  );
};

export default CodeEditor;

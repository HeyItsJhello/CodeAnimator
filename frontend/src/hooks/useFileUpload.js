import { useState, useCallback } from 'react';

export function useFileUpload() {
  const [file,        setFile]        = useState(null);
  const [fileName,    setFileName]    = useState('');
  const [fileContent, setFileContent] = useState('');
  const [totalLines,  setTotalLines]  = useState(0);
  const [startLine,   setStartLine]   = useState(1);
  const [endLine,     setEndLine]     = useState(1);

  const handleFileUpload = useCallback((e) => {
    const uploaded = e.target.files[0];
    if (!uploaded) return;
    setFile(uploaded);
    setFileName(uploaded.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content  = ev.target.result;
      const numLines = content.split('\n').length;
      setFileContent(content);
      setTotalLines(numLines);
      setStartLine(1);
      setEndLine(numLines);
    };
    reader.readAsText(uploaded);
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    setFileName('');
    setFileContent('');
    setTotalLines(0);
    setStartLine(1);
    setEndLine(1);
  }, []);

  return {
    file, fileName, fileContent, totalLines,
    startLine, endLine, setStartLine, setEndLine,
    handleFileUpload, reset,
  };
}

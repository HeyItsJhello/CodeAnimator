import { useState, useCallback, useEffect } from 'react';
import { API_URL } from '../config/constants';

async function parseJsonResponse(response, fallbackMessage) {
  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON body (proxy error page, dead server) — fall through to fallback
  }
  if (!response.ok) {
    throw new Error(data?.errors?.join('\n') || data?.error || fallbackMessage);
  }
  return data;
}

function toFormData(file, config) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('config', JSON.stringify(config));
  return formData;
}

export function useRender() {
  const [isLoading,       setIsLoading]       = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus,   setLoadingStatus]   = useState('starting');
  // The job being rendered: { fileName, index, total } (index is 1-based).
  const [currentJob,      setCurrentJob]      = useState(null);
  // One entry per rendered job: { fileName, videoUrl, downloadUrl, filename } or { fileName, error }.
  const [results,         setResults]         = useState([]);

  const pollProgress = useCallback((taskId) => {
    return new Promise((resolve, reject) => {
      const es = new EventSource(`${API_URL}/api/progress-stream/${taskId}`);

      es.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        setLoadingProgress(data.progress ?? 0);
        setLoadingStatus(data.status || 'processing');

        if (data.status === 'complete') {
          es.close();
          resolve({
            videoUrl:    `${API_URL}/api/stream/${data.videoId}`,
            downloadUrl: `${API_URL}/api/download/${data.videoId}`,
            filename:    data.videoId,
          });
        } else if (data.status === 'error') {
          es.close();
          reject(new Error(data.error || 'Animation failed'));
        }
      };

      es.onerror = () => {
        es.close();
        reject(new Error('Lost connection to server'));
      };
    });
  }, []);

  // Renders jobs ({ fileName, file, config }) one at a time, the same request
  // a single render makes. A failed job is recorded and the rest still run.
  const renderAll = useCallback(async (jobs) => {
    const completed = [];
    setIsLoading(true);
    try {
      for (const [i, { fileName, file, config }] of jobs.entries()) {
        setCurrentJob({ fileName, index: i + 1, total: jobs.length });
        setLoadingProgress(0);
        setLoadingStatus('starting');
        try {
          const response = await fetch(`${API_URL}/api/animate`, { method: 'POST', body: toFormData(file, config) });
          const result   = await parseJsonResponse(response, 'Failed to generate animation');
          completed.push({ fileName, ...(await pollProgress(result.taskId)) });
        } catch (err) {
          completed.push({ fileName, error: err.message });
        }
      }
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
      setCurrentJob(null);
    }
    setResults(completed);
    return completed;
  }, [pollProgress]);

  const submitDryRun = useCallback(async (file, config) => {
    const response = await fetch(`${API_URL}/api/dry-run`, { method: 'POST', body: toFormData(file, config) });
    return parseJsonResponse(response, 'Dry run failed');
  }, []);

  // Fetched and saved from a blob URL: the API is cross-origin, so a plain
  // link would navigate away (to an error page on failure) and each one
  // would cancel the previous when downloading several.
  const download = useCallback(async ({ downloadUrl, filename }) => {
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error(`Couldn't download ${filename}. It may have expired; render it again.`);
    const url = URL.createObjectURL(await response.blob());
    const a = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000); // Firefox/Safari cancel if revoked immediately
  }, []);

  // The server keeps videos until told the user is done with them (the
  // preview is closed or the page is left); sendBeacon survives page unload.
  const discardResults = useCallback(() => {
    const videoIds = results.filter((r) => !r.error).map((r) => r.filename);
    if (videoIds.length > 0) navigator.sendBeacon(`${API_URL}/api/videos/delete`, JSON.stringify(videoIds));
    setResults([]);
  }, [results]);

  useEffect(() => {
    window.addEventListener('pagehide', discardResults);
    return () => window.removeEventListener('pagehide', discardResults);
  }, [discardResults]);

  return {
    isLoading, loadingProgress, loadingStatus, currentJob,
    results, renderAll, submitDryRun, download, discardResults,
  };
}

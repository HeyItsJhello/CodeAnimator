import { useState, useCallback } from 'react';
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

export function useRender(file) {
  const [isLoading,       setIsLoading]       = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus,   setLoadingStatus]   = useState('starting');
  const [videoUrl,        setVideoUrl]        = useState(null);
  const [downloadUrl,     setDownloadUrl]     = useState(null);
  const [videoFilename,   setVideoFilename]   = useState('');

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

  const submitRender = useCallback(async (config) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('config', JSON.stringify(config));

    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('starting');

    try {
      const response = await fetch(`${API_URL}/api/animate`, { method: 'POST', body: formData });
      const result   = await parseJsonResponse(response, 'Failed to generate animation');

      const completed = await pollProgress(result.taskId);
      setVideoUrl(completed.videoUrl);
      setDownloadUrl(completed.downloadUrl);
      setVideoFilename(completed.filename);
      return completed;
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
    }
  }, [file, pollProgress]);

  const submitDryRun = useCallback(async (config) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('config', JSON.stringify(config));

    const response = await fetch(`${API_URL}/api/dry-run`, { method: 'POST', body: formData });
    return parseJsonResponse(response, 'Dry run failed');
  }, [file]);

  const download = useCallback(() => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href     = downloadUrl;
    a.download = videoFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [downloadUrl, videoFilename]);

  const resetVideo = useCallback(() => {
    setVideoUrl(null);
    setDownloadUrl(null);
    setVideoFilename('');
  }, []);

  return {
    isLoading, loadingProgress, loadingStatus,
    videoUrl, downloadUrl, videoFilename,
    submitRender, submitDryRun, download, resetVideo,
  };
}

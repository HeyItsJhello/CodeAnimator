import { useState, useCallback } from 'react';
import { API_URL } from '../data/constants';

export function useRender(file) {
  const [isLoading,       setIsLoading]       = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus,   setLoadingStatus]   = useState('starting');
  const [queuePosition,   setQueuePosition]   = useState(null);
  const [queueTotal,      setQueueTotal]      = useState(null);
  const [videoUrl,        setVideoUrl]        = useState(null);
  const [downloadUrl,     setDownloadUrl]     = useState(null);
  const [videoFilename,   setVideoFilename]   = useState('');

  const pollProgress = useCallback((taskId) => {
    return new Promise((resolve, reject) => {
      const es = new EventSource(`${API_URL}/api/progress-stream/${taskId}`);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLoadingProgress(data.progress ?? 0);
          setLoadingStatus(data.status || 'processing');

          if (data.status === 'queued') {
            setQueuePosition(data.queue_position ?? null);
            setQueueTotal(data.queue_total ?? null);
          } else {
            setQueuePosition(null);
            setQueueTotal(null);
          }

          if (data.status === 'complete') {
            es.close();
            resolve({
              videoUrl:    `${API_URL}/api/stream/${data.videoId}`,
              downloadUrl: `${API_URL}/api/download/${data.videoId}`,
              filename:    data.filename,
            });
          } else if (data.status === 'error' || data.status === 'timeout') {
            es.close();
            reject(new Error(data.detail || `Animation ${data.status}`));
          }
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };

      es.onerror = () => {
        es.close();
        reject(new Error('Lost connection to server'));
      };
    });
  }, []);

  // Submit a render job and stream its progress. Resolves with video URLs.
  const submitRender = useCallback(async (config) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('config', JSON.stringify(config));

    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('starting');

    try {
      const response = await fetch(`${API_URL}/api/animate`, { method: 'POST', body: formData });
      const result   = await response.json();
      if (!response.ok) {
        const detail = result.detail;
        throw new Error(detail?.errors ? detail.errors.join('\n') : (detail || 'Failed to generate animation'));
      }

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

  // Submit a dry-run request. Resolves with timing data or throws on error.
  const submitDryRun = useCallback(async (config) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('config', JSON.stringify(config));

    const response = await fetch(`${API_URL}/api/dry-run`, { method: 'POST', body: formData });
    const data     = await response.json();
    if (!response.ok) {
      throw new Error(data.detail?.errors ? data.detail.errors.join('\n') : (data.detail || 'Dry run failed'));
    }
    return data;
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
    isLoading, loadingProgress, loadingStatus, queuePosition, queueTotal,
    videoUrl, downloadUrl, videoFilename,
    submitRender, submitDryRun, download, resetVideo,
  };
}

import React, { useState } from 'react';

function Upload({ onUploadSuccess }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files).map(f => ({ file: f, status: 'pending', progress: 0, error: null })));
  };

  const uploadFileWithProgress = (file, index) => new Promise((resolve) => {
    const formData = new FormData();
    formData.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 80);
        setFiles(prev => prev.map((f, idx) => idx === index ? { ...f, progress: pct, phase: 'uploading' } : f));
      }
    };
    xhr.upload.onload = () => {
      setFiles(prev => prev.map((f, idx) => idx === index ? { ...f, progress: 80, phase: 'converting' } : f));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          setFiles(prev => prev.map((f, idx) => idx === index ? { ...f, status: 'done', progress: 100, phase: 'done' } : f));
          if (onUploadSuccess) onUploadSuccess(data);
        } else {
          setFiles(prev => prev.map((f, idx) => idx === index ? { ...f, status: 'error', progress: 0, phase: null, error: data.error || 'Upload failed' } : f));
        }
      } catch {
        setFiles(prev => prev.map((f, idx) => idx === index ? { ...f, status: 'error', progress: 0, phase: null, error: 'Invalid response' } : f));
      }
      resolve();
    };
    xhr.onerror = () => {
      setFiles(prev => prev.map((f, idx) => idx === index ? { ...f, status: 'error', progress: 0, phase: null, error: 'Network error' } : f));
      resolve();
    };
    xhr.open('POST', 'http://localhost:8080/music/upload');
    xhr.send(formData);
  });

  const handleUpload = async () => {
    if (!files.length || uploading) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading', progress: 0 } : f));
      await uploadFileWithProgress(files[i].file, i);
    }
    setUploading(false);
  };

  const allDone = files.length > 0 && files.every(f => f.status === 'done');
  const canUpload = files.length > 0 && !uploading && !allDone;

  const statusColors = {
    pending:   'text-ink-3 bg-surface-3 border-surface-3',
    uploading: 'text-accent-2 bg-accent-dim border-accent/30',
    done:      'text-success bg-success/10 border-success/30',
    error:     'text-danger bg-danger/10 border-danger/30',
  };

  const barColors = {
    uploading:  'from-accent to-accent-2',
    converting: 'from-warn to-yellow-300',
    done:       'from-emerald-500 to-emerald-400',
  };

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm text-ink-3 hover:text-ink-2 transition-colors duration-150 mb-3 group"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        <span className="font-medium">Upload music</span>
        {files.length > 0 && !open && (
          <span className="text-xs text-ink-3 bg-surface-2 px-2 py-0.5 rounded-full">
            {files.length} file{files.length > 1 ? 's' : ''}
          </span>
        )}
      </button>

      {open && (
        <div className="bg-surface border border-surface-3 rounded-2xl p-4 animate-fade-up">
          {/* Drop zone */}
          <label htmlFor="file-input" className="block cursor-pointer">
            <div className="border-2 border-dashed border-surface-3 hover:border-accent/40 rounded-xl p-6 text-center transition-colors duration-200 group">
              <div className="flex justify-center mb-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  className="text-ink-3 group-hover:text-accent-2 transition-colors duration-200">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p className="text-sm text-ink-2">
                {files.length > 0
                  ? <><span className="text-accent-2 font-medium">{files.length} file{files.length > 1 ? 's' : ''}</span> selected</>
                  : <><span className="text-ink">Click to select</span> or drag audio files</>
                }
              </p>
              <p className="text-xs text-ink-3 mt-1">MP3, AAC, FLAC, WAV supported</p>
            </div>
            <input id="file-input" type="file" accept="audio/*" multiple onChange={handleFileChange} className="hidden" />
          </label>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="bg-surface-2 rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-ink truncate max-w-[60%]">{f.file.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[f.status]}`}>
                      {f.status === 'error' ? (f.error || 'Error') :
                       f.phase === 'uploading'  ? `${f.progress}%` :
                       f.phase === 'converting' ? 'Converting…' :
                       f.status === 'done'      ? 'Done' : 'Ready'}
                    </span>
                  </div>
                  {(f.status === 'uploading' || f.status === 'done') && (
                    <div className="h-1 bg-surface-3/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r transition-all duration-200 ${barColors[f.phase] || barColors.uploading}`}
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleUpload} disabled={!canUpload}
            className="w-full mt-3 bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-all duration-150"
          >
            {uploading ? 'Uploading…' : allDone ? 'All uploaded' : 'Upload & Convert to HLS'}
          </button>
        </div>
      )}
    </div>
  );
}

export default Upload;

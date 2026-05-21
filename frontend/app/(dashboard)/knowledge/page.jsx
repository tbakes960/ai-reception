'use client';
import { useState, useRef, useCallback } from 'react';
import { BookOpen, Upload, FileText, File, Trash2, AlertCircle, CheckCircle, Loader2, CloudUpload } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function fileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
  if (ext === 'docx') return <FileText className="w-5 h-5 text-blue-500" />;
  return <File className="w-5 h-5 text-slate-400" />;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const fetchedRef = useRef(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API}/api/knowledge`, { headers: authHeaders() });
      setDocuments(data.documents);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  // Lazy-load on first render
  if (!fetchedRef.current) {
    fetchedRef.current = true;
    fetchDocuments();
  }

  async function uploadFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['pdf', 'docx', 'txt'];
    if (!allowed.includes(ext)) {
      toast.error(`Unsupported file type: .${ext}. Use PDF, DOCX, or TXT.`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10 MB.');
      return;
    }

    setUploading(true);
    setUploadProgress({ name: file.name, size: file.size, percent: 0 });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await axios.post(`${API}/api/knowledge/upload`, formData, {
        headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            setUploadProgress((p) => ({ ...p, percent: Math.round((e.loaded / e.total) * 100) }));
          }
        },
      });
      toast.success(`"${data.sourceFile}" uploaded — ${data.chunks} section${data.chunks !== 1 ? 's' : ''} indexed`);
      await fetchDocuments();
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  async function deleteDocument(sourceId, sourceFile) {
    if (!confirm(`Delete "${sourceFile}" and all its indexed content? This cannot be undone.`)) return;
    setDeletingId(sourceId);
    try {
      await axios.delete(`${API}/api/knowledge/${sourceId}`, { headers: authHeaders() });
      toast.success(`"${sourceFile}" removed from knowledge base`);
      setDocuments((prev) => prev.filter((d) => d.source_id !== sourceId));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-sky-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Knowledge Base</h1>
          <p className="text-sm text-slate-500">
            Upload documents about your business — the AI will reference them to answer guest questions accurately.
          </p>
        </div>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-sky-400 bg-sky-50'
            : uploading
            ? 'border-slate-200 bg-slate-50 cursor-default'
            : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={onFileChange}
          className="hidden"
          disabled={uploading}
        />

        {uploading && uploadProgress ? (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto" />
            <p className="font-medium text-slate-700">{uploadProgress.name}</p>
            <p className="text-sm text-slate-500">{formatBytes(uploadProgress.size)}</p>
            <div className="w-full max-w-xs mx-auto bg-slate-200 rounded-full h-2">
              <div
                className="bg-sky-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">
              {uploadProgress.percent < 100
                ? `Uploading… ${uploadProgress.percent}%`
                : 'Processing & indexing…'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <CloudUpload className={`w-10 h-10 mx-auto transition-colors ${dragOver ? 'text-sky-500' : 'text-slate-300'}`} />
            <div>
              <p className="font-medium text-slate-700">
                {dragOver ? 'Drop to upload' : 'Drop a file here, or click to browse'}
              </p>
              <p className="text-sm text-slate-400 mt-1">PDF, DOCX, or TXT — up to 10 MB</p>
            </div>
            <div className="flex items-center justify-center gap-4 pt-1">
              {['PDF', 'DOCX', 'TXT'].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-sky-50 border border-sky-100 rounded-lg px-4 py-3">
        <CheckCircle className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
        <p className="text-sm text-sky-700">
          Uploaded documents are automatically split into sections, embedded, and stored in your private knowledge base.
          The AI uses them in real time when answering calls.
        </p>
      </div>

      {/* Document list */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Uploaded Documents</h2>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && documents?.length === 0 && (
          <div className="text-center py-12 text-slate-400 border border-slate-100 rounded-xl">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No documents uploaded yet.</p>
            <p className="text-xs mt-1">Upload a rate sheet, FAQ, or services document to get started.</p>
          </div>
        )}

        {!loading && documents?.length > 0 && (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {documents.map((doc) => (
              <div key={doc.source_id} className="flex items-center gap-4 px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
                <div className="shrink-0">{fileIcon(doc.source_file)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate" title={doc.source_file}>
                    {doc.source_file}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {doc.chunk_count} section{doc.chunk_count !== 1 ? 's' : ''} indexed
                    {doc.uploaded_at && ` · ${format(new Date(doc.uploaded_at), 'dd MMM yyyy')}`}
                  </p>
                </div>
                <button
                  onClick={() => deleteDocument(doc.source_id, doc.source_file)}
                  disabled={deletingId === doc.source_id}
                  title="Remove from knowledge base"
                  className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  {deletingId === doc.source_id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tips for best results</p>
        <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
          <li>Include your room types, rates, and seasonal pricing</li>
          <li>Add your services menu, amenities list, and FAQs</li>
          <li>Include location details and how to reach you</li>
          <li>Keep documents under 50 pages for fastest processing</li>
          <li>Re-upload when rates or services change</li>
        </ul>
      </div>
    </div>
  );
}

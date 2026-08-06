import React, { useState, useRef } from 'react';
import { ResumeFile } from '../types';
import { uploadResume } from '../services/api';
import { FileText, Upload, CheckCircle2, AlertCircle, File, Sparkles } from 'lucide-react';

interface Props {
  resumes: ResumeFile[];
  activeResume: ResumeFile | null;
  onUploadSuccess: (newResume: ResumeFile) => void;
}

export const ResumeUploader: React.FC<Props> = ({ resumes, activeResume, onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx' && ext !== 'doc' && ext !== 'txt') {
      setError('Please upload a PDF, DOCX, or TXT file.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const res = await uploadResume(file);
      onUploadSuccess(res.resume);
    } catch (err: any) {
      setError(err.message || 'Failed to upload resume');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
      <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          Resume Management
        </h3>
        {activeResume && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Active
          </span>
        )}
      </div>

      {activeResume ? (
        <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="p-2 bg-blue-100 rounded text-blue-600">
                <File className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="font-semibold text-slate-900 truncate">{activeResume.originalName}</p>
                <p className="text-[11px] text-slate-500">
                  {(activeResume.size / 1024).toFixed(1)} KB • Uploaded {new Date(activeResume.uploadDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Replace
            </button>
          </div>

          {activeResume.parsedSkills && activeResume.parsedSkills.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium mb-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Parsed Skills ({activeResume.parsedSkills.length}):
              </div>
              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                {activeResume.parsedSkills.map(skill => (
                  <span
                    key={skill}
                    className="text-[10px] bg-white text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={e => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded p-4 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-blue-600 bg-blue-50/50'
              : 'border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-100/80'
          }`}
        >
          <div className="mx-auto w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-1.5">
            <Upload className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-700">
            {isUploading ? 'Uploading & Parsing...' : 'Click to upload Resume (PDF/DOCX)'}
          </p>
          <p className="text-[11px] text-blue-600 font-semibold mt-0.5">CV_JohnDoe_FullStack.pdf</p>
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { Job, ApplicationLog } from '../types';
import {
  Table,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Building2,
  MapPin,
  Sparkles,
  Download,
  Info,
  Eye
} from 'lucide-react';

interface Props {
  jobs: Job[];
  appLogs: ApplicationLog[];
  onExportReport: () => void;
  onClearJobs: () => void;
  onViewScreenshot: (url: string) => void;
}

export const ResultsTable: React.FC<Props> = ({
  jobs,
  appLogs,
  onExportReport,
  onClearJobs,
  onViewScreenshot
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [websiteFilter, setWebsiteFilter] = useState('all');
  const [selectedJobModal, setSelectedJobModal] = useState<Job | null>(null);

  const websites = Array.from(new Set(jobs.map(j => j.sourceWebsite)));

  const filteredJobs = jobs.filter(job => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    if (websiteFilter !== 'all' && job.sourceWebsite !== websiteFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        job.company.toLowerCase().includes(term) ||
        job.role.toLowerCase().includes(term) ||
        job.location.toLowerCase().includes(term) ||
        job.sourceWebsite.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const getStatusBadge = (status: Job['status']) => {
    switch (status) {
      case 'Applied':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#dcfce7] text-[#166534] border border-emerald-200 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Applied
          </span>
        );
      case 'Verification Required':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#fef9c3] text-[#854d0e] border border-amber-200 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> Login Required
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full animate-pulse">
            <Clock className="w-3 h-3" /> In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full">
            New
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex flex-col space-y-3">
      {/* Table Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            Applications & Match Results ({filteredJobs.length}/{jobs.length})
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Real-time tracking table for gathered openings across active job portals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportReport}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
          <input
            type="text"
            placeholder="Search company, role, location..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded pl-8 pr-3 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 text-slate-800 text-xs rounded px-2.5 py-1 focus:outline-none cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="Applied">Applied ✔</option>
          <option value="Verification Required">Login Required ⚠</option>
          <option value="Failed">Failed ✖</option>
          <option value="New">New</option>
        </select>

        <select
          value={websiteFilter}
          onChange={e => setWebsiteFilter(e.target.value)}
          className="bg-white border border-slate-200 text-slate-800 text-xs rounded px-2.5 py-1 focus:outline-none cursor-pointer"
        >
          <option value="all">All Sources</option>
          {websites.map(site => (
            <option key={site} value={site}>
              {site}
            </option>
          ))}
        </select>
      </div>

      {/* Table Grid */}
      <div className="overflow-x-auto rounded border border-slate-200 bg-white max-h-80 overflow-y-auto">
        <table className="w-full text-left text-xs text-slate-800">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 text-[12px]">
            <tr>
              <th className="p-2.5">Company</th>
              <th className="p-2.5">Role</th>
              <th className="p-2.5">Source</th>
              <th className="p-2.5">Match</th>
              <th className="p-2.5">Status</th>
              <th className="p-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                  No job applications found matching your search.
                </td>
              </tr>
            ) : (
              filteredJobs.map(job => (
                <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-2.5 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{job.company}</span>
                    </div>
                  </td>
                  <td className="p-2.5 font-medium text-slate-900">
                    <div>{job.role}</div>
                    <div className="text-[10px] text-slate-500">{job.location} • {job.experience}</div>
                  </td>
                  <td className="p-2.5">
                    <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                      {job.sourceWebsite}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-1 font-bold text-blue-600">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      {job.matchScore}%
                    </div>
                  </td>
                  <td className="p-2.5">{getStatusBadge(job.status)}</td>
                  <td className="p-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {job.screenshotUrl && (
                        <button
                          type="button"
                          onClick={() => onViewScreenshot(job.screenshotUrl!)}
                          title="View Form Snapshot"
                          className="p-1 rounded text-amber-600 hover:bg-amber-50 bg-white border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedJobModal(job)}
                        title="View Details"
                        className="p-1 rounded text-slate-600 hover:bg-slate-100 bg-white border border-slate-200 transition-colors cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>

                      <a
                        href={job.applyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 px-2 py-1 rounded transition-colors"
                      >
                        Apply <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {selectedJobModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 max-w-lg w-full space-y-4 text-xs shadow-lg">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{selectedJobModal.role}</h4>
                <p className="text-slate-500 font-medium">{selectedJobModal.company} • {selectedJobModal.sourceWebsite}</p>
              </div>
              <button
                onClick={() => setSelectedJobModal(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-slate-700">
              <p><strong>Location:</strong> {selectedJobModal.location}</p>
              <p><strong>Experience Required:</strong> {selectedJobModal.experience}</p>
              <p><strong>Match Reason:</strong> {selectedJobModal.matchReason}</p>
              {selectedJobModal.applicationNotes && (
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-[11px] text-slate-800">
                  {selectedJobModal.applicationNotes}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <a
                href={selectedJobModal.applyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded flex items-center gap-1"
              >
                Open Official Link <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => setSelectedJobModal(null)}
                className="bg-slate-100 text-slate-800 font-semibold px-3 py-1.5 rounded hover:bg-slate-200 border border-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

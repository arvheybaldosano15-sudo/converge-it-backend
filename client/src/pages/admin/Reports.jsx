import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { FileText, Download, FileSpreadsheet, Calendar, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const Reports = () => {
  const [reportType, setReportType] = useState('ticket-summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = () => {
    const query = new URLSearchParams({ reportType, startDate, endDate }).toString();
    window.open(`/api/reports/download/pdf?${query}`, '_blank');
    toast.success('PDF report download initiated!');
  };

  const handleDownloadExcel = () => {
    const query = new URLSearchParams({ startDate, endDate }).toString();
    window.open(`/api/reports/download/excel?${query}`, '_blank');
    toast.success('Excel spreadsheet download initiated!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-display">System Reports Generator</h1>
        <p className="text-xs text-slate-400">Generate and export downloadable operational reports in PDF and Excel formats</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Controls Card */}
        <Card className="space-y-4 md:col-span-1">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" /> Report Configuration
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="glass-input w-full rounded-xl py-2 px-3"
              >
                <option value="ticket-summary" className="bg-slate-900">Ticket Executive Summary</option>
                <option value="technician-performance" className="bg-slate-900">Technician Productivity</option>
                <option value="service-trends" className="bg-slate-900">Service Category Trends</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="glass-input w-full rounded-xl py-2 px-3"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="glass-input w-full rounded-xl py-2 px-3"
              />
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <Button variant="primary" className="w-full" onClick={handleDownloadPDF} icon={Download}>
              Download PDF Report
            </Button>
            <Button variant="success" className="w-full" onClick={handleDownloadExcel} icon={FileSpreadsheet}>
              Export Excel (.xlsx)
            </Button>
          </div>
        </Card>

        {/* Report Previews / Cards */}
        <div className="md:col-span-2 space-y-4">
          <Card glow className="space-y-3">
            <div className="flex items-center space-x-3 text-cyan-400">
              <FileText className="w-6 h-6" />
              <div>
                <h4 className="text-base font-bold text-white">Ticket Executive Summary</h4>
                <p className="text-xs text-slate-300">Detailed logs of all support cases, priority distributions, and resolution times.</p>
              </div>
            </div>
          </Card>

          <Card glow className="space-y-3">
            <div className="flex items-center space-x-3 text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
              <div>
                <h4 className="text-base font-bold text-white">Technician Performance & Field Audit</h4>
                <p className="text-xs text-slate-300">Metrics on assigned tasks, field report uploads, customer ratings, and response times per technician.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;

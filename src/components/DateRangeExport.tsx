import { useState } from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Calendar, Download, FileText, X } from 'lucide-react';

interface DateRangeExportProps {
  onExportCSV: (startDate?: Date, endDate?: Date) => void;
  onExportPDF: (startDate?: Date, endDate?: Date) => void;
  expenses: any[];
}

export default function DateRangeExport({ onExportCSV, onExportPDF, expenses }: DateRangeExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedRange, setSelectedRange] = useState<string>('all');

  const quickRanges = [
    { label: 'All Time', value: 'all' },
    { label: 'Last 7 days', value: '7days' },
    { label: 'Last 30 days', value: '30days' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'This Year', value: 'thisYear' },
    { label: 'Custom Range', value: 'custom' }
  ];

  const getDateRange = (range: string) => {
    const now = new Date();
    switch (range) {
      case '7days':
        return { start: subDays(now, 7), end: now };
      case '30days':
        return { start: subDays(now, 30), end: now };
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'thisYear':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom':
        return { 
          start: startDate ? new Date(startDate) : undefined, 
          end: endDate ? new Date(endDate) : undefined 
        };
      default:
        return { start: undefined, end: undefined };
    }
  };

  const handleRangeSelect = (range: string) => {
    setSelectedRange(range);
    if (range !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleExport = (type: 'csv' | 'pdf') => {
    const { start, end } = getDateRange(selectedRange);
    
    if (type === 'csv') {
      onExportCSV(start, end);
    } else {
      onExportPDF(start, end);
    }
    
    setIsOpen(false);
  };

  const getFilteredCount = () => {
    const { start, end } = getDateRange(selectedRange);
    
    if (!start && !end) return expenses.length;
    
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date || expense.createdAt);
      if (start && expenseDate < start) return false;
      if (end && expenseDate > end) return false;
      return true;
    }).length;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-base-200 hover:bg-base-300 text-base-content px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
      >
        <Calendar size={16} /> Export with Dates
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 rounded-2xl shadow-xl max-w-md w-full p-6 border border-base-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Export with Date Filter</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-base-content/40 hover:text-base-content/60"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-base-content mb-2">
                  Date Range
                </label>
                <div className="space-y-2">
                  {quickRanges.map(range => (
                    <label key={range.value} className="flex items-center">
                      <input
                        type="radio"
                        name="dateRange"
                        value={range.value}
                        checked={selectedRange === range.value}
                        onChange={() => handleRangeSelect(range.value)}
                        className="mr-2 radio radio-primary radio-sm"
                      />
                      <span className="text-sm">{range.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedRange === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-base-content/60 mb-1">From</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-base-100 border-base-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-base-content/60 mb-1">To</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-base-100 border-base-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="bg-base-200 p-3 rounded-lg">
                <p className="text-sm text-base-content/60">
                  <span className="font-medium">{getFilteredCount()}</span> of <span className="font-medium">{expenses.length}</span> expenses will be exported
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleExport('csv')}
                  className="flex-1 bg-base-200 hover:bg-base-300 text-base-content px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <FileText size={16} /> Export CSV
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="flex-1 bg-primary hover:bg-primary-focus text-primary-content px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
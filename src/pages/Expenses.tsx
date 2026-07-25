import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Trash2, Pencil, Download, FileText } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import DateRangeExport from '../components/DateRangeExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Expenses() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  
  const { register, handleSubmit, reset, setValue } = useForm();

  useEffect(() => {
      if (editingExpense) {
          setValue('amount', editingExpense.amount);
          setValue('category', editingExpense.category);
          setValue('description', editingExpense.description);
          setShowForm(true);
      } else {
          reset();
      }
  }, [editingExpense, setValue, reset]);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await api.get('/expenses');
      return res.data;
    }
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post('/expenses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Expense added');
      setShowForm(false);
      reset();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/expenses/${editingExpense._id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Expense updated');
      setEditingExpense(null);
      setShowForm(false);
      reset();
    }
  });

  const deleteMutation = useMutation({
      mutationFn: (id: string) => api.delete(`/expenses/${id}`),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          toast.success('Expense deleted');
          setExpenseToDelete(null);
      }
  })

  const onSubmit = (d: any) => {
      const payload = {...d, amount: Number(d.amount)};
      if (editingExpense) {
          updateMutation.mutate(payload);
      } else {
          addMutation.mutate({...payload, date: new Date()});
      }
  }

  const exportCSV = (startDate?: Date, endDate?: Date) => {
      if (!expenses || expenses.length === 0) return;
      
      const filteredExpenses = expenses.filter(e => {
        if (!startDate && !endDate) return true;
        const expenseDate = new Date(e.date);
        if (startDate && expenseDate < startDate) return false;
        if (endDate && expenseDate > endDate) return false;
        return true;
      });
      
      const headers = ['Date', 'Description', 'Category', 'Amount'];
      const rows = filteredExpenses.map((e: any) => [
          format(new Date(e.date), 'dd/MM/yyyy'),
          `"${e.description}"`,
          e.category,
          Number(e.amount).toFixed(2) // Ensure it's a number
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      const dateRangeText = startDate && endDate ? `_${format(startDate, 'ddMMyyyy')}_to_${format(endDate, 'ddMMyyyy')}` : '';
      link.setAttribute('download', `personal_expenses${dateRangeText}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }

  const exportPDF = (startDate?: Date, endDate?: Date) => {
      if (!expenses || expenses.length === 0) return;
      
      const filteredExpenses = expenses.filter(e => {
        if (!startDate && !endDate) return true;
        const expenseDate = new Date(e.date);
        if (startDate && expenseDate < startDate) return false;
        if (endDate && expenseDate > endDate) return false;
        return true;
      });
      
      const doc = new jsPDF();
      doc.setFontSize(18);
      let title = "Personal Expenses";
      if (startDate && endDate) {
        title += ` (${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')})`;
      } else if (startDate) {
        title += ` (From ${format(startDate, 'dd/MM/yyyy')})`;
      } else if (endDate) {
        title += ` (Until ${format(endDate, 'dd/MM/yyyy')})`;
      }
      doc.text(title, 14, 20);
      
      const tableData = filteredExpenses.map((e: any) => [
          format(new Date(e.date), 'dd/MM/yyyy'),
          e.description,
          e.category,
          `Rs.${Number(e.amount).toFixed(2)}` // Using Rs. instead of ₹ for PDF compatibility
      ]);
      
      autoTable(doc, {
          head: [['Date', 'Description', 'Category', 'Amount (Rs.)']],
          body: tableData,
          startY: 30,
          foot: [['', '', 'Total:', `Rs.${filteredExpenses.reduce((sum: number, e: any) => sum + e.amount, 0).toFixed(2)}`]],
          footStyles: { 
              fontStyle: 'bold', 
              fillColor: [240, 240, 240],
              textColor: [0, 0, 0] // Black text
          }
      });
      const dateRangeText = startDate && endDate ? `_${format(startDate, 'ddMMyyyy')}_to_${format(endDate, 'ddMMyyyy')}` : '';
      doc.save(`personal_expenses${dateRangeText}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personal Expenses</h1>
          <p className="text-base-content/60 text-sm">Track your personal spendings.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={() => exportCSV()}
              className="bg-base-200 hover:bg-base-300 text-base-content px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <FileText size={16} /> CSV
            </button>
            <button
              onClick={() => exportPDF()}
              className="bg-base-200 hover:bg-base-300 text-base-content px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Download size={16} /> PDF
            </button>
            <DateRangeExport 
              expenses={expenses}
              onExportCSV={exportCSV}
              onExportPDF={exportPDF}
            />
            <button 
              onClick={() => {
                  if (showForm) {
                      setShowForm(false);
                      setEditingExpense(null);
                  } else {
                      setShowForm(true);
                  }
              }}
              className="bg-primary hover:bg-primary-focus text-primary-content px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {showForm ? 'Cancel' : 'Add Expense'}
            </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300">
          <div className="mb-4">
              <h2 className="text-lg font-bold">{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h2>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
             <div>
                <label className="block text-xs font-medium text-base-content/60 mb-1">Amount (₹)</label>
                <input type="number" step="0.01" {...register('amount', { required: true })} className="w-full px-3 py-2 border rounded-lg bg-base-100 border-base-300 focus:outline-none focus:ring-2 focus:ring-primary" />
             </div>
             <div>
                <label className="block text-xs font-medium text-base-content/60 mb-1">Category</label>
                <select {...register('category', { required: true })} className="w-full px-3 py-2 border rounded-lg bg-base-100 border-base-300 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="Food">Food</option>
                    <option value="Travel">Travel</option>
                    <option value="Fuel">Fuel</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Bills">Bills</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Iron">Iron</option>
                    <option value="7eleven">7eleven</option>
                    <option value="Other">Other</option>
                </select>
             </div>
             <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-base-content/60 mb-1">Description</label>
                <div className="flex gap-2">
                    <input type="text" {...register('description', { required: true })} className="flex-1 px-3 py-2 border rounded-lg bg-base-100 border-base-300 focus:outline-none focus:ring-2 focus:ring-primary" />
                    <button type="submit" disabled={addMutation.isPending || updateMutation.isPending} className="bg-primary hover:bg-primary-focus text-primary-content px-6 py-2 rounded-lg font-medium whitespace-nowrap">
                        {editingExpense ? 'Update' : 'Save'}
                    </button>
                </div>
             </div>
          </form>
        </div>
      )}

      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-300 overflow-x-auto">
         {isLoading ? (
             <div className="p-8 text-center text-base-content/60">Loading expenses...</div>
         ) : expenses.length === 0 ? (
             <div className="p-8 text-center text-base-content/60">No expenses recorded yet.</div>
         ) : (
             <table className="w-full min-w-[800px] text-left text-sm">
                 <thead className="bg-base-200 text-base-content/60 text-xs uppercase">
                     <tr>
                         <th className="px-6 py-4 font-medium">Date</th>
                         <th className="px-6 py-4 font-medium">Description</th>
                         <th className="px-6 py-4 font-medium">Category</th>
                         <th className="px-6 py-4 font-medium text-right">Amount</th>
                         <th className="px-6 py-4"></th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-base-300">
                     {[...expenses].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((exp: any) => (
                         <tr key={exp._id} className="hover:bg-base-200/50">
                             <td className="px-6 py-4 whitespace-nowrap text-base-content/60">{format(new Date(exp.date), 'MMM d, yyyy')}</td>
                             <td className="px-6 py-4 font-medium">{exp.description}</td>
                             <td className="px-6 py-4">
                                 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-base-200 text-base-content/80">
                                     {exp.category}
                                 </span>
                             </td>
                             <td className="px-6 py-4 text-right font-medium text-error">
                                 -₹{exp.amount.toFixed(2)}
                             </td>
                             <td className="px-6 py-4 text-right">
                                 <div className="flex justify-end gap-3">
                                     <button onClick={() => setEditingExpense(exp)} className="text-base-content/40 hover:text-primary transition-colors">
                                         <Pencil size={16} />
                                     </button>
                                     <button onClick={() => setExpenseToDelete(exp._id)} className="text-base-content/40 hover:text-error transition-colors">
                                         <Trash2 size={16} />
                                     </button>
                                 </div>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         )}
      </div>

      <ConfirmModal 
        isOpen={!!expenseToDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        onConfirm={() => expenseToDelete && deleteMutation.mutate(expenseToDelete)}
        onCancel={() => setExpenseToDelete(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

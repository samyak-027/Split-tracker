import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Trash2, Pencil, Download, FileText } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
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

  const exportCSV = () => {
      if (!expenses || expenses.length === 0) return;
      const headers = ['Date', 'Description', 'Category', 'Amount'];
      const rows = expenses.map((e: any) => [
          format(new Date(e.date), 'dd/MM/yyyy'),
          `"${e.description}"`,
          e.category,
          e.amount.toFixed(2)
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'personal_expenses.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }

  const exportPDF = () => {
      if (!expenses || expenses.length === 0) return;
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Personal Expenses", 14, 20);
      
      const tableData = expenses.map((e: any) => [
          format(new Date(e.date), 'dd/MM/yyyy'),
          e.description,
          e.category,
          e.amount.toFixed(2)
      ]);
      
      autoTable(doc, {
          head: [['Date', 'Description', 'Category', 'Amount (₹)']],
          body: tableData,
          startY: 30,
          foot: [['', '', 'Total:', expenses.reduce((sum: number, e: any) => sum + e.amount, 0).toFixed(2)]],
          footStyles: { fontStyle: 'bold', fillColor: [240, 240, 240] }
      });
      doc.save('personal_expenses.pdf');
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personal Expenses</h1>
          <p className="text-slate-500 text-sm">Track your personal spendings.</p>
        </div>
        <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <FileText size={16} /> CSV
            </button>
            <button
              onClick={exportPDF}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Download size={16} /> PDF
            </button>
            <button 
              onClick={() => {
                  if (showForm) {
                      setShowForm(false);
                      setEditingExpense(null);
                  } else {
                      setShowForm(true);
                  }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {showForm ? 'Cancel' : 'Add Expense'}
            </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="mb-4">
              <h2 className="text-lg font-bold">{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h2>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
             <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Amount (₹)</label>
                <input type="number" step="0.01" {...register('amount', { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
             </div>
             <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                <select {...register('category', { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
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
                <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                <div className="flex gap-2">
                    <input type="text" {...register('description', { required: true })} className="flex-1 px-3 py-2 border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    <button type="submit" disabled={addMutation.isPending || updateMutation.isPending} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium whitespace-nowrap">
                        {editingExpense ? 'Update' : 'Save'}
                    </button>
                </div>
             </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-x-auto">
         {isLoading ? (
             <div className="p-8 text-center text-slate-500">Loading expenses...</div>
         ) : expenses.length === 0 ? (
             <div className="p-8 text-center text-slate-500">No expenses recorded yet.</div>
         ) : (
             <table className="w-full min-w-[800px] text-left text-sm">
                 <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-xs uppercase">
                     <tr>
                         <th className="px-6 py-4 font-medium">Date</th>
                         <th className="px-6 py-4 font-medium">Description</th>
                         <th className="px-6 py-4 font-medium">Category</th>
                         <th className="px-6 py-4 font-medium text-right">Amount</th>
                         <th className="px-6 py-4"></th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                     {[...expenses].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((exp: any) => (
                         <tr key={exp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                             <td className="px-6 py-4 whitespace-nowrap text-slate-500">{format(new Date(exp.date), 'MMM d, yyyy')}</td>
                             <td className="px-6 py-4 font-medium">{exp.description}</td>
                             <td className="px-6 py-4">
                                 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                     {exp.category}
                                 </span>
                             </td>
                             <td className="px-6 py-4 text-right font-medium text-red-600 dark:text-red-400">
                                 -₹{exp.amount.toFixed(2)}
                             </td>
                             <td className="px-6 py-4 text-right">
                                 <div className="flex justify-end gap-3">
                                     <button onClick={() => setEditingExpense(exp)} className="text-slate-400 hover:text-emerald-500 transition-colors">
                                         <Pencil size={16} />
                                     </button>
                                     <button onClick={() => setExpenseToDelete(exp._id)} className="text-slate-400 hover:text-red-500 transition-colors">
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

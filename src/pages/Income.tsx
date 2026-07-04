import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

export default function Income() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const { data: incomes = [], isLoading } = useQuery({
    queryKey: ['income'],
    queryFn: async () => {
      const res = await api.get('/income');
      return res.data;
    }
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post('/income', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Income added');
      setShowForm(false);
      reset();
    }
  });

  const deleteMutation = useMutation({
      mutationFn: (id: string) => api.delete(`/income/${id}`),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['income'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          toast.success('Income deleted');
      }
  })
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Income</h1>
          <p className="text-slate-500 text-sm">Track your sources of income.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Income'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <form onSubmit={handleSubmit((d) => addMutation.mutate({...d, amount: Number(d.amount), date: new Date()}))} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
             <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Amount (₹)</label>
                <input type="number" step="0.01" {...register('amount', { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
             </div>
             <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Source</label>
                <select {...register('source', { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="Salary">Salary</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Investments">Investments</option>
                    <option value="Refund">Refund</option>
                    <option value="Other">Other</option>
                </select>
             </div>
             <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                <div className="flex gap-2">
                    <input type="text" {...register('description', { required: true })} className="flex-1 px-3 py-2 border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    <button type="submit" disabled={addMutation.isPending} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium whitespace-nowrap">
                        Save
                    </button>
                </div>
             </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
         {isLoading ? (
             <div className="p-8 text-center text-slate-500">Loading income...</div>
         ) : incomes.length === 0 ? (
             <div className="p-8 text-center text-slate-500">No income recorded yet.</div>
         ) : (
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-xs uppercase">
                     <tr>
                         <th className="px-6 py-4 font-medium">Date</th>
                         <th className="px-6 py-4 font-medium">Description</th>
                         <th className="px-6 py-4 font-medium">Source</th>
                         <th className="px-6 py-4 font-medium text-right">Amount</th>
                         <th className="px-6 py-4"></th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                     {incomes.map((inc: any) => (
                         <tr key={inc._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                             <td className="px-6 py-4 whitespace-nowrap text-slate-500">{format(new Date(inc.date), 'MMM d, yyyy')}</td>
                             <td className="px-6 py-4 font-medium">{inc.description}</td>
                             <td className="px-6 py-4">
                                 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                                     {inc.source}
                                 </span>
                             </td>
                             <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                 +₹{inc.amount.toFixed(2)}
                             </td>
                             <td className="px-6 py-4 text-right">
                                 <button onClick={() => deleteMutation.mutate(inc._id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                     <Trash2 size={16} />
                                 </button>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         )}
      </div>
    </div>
  );
}

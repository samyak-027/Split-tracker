import React, { useState, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { HandCoins } from 'lucide-react';

interface ComponentProps {
  members: any[];
  user: any;
  onCancel: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  initialData?: any;
  key?: React.Key | string | number;
}

export default function AddExpenseForm({ members, user, onCancel, onSubmit, isLoading, initialData }: ComponentProps) {
  const getDefaultParticipants = () => {
      if (initialData && initialData.splits) {
          const map: any = {};
          initialData.splits.forEach((s: any) => map[s.user._id || s.user] = true);
          return map;
      }
      return members.filter(m => m.user).reduce((acc, m) => ({ ...acc, [m.user._id]: true }), {});
  };

  const getDefaultExactAmounts = () => {
      if (initialData && initialData.splitType === 'EXACT' && initialData.splits) {
          const map: any = {};
          initialData.splits.forEach((s: any) => map[s.user._id || s.user] = s.amountOwed);
          return map;
      }
      return {};
  };

  const getDefaultPercentages = () => {
      if (initialData && initialData.splitType === 'PERCENTAGE' && initialData.splits) {
          const map: any = {};
          const totalAmt = initialData.amount;
          initialData.splits.forEach((s: any) => map[s.user._id || s.user] = (s.amountOwed / totalAmt) * 100);
          return map;
      }
      return {};
  };

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm({
      defaultValues: {
          title: initialData?.title || '',
          amount: initialData?.amount || '',
          category: initialData?.category || 'Other',
          description: initialData?.description || '',
          paidBy: initialData?.paidBy?._id || initialData?.paidBy || user.id,
          splitType: initialData?.splitType || 'EQUAL',
          excludePayer: false,
          participants: getDefaultParticipants(),
          exactAmounts: getDefaultExactAmounts(),
          percentages: getDefaultPercentages()
      }
  });

  const selectedType = watch('splitType');
  const amountStr = watch('amount');
  const amount = Number(amountStr) || 0;
  const excludePayer = watch('excludePayer');
  const paidBy = watch('paidBy');
  const participants = watch('participants');
  const exactAmounts = watch('exactAmounts');
  const percentages = watch('percentages');

  const selectedParticipantIds = Object.keys(participants || {}).filter(k => participants[k]);

  let activeParticipantIds = selectedParticipantIds;
  if (selectedType === 'EQUAL' || selectedType === 'PERCENTAGE') {
      if (excludePayer) {
          activeParticipantIds = selectedParticipantIds.filter(id => id !== paidBy);
      }
  } else if (selectedType === 'SINGLE_PERSON') {
      const ids = Object.keys(participants || {}).filter(k => participants[k]);
      activeParticipantIds = ids.length > 0 ? [ids[0]] : [];
  }


  const calculateSplits = (data: any) => {
      const splits: {user: string, amount: number}[] = [];
      const totalAmt = Number(data.amount);

      if (data.splitType === 'EQUAL') {
          if (activeParticipantIds.length === 0) throw new Error("Select at least one participant");
          const splitAmount = totalAmt / activeParticipantIds.length;
          for (const pid of activeParticipantIds) {
              splits.push({ user: pid, amount: splitAmount });
          }
      } else if (data.splitType === 'EXACT') {
          let sum = 0;
          for (const pid of activeParticipantIds) {
               const val = Number(data.exactAmounts[pid]) || 0;
               sum += val;
               if (val > 0) splits.push({ user: pid, amount: val });
          }
          if (Math.abs(sum - totalAmt) > 0.01) throw new Error(`Exact amounts total must equal the expense amount (${totalAmt})`);
      } else if (data.splitType === 'PERCENTAGE') {
          let sumPct = 0;
          for (const pid of activeParticipantIds) {
               const val = Number(data.percentages[pid]) || 0;
               sumPct += val;
               if (val > 0) splits.push({ user: pid, amount: (val / 100) * totalAmt });
          }
          if (Math.abs(sumPct - 100) > 0.01) throw new Error("Percentages must total exactly 100%");
      } else if (data.splitType === 'SINGLE_PERSON') {
          const pids = Object.keys(data.participants).filter(k => data.participants[k]);
          if (pids.length !== 1) throw new Error("Select exactly one participant for Single Person split");
          splits.push({ user: pids[0], amount: totalAmt });
      }

      return splits;
  };

  const [localError, setLocalError] = useState('');

  const handleFormSubmit = (data: any) => {
      try {
          setLocalError('');
          const splits = calculateSplits(data);
          onSubmit({
              ...data,
              amount: Number(data.amount),
              splits
          });
      } catch (err: any) {
          setLocalError(err.message);
      }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            
            {/* Step 1 */}
            <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Step 1: Expense Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <input type="text" {...register('title', {required: true})} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Dinner at MTR" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Total Amount (₹)</label>
                        <input type="number" step="0.01" {...register('amount', {required: true, min: 0.01})} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <select {...register('category', { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                            <option value="Food">Food</option>
                            <option value="Travel">Travel</option>
                            <option value="Shopping">Shopping</option>
                            <option value="Bills">Bills</option>
                            <option value="Entertainment">Entertainment</option>
                            <option value="Iron">Iron</option>
                            <option value="7eleven">7eleven</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Paid By</label>
                        <select {...register('paidBy')} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                            {members.filter(m => m.user).map(m => (
                                <option key={m.user._id} value={m.user._id}>{m.user._id === user.id ? 'You' : m.user.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                        <input type="text" {...register('description')} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                </div>
            </div>

            {/* Step 2 */}
            <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Step 2: Split Method</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['EQUAL', 'EXACT', 'PERCENTAGE', 'SINGLE_PERSON'].map(type => (
                        <label key={type} className={`cursor-pointer border rounded-lg p-3 text-center transition-colors ${selectedType === type ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                            <input type="radio" value={type} {...register('splitType')} className="sr-only" />
                            <span className="text-sm">{type.replace('_', ' ')}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Step 3 */}
            <div>
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Step 3: Participants</h3>
                    {(selectedType === 'EQUAL' || selectedType === 'PERCENTAGE') && (
                        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <input type="checkbox" {...register('excludePayer')} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                            Exclude Payer
                        </label>
                    )}
                </div>

                <div className="space-y-3">
                    {members.filter(m => m.user).map(m => {
                        const isExcludedLogically = (selectedType === 'EQUAL' || selectedType === 'PERCENTAGE') && excludePayer && m.user._id === paidBy;
                        const isSinglePersonLock = selectedType === 'SINGLE_PERSON' && Object.keys(participants).filter(k => participants[k]).length > 0 && !participants[m.user._id];

                        let valComponent = null;
                        if (participants[m.user._id] && !isExcludedLogically) {
                            if (selectedType === 'EXACT') {
                                valComponent = (
                                     <div className="flex items-center gap-2">
                                        <span className="text-slate-500 font-medium tracking-wide">₹</span>
                                        <input type="number" step="0.01" {...register(`exactAmounts.${m.user._id}` as any)} className="w-24 px-2 py-1 text-right border rounded bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none" placeholder="0.00" />
                                     </div>
                                );
                            } else if (selectedType === 'PERCENTAGE') {
                                valComponent = (
                                    <div className="flex items-center gap-2">
                                        <input type="number" step="1" {...register(`percentages.${m.user._id}` as any)} className="w-20 px-2 py-1 text-right border rounded bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none" placeholder="0" />
                                        <span className="text-slate-500 font-medium tracking-wide">%</span>
                                     </div>
                                );
                            } else if (selectedType === 'EQUAL') {
                                valComponent = (
                                    <span className="text-slate-500 text-sm">
                                        ₹{(amount / (activeParticipantIds.length || 1)).toFixed(2)}
                                    </span>
                                )
                            } else if (selectedType === 'SINGLE_PERSON') {
                                valComponent = (
                                    <span className="text-slate-500 text-sm">₹{amount.toFixed(2)}</span>
                                )
                            }
                        }

                        return (
                            <div key={m.user._id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isExcludedLogically ? 'bg-slate-50 dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-700 opacity-60' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                <label className="flex items-center gap-3 cursor-pointer flex-1">
                                    <input 
                                        type={selectedType === 'SINGLE_PERSON' ? 'radio' : 'checkbox'} 
                                        disabled={isExcludedLogically}
                                        {...register(`participants.${m.user._id}` as any, {
                                            onChange: (e) => {
                                                if (selectedType === 'SINGLE_PERSON') {
                                                    // Clear others
                                                    Object.keys(participants).forEach(k => {
                                                        if (k !== m.user._id) {
                                                            setValue(`participants.${k}`, false);
                                                        }
                                                    });
                                                }
                                            }
                                        })}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                    />
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 text-xs">
                                        {m.user.name.charAt(0)}
                                    </div>
                                    <span className="font-medium text-slate-700 dark:text-slate-200">
                                        {m.user._id === user.id ? 'You' : m.user.name}
                                        {isExcludedLogically && <span className="ml-2 text-xs font-normal italic text-slate-400">(Excluded payer)</span>}
                                    </span>
                                </label>
                                
                                {valComponent}
                            </div>
                        )
                    })}
                </div>
            </div>

            {localError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center">{localError}</div>}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={onCancel} className="px-5 py-2.5 text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
                <button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
                   {isLoading ? 'Saving...' : 'Save Expense'}
                </button>
            </div>
        </form>
    </div>
  );
}

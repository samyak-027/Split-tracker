import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { format } from 'date-fns';
import { History as HistoryIcon, PlusCircle, UserPlus, FileEdit, CheckCircle2, FolderKanban } from 'lucide-react';

export default function History() {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      const res = await api.get('/dashboard');
      return res.data.recentActivity;
    }
  });

  const getIcon = (action: string) => {
      switch(action) {
          case 'ADD_PERSONAL_EXPENSE': return <PlusCircle className="text-red-500" />;
          case 'CREATE_GROUP': return <FolderKanban className="text-blue-500" />;
          case 'JOIN_GROUP': return <UserPlus className="text-purple-500" />;
          case 'ADD_SHARED_EXPENSE': return <FileEdit className="text-orange-500" />;
          case 'SETTLEMENT_COMPLETED': return <CheckCircle2 className="text-emerald-500" />;
          default: return <HistoryIcon className="text-slate-500" />;
      }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity History</h1>
        <p className="text-slate-500 text-sm">Your recent actions and updates.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
             <div className="p-8 text-center text-slate-500">Loading history...</div>
        ) : activities.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No activity recorded.</div>
        ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {activities.map((activity: any) => (
                    <div key={activity._id} className="p-5 flex items-start gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="mt-1 bg-slate-100 dark:bg-slate-900 p-2 rounded-full">
                            {getIcon(activity.action)}
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                                {activity.details}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                                {activity.action.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-slate-400 mt-2">{format(new Date(activity.date), 'PPpp')}</p>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}

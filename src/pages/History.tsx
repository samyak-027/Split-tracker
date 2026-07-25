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
          case 'ADD_PERSONAL_EXPENSE': return <PlusCircle className="text-error" />;
          case 'CREATE_GROUP': return <FolderKanban className="text-info" />;
          case 'JOIN_GROUP': return <UserPlus className="text-secondary" />;
          case 'ADD_SHARED_EXPENSE': return <FileEdit className="text-warning" />;
          case 'SETTLEMENT_COMPLETED': return <CheckCircle2 className="text-success" />;
          default: return <HistoryIcon className="text-base-content/60" />;
      }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity History</h1>
        <p className="text-base-content/60 text-sm">Your recent actions and updates.</p>
      </div>

      <div className="bg-base-100  rounded-2xl shadow-sm border border-base-300  overflow-x-auto">
        {isLoading ? (
             <div className="p-8 text-center text-base-content/60">Loading history...</div>
        ) : activities.length === 0 ? (
            <div className="p-8 text-center text-base-content/60">No activity recorded.</div>
        ) : (
            <div className="divide-y divide-base-300 ">
                {activities.map((activity: any) => (
                    <div key={activity._id} className="p-5 flex items-start gap-4 hover:bg-base-200/50  transition-colors">
                        <div className="mt-1 bg-base-200  p-2 rounded-full">
                            {getIcon(activity.action)}
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-base-content ">
                                {activity.details}
                            </p>
                            <p className="text-sm text-base-content/60 mt-1">
                                {activity.action.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-base-content/50 mt-2">{format(new Date(activity.date), 'PPpp')}</p>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Wallet, TrendingDown, TrendingUp, HandCoins, ArrowUpRight, ArrowDownRight, Users, FolderKanban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/dashboard');
      return res.data;
    }
  });

  if (isLoading) return <div className="animate-pulse space-y-4 pt-4">
      <div className="h-8 bg-slate-200 dark:bg-slate-700 w-1/4 rounded"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>)}
      </div>
  </div>;

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-red-500">Could not load dashboard data</h2>
        <p className="text-slate-500">Please check your database connection or try again.</p>
      </div>
    );
  }

  const { expenseTotal = 0, incomeTotal = 0, balance = 0, recentActivity = [], youGet = 0, groups = [] } = data || {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400">Welcome back. Here is an overview of your finances.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Current Balance" 
          amount={balance} 
          icon={<Wallet className="text-blue-500" />} 
          type="net" 
        />
        <StatCard 
          title="Monthly Income" 
          amount={incomeTotal} 
          icon={<ArrowUpRight className="text-emerald-500" />} 
          type="income" 
        />
        <StatCard 
          title="Monthly Expenses" 
          amount={expenseTotal} 
          icon={<ArrowDownRight className="text-red-500" />} 
          type="expense" 
        />
        <StatCard 
          title="You Get" 
          amount={youGet} 
          icon={<HandCoins className="text-purple-500" />} 
          type="net" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* Your Groups */}
          {groups.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold mb-4">Your Groups</h2>
              <div className="space-y-3">
                {groups.map((group: any) => (
                  <Link 
                    key={group._id} 
                    to={`/groups/${group._id}`}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center font-bold">
                        {group.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{group.name}</p>
                        <p className="text-xs text-slate-500">Code: {group.joinCode}</p>
                      </div>
                    </div>
                    <ArrowUpRight size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/expenses" className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors border border-slate-100 dark:border-slate-800">
                <TrendingDown className="mb-2" />
                <span className="text-sm font-medium">Add Expense</span>
              </Link>
              <Link to="/income" className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors border border-slate-100 dark:border-slate-800">
                <TrendingUp className="mb-2" />
                <span className="text-sm font-medium">Add Income</span>
              </Link>
              <Link to="/groups" className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors border border-slate-100 dark:border-slate-800">
                <Users className="mb-2" />
                <span className="text-sm font-medium">Create Group</span>
              </Link>
              <Link to="/groups" className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors border border-slate-100 dark:border-slate-800">
                <FolderKanban className="mb-2" />
                <span className="text-sm font-medium">Shared Expense</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <Link to="/history" className="text-sm text-emerald-600 hover:text-emerald-700">View all</Link>
          </div>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
            ) : (
              recentActivity.map((activity: any) => (
                <div key={activity._id} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{activity.details}</p>
                    <p className="text-xs text-slate-500">{activity.action.replace(/_/g, ' ')}</p>
                  </div>
                  <span className="text-xs text-slate-400">{format(new Date(activity.date), 'MMM d')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, amount, icon, type }: { title: string, amount: number, icon: React.ReactNode, type: 'income' | 'expense' | 'net' }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center space-x-4">
      <div className="p-3 rounded-full bg-slate-50 dark:bg-slate-900/50">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
}

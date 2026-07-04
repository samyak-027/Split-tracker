import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { FolderKanban, Plus, UserPlus, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function Groups() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const { register: registerCreate, handleSubmit: handleCreate, reset: resetCreate } = useForm();
  const { register: registerJoin, handleSubmit: handleJoin, reset: resetJoin } = useForm();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await api.get('/groups');
      return res.data;
    }
  });

  const createGroup = useMutation({
    mutationFn: (data: any) => api.post('/groups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group created');
      setShowCreate(false);
      resetCreate();
    }
  });

  const joinGroup = useMutation({
    mutationFn: (data: any) => api.post('/groups/join', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Joined group!');
      setShowJoin(false);
      resetJoin();
    },
    onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Could not join group');
    }
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Groups</h1>
          <p className="text-slate-500 text-sm">Manage shared expenses with friends or family.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => {setShowJoin(true); setShowCreate(false);}}
                className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
                <UserPlus size={16} /> Join via Code
            </button>
            <button 
                onClick={() => {setShowCreate(true); setShowJoin(false);}}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
               <Plus size={16} /> Create Group
            </button>
        </div>
      </div>

      {showCreate && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 max-w-md">
              <h2 className="text-lg font-semibold mb-4">Create New Group</h2>
              <form onSubmit={handleCreate((d) => createGroup.mutate(d))} className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Group Name</label>
                      <input type="text" {...registerCreate('name', { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Goa Trip" />
                  </div>
                  <div>
                      <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Description (Optional)</label>
                      <input type="text" {...registerCreate('description')} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Summer 2026" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700">Cancel</button>
                      <button type="submit" disabled={createGroup.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium">Create</button>
                  </div>
              </form>
          </div>
      )}

      {showJoin && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 max-w-md">
              <h2 className="text-lg font-semibold mb-4">Join Group</h2>
              <form onSubmit={handleJoin((d) => joinGroup.mutate(d))} className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Group Invite Code</label>
                      <input type="text" {...registerJoin('joinCode', { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono tracking-wider" placeholder="ABCDEF" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setShowJoin(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700">Cancel</button>
                      <button type="submit" disabled={joinGroup.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium">Join</button>
                  </div>
              </form>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
             <div className="col-span-full py-12 text-center text-slate-500">Loading your groups...</div>
          ) : groups.length === 0 ? (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                  <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">You are not part of any groups yet.</p>
                  <p className="text-sm text-slate-400 mt-1">Create one or join using an invite code.</p>
              </div>
          ) : (
              groups.map((group: any) => (
                  <Link key={group._id} to={`/groups/${group._id}`} className="block group">
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                  <Users size={24} />
                              </div>
                              <span className="text-xs font-mono bg-slate-100 dark:bg-slate-900 text-slate-500 px-2 py-1 rounded">Code: {group.joinCode}</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{group.name}</h3>
                          {group.description && <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1">{group.description}</p>}
                      </div>
                  </Link>
              ))
          )}
      </div>

    </div>
  );
}

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
          <h1 className="text-2xl font-bold tracking-tight text-base-content">Your Groups</h1>
          <p className="text-base-content/60 text-sm">Manage shared expenses with friends or family.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => {setShowJoin(true); setShowCreate(false);}}
                className="bg-base-100 hover:bg-base-200 text-base-content border border-base-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
                <UserPlus size={16} /> Join via Code
            </button>
            <button 
                onClick={() => {setShowCreate(true); setShowJoin(false);}}
                className="bg-primary hover:bg-primary-focus text-primary-content px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
               <Plus size={16} /> Create Group
            </button>
        </div>
      </div>

      {showCreate && (
          <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300 max-w-md">
              <h2 className="text-lg font-semibold mb-4 text-base-content">Create New Group</h2>
              <form onSubmit={handleCreate((d) => createGroup.mutate(d))} className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium mb-1 text-base-content">Group Name</label>
                      <input type="text" {...registerCreate('name', { required: true })} className="w-full px-3 py-2 border rounded-lg bg-base-200 border-base-300 focus:outline-none focus:ring-2 focus:ring-primary text-base-content" placeholder="e.g. Goa Trip" />
                  </div>
                  <div>
                      <label className="block text-sm font-medium mb-1 text-base-content">Description (Optional)</label>
                      <input type="text" {...registerCreate('description')} className="w-full px-3 py-2 border rounded-lg bg-base-200 border-base-300 focus:outline-none focus:ring-2 focus:ring-primary text-base-content" placeholder="Summer 2026" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-base-content/60 hover:text-base-content">Cancel</button>
                      <button type="submit" disabled={createGroup.isPending} className="bg-primary hover:bg-primary-focus text-primary-content px-4 py-2 rounded-lg font-medium">Create</button>
                  </div>
              </form>
          </div>
      )}

      {showJoin && (
          <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300 max-w-md">
              <h2 className="text-lg font-semibold mb-4 text-base-content">Join Group</h2>
              <form onSubmit={handleJoin((d) => joinGroup.mutate(d))} className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium mb-1 text-base-content">Group Invite Code</label>
                      <input type="text" {...registerJoin('joinCode', { required: true })} className="w-full px-3 py-2 border rounded-lg bg-base-200 border-base-300 focus:outline-none focus:ring-2 focus:ring-primary uppercase font-mono tracking-wider text-base-content" placeholder="ABCDEF" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setShowJoin(false)} className="px-4 py-2 text-base-content/60 hover:text-base-content">Cancel</button>
                      <button type="submit" disabled={joinGroup.isPending} className="bg-primary hover:bg-primary-focus text-primary-content px-4 py-2 rounded-lg font-medium">Join</button>
                  </div>
              </form>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
             <div className="col-span-full py-12 text-center text-base-content/60">Loading your groups...</div>
          ) : groups.length === 0 ? (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-base-300 rounded-2xl">
                  <FolderKanban className="w-12 h-12 text-base-content/30 mx-auto mb-3" />
                  <p className="text-base-content/60">You are not part of any groups yet.</p>
                  <p className="text-sm text-base-content/40 mt-1">Create one or join using an invite code.</p>
              </div>
          ) : (
              groups.map((group: any) => (
                  <Link key={group._id} to={`/groups/${group._id}`} className="block group">
                      <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300 hover:border-primary/50 hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                  <Users size={24} />
                              </div>
                              <span className="text-xs font-mono bg-base-200 text-base-content/60 px-2 py-1 rounded">Code: {group.joinCode}</span>
                          </div>
                          <h3 className="text-lg font-bold text-base-content group-hover:text-primary transition-colors">{group.name}</h3>
                          {group.description && <p className="text-sm text-base-content/60 truncate mt-1">{group.description}</p>}
                      </div>
                  </Link>
              ))
          )}
      </div>

    </div>
  );
}

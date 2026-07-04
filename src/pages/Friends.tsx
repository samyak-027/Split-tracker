import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { UserPlus, Users, Link as LinkIcon, Check } from 'lucide-react';

export default function Friends() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [friendCode, setFriendCode] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const res = await api.get('/friends');
      return res.data;
    }
  });

  const addFriend = useMutation({
    mutationFn: (code: string) => api.post('/friends', { friendCode: code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.success('Friend added successfully!');
      setFriendCode('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Could not add friend');
    }
  });

  const handleCopyCode = () => {
    if(user?.friendCode) {
        navigator.clipboard.writeText(user.friendCode);
        setCopied(true);
        toast.success("Friend code copied");
        setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Friends</h1>
        <p className="text-slate-500 text-sm">Add friends to split expenses with them in groups.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Your Code */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold mb-4">Your Friend Code</h2>
          <p className="text-sm text-slate-500 mb-4">Share this code with your friends so they can add you.</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg text-center font-mono text-xl tracking-widest font-bold">
              {user?.friendCode}
            </div>
            <button 
              onClick={handleCopyCode}
              className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
            >
              {copied ? <Check size={24} /> : <LinkIcon size={24} />}
            </button>
          </div>
        </div>

        {/* Add Friend */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold mb-4">Add a Friend</h2>
          <p className="text-sm text-slate-500 mb-4">Enter your friend's code to add them to your list.</p>
          <form 
            onSubmit={(e) => { e.preventDefault(); if (friendCode) addFriend.mutate(friendCode); }}
            className="flex items-center gap-2"
          >
            <input 
              type="text" 
              value={friendCode}
              onChange={e => setFriendCode(e.target.value.toUpperCase())}
              placeholder="e.g. A1B2C3"
              className="flex-1 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-wider uppercase text-center"
            />
            <button
              type="submit"
              disabled={addFriend.isPending || !friendCode}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <UserPlus size={20} />
            </button>
          </form>
        </div>
      </div>

      {/* Friend List */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users size={20} className="text-slate-400" />
            Your Friends ({friends.length})
        </h2>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            {isLoading ? (
                <div className="p-8 text-center text-slate-500">Loading friends...</div>
            ) : friends.length === 0 ? (
                <div className="p-8 text-center text-slate-500">You haven't added any friends yet.</div>
            ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {friends.map((friend: any) => (
                        <div key={friend._id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold">
                                    {friend.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-slate-100">{friend.name}</p>
                                    <p className="text-xs text-slate-500">{friend.email}</p>
                                </div>
                            </div>
                            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-slate-500">
                                {friend.friendCode}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

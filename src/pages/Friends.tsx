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
        <h1 className="text-2xl font-bold tracking-tight text-base-content">Friends</h1>
        <p className="text-base-content/60 text-sm">Add friends to split expenses with them in groups.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Your Code */}
        <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300">
          <h2 className="text-lg font-semibold mb-4 text-base-content">Your Friend Code</h2>
          <p className="text-sm text-base-content/60 mb-4">Share this code with your friends so they can add you.</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-base-200 border border-base-300 p-3 rounded-lg text-center font-mono text-xl tracking-widest font-bold text-base-content">
              {user?.friendCode}
            </div>
            <button 
              onClick={handleCopyCode}
              className="p-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
            >
              {copied ? <Check size={24} /> : <LinkIcon size={24} />}
            </button>
          </div>
        </div>

        {/* Add Friend */}
        <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300">
          <h2 className="text-lg font-semibold mb-4 text-base-content">Add a Friend</h2>
          <p className="text-sm text-base-content/60 mb-4">Enter your friend's code to add them to your list.</p>
          <form 
            onSubmit={(e) => { e.preventDefault(); if (friendCode) addFriend.mutate(friendCode); }}
            className="flex items-center gap-2"
          >
            <input 
              type="text" 
              value={friendCode}
              onChange={e => setFriendCode(e.target.value.toUpperCase())}
              placeholder="e.g. A1B2C3"
              className="flex-1 px-4 py-3 rounded-lg border border-base-300 bg-base-200 focus:outline-none focus:ring-2 focus:ring-primary font-mono tracking-wider uppercase text-center text-base-content"
            />
            <button
              type="submit"
              disabled={addFriend.isPending || !friendCode}
              className="px-6 py-3 bg-primary hover:bg-primary-focus text-primary-content font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <UserPlus size={20} />
            </button>
          </form>
        </div>
      </div>

      {/* Friend List */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-base-content">
            <Users size={20} className="text-base-content/40" />
            Your Friends ({friends.length})
        </h2>
        <div className="bg-base-100 rounded-2xl shadow-sm border border-base-300 overflow-hidden">
            {isLoading ? (
                <div className="p-8 text-center text-base-content/60">Loading friends...</div>
            ) : friends.length === 0 ? (
                <div className="p-8 text-center text-base-content/60">You haven't added any friends yet.</div>
            ) : (
                <div className="divide-y divide-base-300">
                    {friends.map((friend: any) => (
                        <div key={friend._id} className="p-4 flex items-center justify-between hover:bg-base-200/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-content font-bold">
                                    {friend.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium text-base-content">{friend.name}</p>
                                    <p className="text-xs text-base-content/60">{friend.email}</p>
                                </div>
                            </div>
                            <span className="text-xs font-mono bg-base-200 px-2 py-1 rounded text-base-content/60">
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

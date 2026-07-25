import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LayoutDashboard, Wallet, Receipt, Users, FolderKanban, History, LineChart, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import ThemeToggle from '../components/ThemeToggle';

const navigation = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Personal Expenses', to: '/expenses', icon: Receipt },
  { name: 'Income', to: '/income', icon: Wallet },
  { name: 'Friends', to: '/friends', icon: Users },
  { name: 'Groups', to: '/groups', icon: FolderKanban },
  { name: 'History', to: '/history', icon: History },
  { name: 'Analytics', to: '/analytics', icon: LineChart },
];

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch(e) {}
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-base-200 text-base-content">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-md bg-base-100 shadow-md">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-base-100 border-r border-base-300 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-center h-16 border-b border-base-300">
          <h1 className="text-xl font-bold text-primary">
            SplitTrack
          </h1>
        </div>

        <nav className="flex-1 px-4 mt-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors",
                isActive 
                  ? "bg-primary text-primary-content" 
                  : "text-base-content hover:bg-base-200"
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-base-300">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user?.name}</span>
              <span className="text-xs text-base-content/60">Code: {user?.friendCode}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button onClick={handleLogout} className="p-2 text-base-content/60 hover:text-error transition-colors rounded-lg hover:bg-error/10">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto w-full flex flex-col">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 flex-1 w-full">
          <Outlet />
        </div>
        <footer className="w-full text-center py-6 text-sm text-base-content/60 border-t border-base-300 mt-auto">
          &copy; 2026 SplitTrack. All rights reserved.
        </footer>
      </main>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

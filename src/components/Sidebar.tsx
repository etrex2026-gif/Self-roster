import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  School, 
  Settings as SettingsIcon, 
  LogOut, 
  Moon, 
  Sun,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { useTheme } from './theme-provider';
import { useState } from 'react';
import { cn } from '@/src/lib/utils';

interface SidebarProps {
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ onLogout, isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Classes', path: '/classes', icon: School },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-900 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 text-slate-300 flex flex-col",
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">E</div>
              <h1 className="text-white font-bold tracking-tight text-lg">Ramoda Roster <span className="text-xs font-normal opacity-50">v1.0</span></h1>
            </div>
            {/* Close Button inside Drawer for Mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white md:hidden"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-1">
            {menuItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium",
                  location.pathname === item.path 
                    ? "bg-indigo-600 text-white" 
                    : "hover:bg-slate-800 text-slate-300 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 mt-auto border-t border-slate-800 space-y-1">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 hover:bg-slate-800 text-slate-300 hover:text-white" 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-400/10" 
              onClick={onLogout}
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

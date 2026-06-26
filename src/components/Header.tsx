import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Menu } from 'lucide-react';
import { Button } from './ui/button';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const teacher = useLiveQuery(() => db.teachers.toCollection().first());

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-3 md:gap-4">
        {/* Mobile Sidebar Toggle Button inside the Header */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 md:hidden text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">System Status</span>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold border border-emerald-100 dark:border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="hidden xs:inline">OFFLINE READY</span>
          <span className="xs:hidden">READY</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{teacher?.name || 'Teacher'}</p>
          <p className="text-[10px] font-medium text-slate-400">{teacher?.schoolName || 'School'}</p>
        </div>
        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700">
           <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
             {teacher?.name?.charAt(0) || 'T'}
           </span>
        </div>
      </div>
    </header>
  );
}

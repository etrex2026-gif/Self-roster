import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/button';
import { 
  Users, 
  CalendarDays, 
  Smile, 
  BarChart3, 
  FileSpreadsheet, 
  FileText,
  Calculator
} from 'lucide-react';

export default function ClassSubNav() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const classId = id;

  const navItems = [
    { name: 'Students', path: `/classes/${classId}/students`, icon: Users },
    { name: '1st Sem Marks', path: `/classes/${classId}/marks/1`, icon: CalendarDays },
    { name: '2nd Sem Marks', path: `/classes/${classId}/marks/2`, icon: CalendarDays },
    { name: 'Conduct & Absents', path: `/classes/${classId}/conduct`, icon: Smile },
    { name: 'Calculate Results', path: `/classes/${classId}/analysis`, icon: Calculator },
    { name: 'Class Analysis', path: `/classes/${classId}/analysis`, icon: BarChart3 },
    { name: 'Report Cards', path: `/classes/${classId}/reports`, icon: FileText },
    { name: 'Class Roster', path: `/classes/${classId}/roster`, icon: FileSpreadsheet },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-16 z-20 overflow-x-auto no-scrollbar">
      <div className="mx-auto max-w-7xl px-4 flex items-center h-12">
        {/* Desktop View Tab Nav */}
        <div className="hidden md:flex flex-1 items-center gap-1 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  isActive 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <item.icon className="h-3 w-3" />
                {item.name.replace(' Marks', '').replace(' & Absents', '').replace(' Results', '')}
              </Link>
            );
          })}
        </div>
        <div className="hidden md:block pl-4 border-l border-slate-200 dark:border-slate-800 ml-2">
           <Link to={`/classes/${classId}/reports`}>
             <Button size="sm" className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase tracking-widest gap-2">
                <FileText className="h-3 w-3" />
                Generate Reports
             </Button>
           </Link>
        </div>

        {/* Mobile Dropdown View */}
        <div className="flex md:hidden items-center gap-2 w-full h-12">
          <div className="relative flex-1">
            <select
              value={location.pathname}
              onChange={(e) => navigate(e.target.value)}
              className="w-full h-9 pl-3 pr-8 text-[11px] font-black uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
            >
              {navItems.map((item) => (
                <option key={item.name} value={item.path} className="font-sans normal-case font-medium">
                  {item.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
          <Link to={`/classes/${classId}/reports`}>
            <Button size="sm" className="h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase tracking-widest gap-1">
               <FileText className="h-3 w-3" />
               <span>Reports</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

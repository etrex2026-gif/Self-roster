import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { cn } from '@/src/lib/utils';
import { 
  Users, 
  CalendarDays, 
  Smile, 
  BarChart3, 
  FileSpreadsheet, 
  FileText,
  Calculator
} from 'lucide-react';

export default function ClassDashboard() {
  const { id } = useParams();
  const classId = parseInt(id!);
  const schoolClass = useLiveQuery(() => db.classes.get(classId), [classId]);

  if (!schoolClass) return <div className="p-8 text-center text-slate-500 font-medium">Loading class data...</div>;

  const menuItems = [
    { name: 'Students', path: 'students', icon: Users, description: 'Manage students, enrollment and roll numbers.' },
    { name: 'First Semester', path: 'marks/1', icon: CalendarDays, description: 'Enter academic marks for the first semester session.' },
    { name: 'Second Semester', path: 'marks/2', icon: CalendarDays, description: 'Record student performance for the final semester.' },
    { name: 'Conduct & Absent', path: 'conduct', icon: Smile, description: 'Track behavior, traits and attendance records.' },
    { name: 'Calculate Results', path: 'analysis', icon: Calculator, description: 'Process all semester scores and generate rankings.' },
    { name: 'Analysis', path: 'analysis', icon: BarChart3, description: 'Visualize class performance with charts and stats.' },
    { name: 'Report Cards', path: 'reports', icon: FileText, description: 'Generate individual and bulk student report cards.' },
    { name: 'Roster Sheet', path: 'roster', icon: FileSpreadsheet, description: 'Generate professional rosters and official score sheets.' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em]">{schoolClass.schoolName}</h4>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Grade {schoolClass.grade}{schoolClass.section}</h1>
        <p className="text-slate-500 font-medium">{schoolClass.academicYear} Academic Session</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => (
          <Link key={item.name} to={item.path} className="group">
            <div className="h-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300",
                "bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white text-slate-600 dark:text-slate-400"
              )}>
                <item.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{item.name}</h3>
              <p className="text-sm text-slate-500 font-medium mb-8 flex-1 leading-relaxed">{item.description}</p>
              <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em]">
                Manage Module
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

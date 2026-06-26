import { Outlet, useParams } from 'react-router-dom';
import ClassSubNav from './ClassSubNav';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

export default function ClassLayout() {
  const { id } = useParams();
  const classId = parseInt(id!);
  const schoolClass = useLiveQuery(() => db.classes.get(classId), [classId]);

  if (!schoolClass) return <div className="p-8 text-center text-slate-500 font-medium">Loading class...</div>;

  return (
    <div className="-m-4 md:-m-8">
      <div className="bg-white dark:bg-slate-900 px-8 py-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col gap-1">
          <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em]">{schoolClass.schoolName}</h4>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Grade {schoolClass.grade}{schoolClass.section}</h1>
          <p className="text-slate-500 text-xs font-medium">{schoolClass.academicYear} Academic Session</p>
        </div>
      </div>
      <ClassSubNav />
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <Outlet />
      </div>
    </div>
  );
}

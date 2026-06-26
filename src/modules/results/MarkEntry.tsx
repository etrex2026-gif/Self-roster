import React, { useState } from 'react';
import { cn } from '@/src/lib/utils';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Mark } from '../../db/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { BookOpen, ArrowLeft, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function MarkEntry() {
  const { id, semester } = useParams();
  const classId = parseInt(id!);
  const sem = parseInt(semester!) as 1 | 2;
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const schoolClass = useLiveQuery(() => db.classes.get(classId), [classId]);
  const students = useLiveQuery(
    () => db.students.where('classId').equals(classId).sortBy('rollNo'),
    [classId]
  );
  const marks = useLiveQuery(
    () => db.marks.where({ classId, semester: sem }).toArray(),
    [classId, sem]
  );

  const handleMarkChange = async (studentId: number, score: number | null) => {
    if (score !== null && (score < 0 || score > 100)) return;
    
    const existingMark = await db.marks
      .where({ studentId, semester: sem, subject: selectedSubject })
      .first();

    if (score === null) {
      if (existingMark) {
        await db.marks.delete(existingMark.id!);
      }
      return;
    }

    if (existingMark) {
      await db.marks.update(existingMark.id!, { score });
    } else {
      await db.marks.add({
        studentId,
        classId,
        subject: selectedSubject!,
        semester: sem,
        score
      });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !students) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const scores = text.split(/\s+/).filter(s => s.trim()).map(Number);
      
      if (scores.length > students.length) {
        toast.warning('Imported more scores than students. Extra scores will be ignored.');
      }

      for (let i = 0; i < Math.min(scores.length, students.length); i++) {
        const score = scores[i];
        if (score >= 0 && score <= 100) {
          await handleMarkChange(students[i].id!, score);
        }
      }
      toast.success('Marks imported successfully');
    };
    reader.readAsText(file);
  };

  if (!schoolClass) return null;

  if (!selectedSubject) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-1">
          <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em]">Academic Records</h4>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Semester {sem} Marks</h1>
          <p className="text-slate-500 font-medium">Select a subject below to manage student performance data.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {schoolClass.subjects.map(subject => {
            const subjectMarkCount = marks?.filter(m => m.subject === subject).length ?? 0;
            const progress = students ? Math.round((subjectMarkCount / students.length) * 100) : 0;

            return (
              <div 
                key={subject} 
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                onClick={() => setSelectedSubject(subject)}
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-6">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{subject}</h3>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                  <span>Entry Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs font-medium text-slate-500">
                  {subjectMarkCount} of {students?.length ?? 0} students recorded
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50" onClick={() => setSelectedSubject(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em]">{selectedSubject}</h4>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Semester {sem} Marks</h1>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none gap-2 rounded-xl border-slate-200 h-11 h-12" nativeButton={false} render={
            <label className="cursor-pointer">
              <Upload className="h-4 w-4" />
              Import TXT
              <input type="file" className="hidden" accept=".txt" onChange={handleImport} />
            </label>
          } />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                <TableHead className="w-24 text-[10px] font-bold text-slate-400 uppercase tracking-widest py-5 pl-8">Roll No</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-5">Student Name</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-5 hidden sm:table-cell">Gender</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-5 pr-8">Mark (0-100)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students?.map((student) => {
                const mark = marks?.find(m => m.studentId === student.id && m.subject === selectedSubject);
                const isComplete = mark?.score !== undefined && mark.score >= 0;
                return (
                  <TableRow key={student.id} className="border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <TableCell className="py-4 pl-8">
                      <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                        {student.rollNo}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700 dark:text-slate-200 py-4">{student.fullName}</TableCell>
                    <TableCell className="text-slate-500 font-medium py-4 text-xs uppercase tracking-wider hidden sm:table-cell">{student.gender}</TableCell>
                    <TableCell className="py-4 pr-8">
                      <div className="relative w-32">
                        <Input 
                          type="number"
                          min="0"
                          max="100"
                          value={mark?.score ?? ''}
                          onChange={e => {
                            const value = e.target.value;
                            handleMarkChange(student.id!, value === '' ? null : parseInt(value));
                          }}
                          className={cn(
                            "h-10 rounded-xl transition-all font-bold text-center",
                            isComplete ? "border-emerald-200 bg-emerald-50 text-emerald-700 focus-visible:ring-emerald-500" : "border-slate-200 focus-visible:ring-indigo-500"
                          )}
                        />
                        {isComplete && (
                          <div className="absolute -right-2 -top-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold border-2 border-white shadow-sm">
                            ✓
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

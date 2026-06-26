import React, { useState } from 'react';
import { cn } from '@/src/lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SchoolClass } from '../../db/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/src/components/ui/dialog';
import { Plus, School, Users, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function ClassList() {
  const [isOpen, setIsOpen] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [academicYear, setAcademicYear] = useState('2024/25');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [subjectCount, setSubjectCount] = useState(0);
  const [subjects, setSubjects] = useState<string[]>([]);

  const classes = useLiveQuery(() => db.classes.toArray());
  const teacher = useLiveQuery(() => db.teachers.toCollection().first());

  // Initialize form with teacher info
  useState(() => {
    if (teacher) {
      setSchoolName(teacher.schoolName);
      setTeacherName(teacher.name);
    }
  });

  const handleSubjectCountChange = (count: number) => {
    setSubjectCount(count);
    setSubjects(new Array(count).fill(''));
  };

  const handleSubjectNameChange = (index: number, name: string) => {
    const newSubjects = [...subjects];
    newSubjects[index] = name;
    setSubjects(newSubjects);
  };

  const handleCreateClass = async () => {
    if (!grade || !section || subjects.some(s => !s)) {
      toast.error('Please fill all fields');
      return;
    }

    await db.classes.add({
      schoolName,
      teacherName,
      academicYear,
      grade,
      section,
      subjects
    });

    toast.success('Class created successfully');
    setIsOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setGrade('');
    setSection('');
    setSubjectCount(0);
    setSubjects([]);
  };

  const deleteClass = async (id: number) => {
    if (confirm('Are you sure you want to delete this class and all its data?')) {
      await db.classes.delete(id);
      await db.students.where('classId').equals(id).delete();
      await db.marks.where('classId').equals(id).delete();
      toast.success('Class deleted');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">My Classes</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Class
            </Button>
          } />
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Class</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>School Name</Label>
                <Input value={schoolName} onChange={e => setSchoolName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Teacher Name</Label>
                <Input value={teacherName} onChange={e => setTeacherName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Input value={academicYear} onChange={e => setAcademicYear(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Grade</Label>
                <Input placeholder="e.g. 9" value={grade} onChange={e => setGrade(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Input placeholder="e.g. A" value={section} onChange={e => setSection(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Number of Subjects</Label>
                <Input 
                  type="number" 
                  value={subjectCount} 
                  onChange={e => handleSubjectCountChange(parseInt(e.target.value) || 0)} 
                />
              </div>
            </div>

            {subjects.length > 0 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Subject Names</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {subjects.map((s, i) => (
                    <Input 
                      key={i} 
                      placeholder={`Subject ${i + 1}`} 
                      value={s}
                      onChange={e => handleSubjectNameChange(i, e.target.value)}
                    />
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="mt-6">
              <Button onClick={handleCreateClass}>Create Class</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {classes?.map((c, index) => (
          <ClassCard key={c.id || index} schoolClass={c} onDelete={() => deleteClass(c.id!)} />
        ))}
      </div>

      {classes?.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-dashed">
          <School className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium">No classes yet</h3>
          <p className="text-muted-foreground">Click "Add Class" to get started.</p>
        </div>
      )}
    </div>
  );
}

function ClassCard({ schoolClass, onDelete }: { schoolClass: SchoolClass, onDelete: () => Promise<void> | void, key?: any }) {
  const studentCount = useLiveQuery(() => db.students.where('classId').equals(schoolClass.id!).count());

  return (
    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="h-2 bg-indigo-500"></div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{schoolClass.academicYear}</h4>
            <CardTitle className="text-2xl font-black text-slate-900 dark:text-slate-100">Grade {schoolClass.grade}{schoolClass.section}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-indigo-500" />
            <span>{studentCount ?? 0} Students</span>
          </div>
          <div className="flex items-center gap-1.5">
            <School className="h-4 w-4 text-indigo-500" />
            <span>{schoolClass.subjects.length} Subjects</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-slate-50 dark:bg-slate-800/50 p-4">
        <Link to={`/classes/${schoolClass.id}`} className="w-full">
          <Button variant="ghost" className="w-full justify-between group-hover:text-indigo-600 font-bold transition-colors">
            Manage Class
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

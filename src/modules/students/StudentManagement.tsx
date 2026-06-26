import React, { useState } from 'react';
import { cn } from '@/src/lib/utils';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Student } from '../../db/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/src/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Plus, Upload, Trash2, Edit2, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentManagement() {
  const { id } = useParams();
  const classId = parseInt(id!);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState(15);
  const [dob, setDob] = useState('');
  const [isDropout, setIsDropout] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const students = useLiveQuery(
    () => db.students.where('classId').equals(classId).sortBy('fullName'),
    [classId]
  );

  const filteredStudents = students?.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rollNo.toString().includes(searchTerm)
  );

  const handleSaveStudent = async () => {
    if (!fullName) return toast.error('Full name is required');

    if (editingId) {
      await db.students.update(editingId, { fullName, gender, age, dob, isDropout });
      toast.success('Student updated');
    } else {
      await db.students.add({
        classId,
        fullName,
        gender,
        age,
        dob,
        isDropout,
        rollNo: 0, // Placeholder
        conduct: 'A',
        absent: 0
      });
      toast.success('Student added');
    }

    await reassignRollNumbers();
    setIsOpen(false);
    resetForm();
  };

  const reassignRollNumbers = async () => {
    const allStudents = await db.students.where('classId').equals(classId).sortBy('fullName');
    for (let i = 0; i < allStudents.length; i++) {
      await db.students.update(allStudents[i].id!, { rollNo: i + 1 });
    }
  };

  const resetForm = () => {
    setFullName('');
    setGender('Male');
    setAge(15);
    setDob('');
    setIsDropout(false);
    setEditingId(null);
  };

  const handleEdit = (student: Student) => {
    setEditingId(student.id!);
    setFullName(student.fullName);
    setGender(student.gender);
    setAge(student.age);
    setDob(student.dob || '');
    setIsDropout(!!student.isDropout);
    setIsOpen(true);
  };

  const handleDelete = async (studentId: number) => {
    if (confirm('Are you sure you want to delete this student?')) {
      await db.students.delete(studentId);
      await db.marks.where('studentId').equals(studentId).delete();
      await reassignRollNumbers();
      toast.success('Student deleted');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      
      const newStudents: Student[] = lines.map(line => {
        // Format: Name.Gender.Age
        const [name, g, a] = line.split('.').map(s => s.trim());
        return {
          classId,
          fullName: name,
          gender: g || 'Male',
          age: parseInt(a) || 15,
          rollNo: 0,
          conduct: 'A',
          absent: 0
        };
      });

      await db.students.bulkAdd(newStudents);
      await reassignRollNumbers();
      toast.success(`Imported ${newStudents.length} students`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-slate-500 font-medium">{students?.length ?? 0} Students currently enrolled</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Button variant="outline" className="w-full gap-2 rounded-xl border-slate-200 h-11" nativeButton={false} render={
              <label className="cursor-pointer">
                <Upload className="h-4 w-4" />
                Import Data
                <input type="file" className="hidden" accept=".txt" onChange={handleImport} />
              </label>
            } />
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger render={
              <Button className="flex-1 md:flex-none gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 h-11 px-6 shadow-lg shadow-indigo-600/20">
                <Plus className="h-4 w-4" />
                Add Student
              </Button>
            } />
            <DialogContent className="rounded-3xl border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">{editingId ? 'Edit Student' : 'Add New Student'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</Label>
                  <Input 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    placeholder="Full Name" 
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Age</Label>
                    <Input 
                      type="number" 
                      value={age} 
                      onChange={e => setAge(parseInt(e.target.value) || 0)} 
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date of Birth</Label>
                  <Input 
                    type="date" 
                    value={dob} 
                    onChange={e => setDob(e.target.value)} 
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <input 
                    type="checkbox" 
                    id="isDropout"
                    checked={isDropout}
                    onChange={e => setIsDropout(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Label htmlFor="isDropout" className="text-sm font-bold text-slate-700 cursor-pointer">Student has dropped out</Label>
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={handleSaveStudent}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by name or roll number..." 
              className="pl-11 h-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 focus:ring-indigo-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                <TableHead className="w-24 text-[10px] font-bold text-slate-400 uppercase tracking-widest py-5 pl-8">Roll No</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-5">Full Name</TableHead>
                <TableHead className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest py-5">Gender</TableHead>
                <TableHead className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest py-5 hidden sm:table-cell">Age</TableHead>
                <TableHead className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest py-5 hidden md:table-cell">DOB</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-5 pr-8 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents?.map((student) => (
                <TableRow key={student.id} className="border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <TableCell className="font-bold text-slate-900 dark:text-white py-4 pl-8">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs">
                      {student.rollNo}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold text-slate-700 dark:text-slate-200 py-4">{student.fullName}</TableCell>
                  <TableCell className="py-4 text-center">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      student.gender === 'Male' ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-pink-50 text-pink-600 border border-pink-100"
                    )}>
                      {student.gender}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500 font-medium py-4 text-center hidden sm:table-cell">{student.age} Years</TableCell>
                  <TableCell className="text-slate-500 font-medium py-4 text-center hidden md:table-cell">{student.dob || '-'}</TableCell>
                  <TableCell className="py-4 pr-8 text-right space-x-1">
                    <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-indigo-600 transition-all" onClick={() => handleEdit(student)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-red-500 transition-all" onClick={() => handleDelete(student.id!)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredStudents?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium">
                    No students found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { toast } from 'sonner';

export default function ConductAbsent() {
  const { id } = useParams();
  const classId = parseInt(id!);
  
  const students = useLiveQuery(
    () => db.students.where('classId').equals(classId).sortBy('rollNo'),
    [classId]
  );

  const handleUpdate = async (studentId: number, field: 'conduct' | 'absent', value: any) => {
    await db.students.update(studentId, { [field]: value });
  };

  const handleBulkUpdate = async (field: 'conduct' | 'absent', value: any) => {
    if (!students) return;
    for (const student of students) {
      await db.students.update(student.id!, { [field]: value });
    }
    toast.success('Bulk update completed');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conduct & Absent</h1>
          <p className="text-muted-foreground">Manage student behavior and attendance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Bulk Conduct</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Select onValueChange={v => handleBulkUpdate('conduct', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Set all to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Bulk Absent</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input 
              type="number" 
              placeholder="Set all to..." 
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleBulkUpdate('absent', parseInt((e.target as HTMLInputElement).value) || 0);
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Roll No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="w-40">Conduct</TableHead>
                  <TableHead className="w-40">Absent Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students?.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.rollNo}</TableCell>
                    <TableCell>{student.fullName}</TableCell>
                    <TableCell>
                      <Select value={student.conduct} onValueChange={v => handleUpdate(student.id!, 'conduct', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={student.absent} 
                        onChange={e => handleUpdate(student.id!, 'absent', parseInt(e.target.value) || 0)} 
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

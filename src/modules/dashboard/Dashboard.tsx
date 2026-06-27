import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Plus, Users, BookOpen, FileText, Download, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Dashboard() {
  const stats = useLiveQuery(async () => {
    const classCount = await db.classes.count();
    const studentCount = await db.students.count();
    const classes = await db.classes.toArray();
    const subjectCount = classes.reduce((acc, curr) => acc + curr.subjects.length, 0);
    const markCount = await db.marks.count();
    
    return {
      classes: classCount,
      students: studentCount,
      subjects: subjectCount,
      reports: markCount > 0 ? studentCount : 0 // Simplified estimate
    };
  });

  async function handleBackup() {
    const data = {
      teachers: await db.teachers.toArray(),
      classes: await db.classes.toArray(),
      students: await db.students.toArray(),
      marks: await db.marks.toArray(),
      settings: await db.settings.toArray()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `school-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success('Backup downloaded');
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        await db.transaction('rw', db.teachers, db.classes, db.students, db.marks, db.settings, async () => {
          await db.teachers.clear();
          await db.classes.clear();
          await db.students.clear();
          await db.marks.clear();
          await db.settings.clear();
          
          if (data.teachers) await db.teachers.bulkAdd(data.teachers);
          if (data.classes) await db.classes.bulkAdd(data.classes);
          if (data.students) await db.students.bulkAdd(data.students);
          if (data.marks) await db.marks.bulkAdd(data.marks);
          if (data.settings) await db.settings.bulkAdd(data.settings);
        });
        toast.success('Restore successful');
        window.location.reload();
      } catch (err) {
        toast.error('Invalid backup file');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your school management overview.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/import-reports">
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Upload className="h-4 w-4" />
              Import Roster → Report Card
            </Button>
          </Link>
          <Link to="/classes">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Class
            </Button>
          </Link>
          <Button variant="outline" className="gap-2" onClick={handleBackup}>
            <Download className="h-4 w-4" />
            Backup
          </Button>
          <div className="relative">
            <Button variant="outline" className="gap-2" nativeButton={false} render={
              <label className="cursor-pointer">
                <Upload className="h-4 w-4" />
                Restore
                <input type="file" className="hidden" accept=".json" onChange={handleRestore} />
              </label>
            } />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Classes" value={stats?.classes ?? 0} icon={School} color="text-blue-600" />
        <StatCard title="Total Students" value={stats?.students ?? 0} icon={Users} color="text-green-600" />
        <StatCard title="Total Subjects" value={stats?.subjects ?? 0} icon={BookOpen} color="text-purple-600" />
        <StatCard title="Generated Reports" value={stats?.reports ?? 0} icon={FileText} color="text-orange-600" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link to="/classes" className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <School className="h-8 w-8 mb-2 text-primary" />
              <span className="font-medium text-sm">Manage Classes</span>
            </Link>
            <Link to="/settings" className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <SettingsIcon className="h-8 w-8 mb-2 text-primary" />
              <span className="font-medium text-sm">Settings</span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value }: any) {
  return (
    <Card className="rounded-2xl shadow-sm border-slate-200 dark:border-slate-800">
      <CardContent className="p-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100">{value}</h3>
      </CardContent>
    </Card>
  );
}

import { School, Settings as SettingsIcon } from 'lucide-react';

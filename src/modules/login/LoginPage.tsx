import { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';
import { Label } from '@/src/components/ui/label';
import { toast } from 'sonner';

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');

  useEffect(() => {
    checkTeacher();
  }, []);

  async function checkTeacher() {
    const teacherCount = await db.teachers.count();
    setIsFirstTime(teacherCount === 0);
  }

  async function handleAction() {
    if (isFirstTime) {
      if (!name || !password || !schoolName) {
        toast.error('Please fill all fields');
        return;
      }
      await db.teachers.add({ name, password, schoolName });
      toast.success('Account created successfully');
      onLogin();
    } else {
      const teacher = await db.teachers.where('password').equals(password).first();
      if (teacher) {
        toast.success('Welcome back, ' + teacher.name);
        onLogin();
      } else {
        toast.error('Invalid password');
      }
    }
  }

  if (isFirstTime === null) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-slate-900 dark:bg-slate-800 p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center text-white font-black mx-auto mb-6 text-2xl shadow-lg shadow-indigo-500/20">E</div>
          <h2 className="text-white text-3xl font-black tracking-tight">EduPortal</h2>
          <p className="text-slate-400 text-sm mt-2 font-medium">Teacher Result Management System</p>
        </div>
        <div className="p-10 space-y-6">
          <div className="space-y-1 text-center mb-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {isFirstTime ? 'Setup Your Account' : 'Welcome Back'}
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              {isFirstTime ? 'Let\'s get your school system ready.' : 'Enter your security password to continue.'}
            </p>
          </div>
          
          <div className="space-y-4">
            {isFirstTime && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Teacher Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. John Doe" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-12 rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school" className="text-xs font-bold text-slate-400 uppercase tracking-widest">School Name</Label>
                  <Input 
                    id="school" 
                    placeholder="e.g. Hope Academy" 
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                    className="h-12 rounded-xl border-slate-200"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAction()}
                className="h-12 rounded-xl border-slate-200"
              />
            </div>
          </div>
          
          <Button className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]" onClick={handleAction}>
            {isFirstTime ? 'Initialize System' : 'Access Dashboard'}
          </Button>

          {!isFirstTime && (
            <p className="text-center text-xs text-slate-400 font-medium">
              Forgot password? Contact system administrator.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

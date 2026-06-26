import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { toast } from 'sonner';

export default function Settings() {
  const teacher = useLiveQuery(() => db.teachers.toCollection().first());
  
  const [name, setName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Yaada Rules state
  const [passMale, setPassMale] = useState('Darbe');
  const [passFemale, setPassFemale] = useState('Dabarte');
  const [failMale, setFailMale] = useState('Hin Darbine');
  const [failFemale, setFailFemale] = useState('Hin Darbine');
  const [dropoutText, setDropoutText] = useState('Hin Xummure');

  const settingsData = useLiveQuery(() => db.settings.where('key').equals('yaadaRules').first());

  useState(() => {
    if (teacher) {
      setName(teacher.name);
      setSchoolName(teacher.schoolName);
    }
  });

  useState(() => {
    if (settingsData) {
      const rules = settingsData.value;
      setPassMale(rules.passMale || 'Darbe');
      setPassFemale(rules.passFemale || 'Dabarte');
      setFailMale(rules.failMale || 'Hin Darbine');
      setFailFemale(rules.failFemale || 'Hin Darbine');
      setDropoutText(rules.dropoutText || 'Hin Xummure');
    }
  });

  const handleUpdateProfile = async () => {
    if (!teacher) return;
    await db.teachers.update(teacher.id!, { name, schoolName });
    toast.success('Profile updated');
  };

  const handleSaveYaadaRules = async () => {
    const rules = {
      passMale,
      passFemale,
      failMale,
      failFemale,
      dropoutText
    };

    if (settingsData) {
      await db.settings.update(settingsData.id!, { value: rules });
    } else {
      await db.settings.add({ key: 'yaadaRules', value: rules });
    }
    toast.success('Yaada rules updated');
  };

  const handleChangePassword = async () => {
    if (!teacher) return;
    if (currentPassword !== teacher.password) {
      toast.error('Current password incorrect');
      return;
    }
    if (!newPassword) {
      toast.error('New password cannot be empty');
      return;
    }
    await db.teachers.update(teacher.id!, { password: newPassword });
    toast.success('Password changed successfully');
    setCurrentPassword('');
    setNewPassword('');
  };

  if (!teacher) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Teacher Profile</CardTitle>
            <CardDescription>Update your personal and school information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>School Name</Label>
              <Input value={schoolName} onChange={e => setSchoolName(e.target.value)} />
            </div>
            <Button onClick={handleUpdateProfile}>Update Profile</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Change your login password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input 
                type="password" 
                value={currentPassword} 
                onChange={e => setCurrentPassword(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
              />
            </div>
            <Button variant="destructive" onClick={handleChangePassword}>Change Password</Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Yaada Rules (Result Status Text)</CardTitle>
            <CardDescription>Configure the status text displayed in rosters based on student results and gender.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Pass (Male)</Label>
                <Input value={passMale} onChange={e => setPassMale(e.target.value)} placeholder="e.g., Darbe" />
              </div>
              <div className="space-y-2">
                <Label>Pass (Female)</Label>
                <Input value={passFemale} onChange={e => setPassFemale(e.target.value)} placeholder="e.g., Dabarte" />
              </div>
              <div className="space-y-2">
                <Label>Fail (Male)</Label>
                <Input value={failMale} onChange={e => setFailMale(e.target.value)} placeholder="e.g., Hin Darbine" />
              </div>
              <div className="space-y-2">
                <Label>Fail (Female)</Label>
                <Input value={failFemale} onChange={e => setFailFemale(e.target.value)} placeholder="e.g., Hin Darbine" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Dropout Text</Label>
                <Input value={dropoutText} onChange={e => setDropoutText(e.target.value)} placeholder="e.g., Hin Xummure" />
              </div>
            </div>
            <Button onClick={handleSaveYaadaRules}>Save Yaada Rules</Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Technical details about the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">1.0.0 (Offline)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Database Engine</span>
              <span className="font-medium">IndexedDB (Dexie.js)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Storage Usage</span>
              <span className="font-medium">Local Browser Storage</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-red-700">Factory Reset</CardTitle>
            <CardDescription className="text-red-600/80">Delete all saved data and restore the application to its default state.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
                variant="destructive" 
                onClick={async () => {
                  const confirmation = window.prompt("This action will permanently delete all data stored in this application.\n\nType RESET to confirm.");
                  if (confirmation === 'RESET') {
                    await db.delete();
                    localStorage.clear();
                    sessionStorage.clear();
                    toast.success('Factory reset completed successfully. The application will now restart.');
                    setTimeout(() => {
                      window.location.reload();
                    }, 1000);
                  } else if (confirmation !== null) {
                    toast.error('Invalid confirmation string. Reset cancelled.');
                  }
                }}
            >
                Factory Reset
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

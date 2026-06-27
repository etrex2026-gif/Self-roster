import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { FileUp, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportAllReportCards } from '@/src/lib/pdf-export';

export default function ReportCardImporter() {
  const [setupData, setSetupData] = useState({
    schoolName: '',
    teacherName: '',
    grade: '',
    section: '',
    academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    subjects: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importedStudents, setImportedStudents] = useState<any[]>([]);

  const [importErrors, setImportErrors] = useState<string[]>([]);

  const parseJsonRoster = (data: any) => {
    const students = Array.isArray(data) ? data : [data];
    const results: any[] = [];
    const errors: string[] = [];
    const allSubjects = new Set<string>();
    
    students.forEach((s: any, index: number) => {
      try {
        if (!s.studentId || !s.personalInfo) {
          throw new Error(`Missing studentId or personalInfo`);
        }

        const normalizeSubjects = (subjects: any) => {
          if (!subjects) return {};
          const normalized: any = {};
          Object.entries(subjects).forEach(([key, val]) => {
            const subName = key.trim();
            normalized[subName] = typeof val === 'number' ? val : Number(val) || 0;
            allSubjects.add(subName);
          });
          return normalized;
        };

        const s1Subs = normalizeSubjects(s.semester1?.subjects);
        const s2Subs = normalizeSubjects(s.semester2?.subjects);
        const finalSubs = normalizeSubjects(s.final?.subjectsAverage);

        const subjectScores: any = {};
        const studentSubjects = Array.from(new Set([
          ...Object.keys(s1Subs),
          ...Object.keys(s2Subs),
          ...Object.keys(finalSubs)
        ]));

        studentSubjects.forEach(sub => {
          subjectScores[sub] = {
            sem1: s1Subs[sub],
            sem2: s2Subs[sub],
            average: finalSubs[sub]
          };
        });

        results.push({
          studentId: s.studentId,
          fullName: s.personalInfo.fullName || 'Unknown',
          gender: s.personalInfo.sex || s.personalInfo.gender || '-',
          age: s.personalInfo.age || '-',
          conduct: s.conduct ?? "A",
          absent: s.absent ?? 0,
          subjectScores,
          sem1Total: Number(s.semester1?.total) || 0,
          sem2Total: Number(s.semester2?.total) || 0,
          totalScore: Number(s.final?.total) || 0,
          sem1Avg: Number(s.semester1?.average) || 0,
          sem2Avg: Number(s.semester2?.average) || 0,
          generalAverage: Number(s.final?.average) || 0,
          sem1Rank: s.semester1?.rank || '-',
          sem2Rank: s.semester2?.rank || '-',
          rank: s.final?.rank || '-'
        });
      } catch (err) {
        errors.push(`Student #${index + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    });

    setImportErrors(errors);

    if (results.length === 0 && errors.length > 0) {
      throw new Error(`Failed to import any students: \n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
    }
    
    // Update subjects in setup data
    setSetupData(prev => ({ ...prev, subjects: Array.from(allSubjects) }));
    
    return results;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!setupData.schoolName || !setupData.teacherName || !setupData.grade) {
      setError("Please complete the Setup form before uploading.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setImportedStudents([]);

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const content = evt.target?.result as string;
            let students: any[] = [];
            
            if (file.name.endsWith('.json')) {
              const jsonData = JSON.parse(content);
              students = parseJsonRoster(jsonData);
            } else {
              throw new Error("Only JSON files are supported for complete academic import.");
            }
            
            setImportedStudents(students);
            setLoading(false);
            
            // AUTOMATIC GENERATION START
            setGenerating(true);
            // We need to use the latest setupData including detected subjects
            const finalSetup = {
              ...setupData,
              subjects: Array.from(new Set(students.flatMap(s => Object.keys(s.subjectScores))))
            };
            await exportAllReportCards(students, finalSetup, (p) => setProgress(p));
            setGenerating(false);
            setSuccess("Report cards generated successfully. Your PDF download has started.");
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLoading(false);
            setGenerating(false);
        }
    };
    reader.onerror = () => {
        setError('Unable to read roster data');
        setLoading(false);
    };
    
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Import Report Cards from JSON</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Setup Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>School Name</Label>
            <Input value={setupData.schoolName} onChange={(e) => setSetupData({...setupData, schoolName: e.target.value})} placeholder="e.g. Bright Future Academy" />
          </div>
          <div className="space-y-2">
            <Label>Homeroom Teacher</Label>
            <Input value={setupData.teacherName} onChange={(e) => setSetupData({...setupData, teacherName: e.target.value})} placeholder="e.g. Mr. Smith" />
          </div>
          <div className="space-y-2">
            <Label>Grade</Label>
            <Input value={setupData.grade} onChange={(e) => setSetupData({...setupData, grade: e.target.value})} placeholder="e.g. 7" />
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Input value={setupData.section} onChange={(e) => setSetupData({...setupData, section: e.target.value})} placeholder="e.g. A" />
          </div>
          <div className="space-y-2">
            <Label>Academic Year</Label>
            <Input value={setupData.academicYear} onChange={(e) => setSetupData({...setupData, academicYear: e.target.value})} placeholder="e.g. 2024-2025" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Upload JSON Roster</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
              <div className="flex items-center gap-2 text-red-600 mb-4 p-3 bg-red-50 rounded-lg border border-red-100">
                  <AlertCircle size={20} />
                  <pre className="text-xs whitespace-pre-wrap">{error}</pre>
              </div>
          )}
          {importErrors.length > 0 && !error && (
              <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex items-center gap-2 text-amber-700 mb-2 font-bold text-sm">
                      <AlertCircle size={16} />
                      Imported with {importErrors.length} issues
                  </div>
                  <ul className="text-[10px] text-amber-600 list-disc pl-4 max-h-24 overflow-y-auto">
                      {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
              </div>
          )}
          {success && (
              <div className="flex items-center gap-2 text-emerald-600 mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <CheckCircle2 size={20} />
                  <p className="font-medium">{success}</p>
              </div>
          )}
          
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 flex flex-col items-center justify-center gap-6 text-slate-500 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group">
            {loading || generating ? (
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={64} className="animate-spin text-emerald-600" />
                    <div className="text-center">
                        <p className="font-bold text-slate-900 text-lg">{loading ? "Validating JSON..." : "Generating Report Cards..."}</p>
                        {generating && (
                            <div className="mt-2 w-64 bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div className="bg-emerald-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                        )}
                        <p className="text-sm text-slate-500 mt-1">{progress}% complete</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileUp size={40} className="text-slate-400 group-hover:text-emerald-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-900 text-xl">Upload Your JSON File</p>
                      <p className="text-slate-500 mt-1">Extract all academic results and generate PDFs instantly</p>
                    </div>
                    <Input type="file" onChange={handleFileUpload} className="hidden" id="file-upload" accept=".json" />
                    <Button 
                        size="lg" 
                        onClick={() => document.getElementById('file-upload')?.click()}
                        className="bg-slate-900 hover:bg-emerald-600 px-8 rounded-xl h-12 shadow-lg"
                    >
                        Browse JSON File
                    </Button>
                </>
            )}
          </div>
        </CardContent>
      </Card>

      {importedStudents.length > 0 && !generating && (
        <Card className="border-emerald-100 bg-emerald-50/10">
          <CardHeader>
            <CardTitle className="text-emerald-900">Import Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Students</p>
                    <p className="text-2xl font-black text-emerald-600">{importedStudents.length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conduct</p>
                    <p className="text-2xl font-black text-slate-900">A (Default)</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Format</p>
                    <p className="text-2xl font-black text-slate-900">Full Year</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                    <p className="text-2xl font-black text-emerald-600">Ready</p>
                </div>
            </div>
            
            <div className="mt-6">
                <h3 className="font-bold text-slate-900 mb-3">Sample Preview</h3>
                <div className="overflow-hidden border rounded-xl bg-white">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="px-4 py-3 font-bold text-slate-600">Full Name</th>
                        <th className="px-4 py-3 font-bold text-slate-600 text-center">Sex</th>
                        <th className="px-4 py-3 font-bold text-slate-600 text-center">Final Avg</th>
                        <th className="px-4 py-3 font-bold text-slate-600 text-center">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importedStudents.slice(0, 5).map((student, idx) => (
                        <tr key={idx} className="border-b hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">{student.fullName}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{student.gender}</td>
                          <td className="px-4 py-3 text-center font-bold text-emerald-600">{student.generalAverage}</td>
                          <td className="px-4 py-3 text-center text-slate-900 font-bold">{student.rank}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


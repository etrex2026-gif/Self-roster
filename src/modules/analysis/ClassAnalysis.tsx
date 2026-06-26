import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { calculateClassResults } from '../../lib/calculations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Download, Printer, FileSpreadsheet, TrendingUp, Users, Award, BookOpen } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ClassAnalysis() {
  const { id } = useParams();
  const classId = parseInt(id!);

  const data = useLiveQuery(async () => {
    const schoolClass = await db.classes.get(classId);
    const students = await db.students.where('classId').equals(classId).toArray();
    const marks = await db.marks.where('classId').equals(classId).toArray();
    const settings = await db.settings.where('key').equals('yaadaRules').first();
    
    if (!schoolClass || students.length === 0) return null;

    const results = calculateClassResults(students, marks, schoolClass);
    const yaadaRules = settings?.value || {
      passMale: 'Darbe',
      passFemale: 'Dabarte',
      failMale: 'Hin Darbine',
      failFemale: 'Hin Darbine',
      dropoutText: 'Hin Xummure'
    };
    
    // Detailed Subject Analysis
    const subjectAnalysis = schoolClass.subjects.map(subject => {
      const subjectScores = results
        .filter(r => !r.isDropout)
        .map(r => r.subjectScores[subject]?.average)
        .filter(s => s !== null && s !== undefined) as number[];

      const passCount = results.filter(r => !r.isDropout && (r.subjectScores[subject]?.average ?? 0) >= 50).length;
      const totalCount = results.filter(r => !r.isDropout && r.subjectScores[subject]?.average !== null).length;

      return {
        subject,
        max: subjectScores.length > 0 ? Math.max(...subjectScores) : 0,
        min: subjectScores.length > 0 ? Math.min(...subjectScores) : 0,
        avg: subjectScores.length > 0 ? subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length : 0,
        passCount,
        failCount: totalCount - passCount,
        passRate: totalCount > 0 ? (passCount / totalCount) * 100 : 0,
        failRate: totalCount > 0 ? ((totalCount - passCount) / totalCount) * 100 : 0
      };
    });

    const activeResults = results.filter(r => !r.isDropout);
    const top10 = [...activeResults].sort((a, b) => b.generalAverage - a.generalAverage).slice(0, 10);
    const bottom10 = [...activeResults].sort((a, b) => a.generalAverage - b.generalAverage).slice(0, 10);
    const highest = top10[0];
    const lowest = [...activeResults].sort((a, b) => a.generalAverage - b.generalAverage)[0];

    const maleResults = activeResults.filter(r => r.gender === 'Male');
    const femaleResults = activeResults.filter(r => r.gender === 'Female');
    const maleAvg = maleResults.length > 0 ? maleResults.reduce((a, b) => a + b.generalAverage, 0) / maleResults.length : 0;
    const femaleAvg = femaleResults.length > 0 ? femaleResults.reduce((a, b) => a + b.generalAverage, 0) / femaleResults.length : 0;

    const passedCount = activeResults.filter(r => r.generalAverage >= 50).length;
    const failedCount = activeResults.length - passedCount;
    const dropoutCount = results.filter(r => r.isDropout).length;

    return { 
      schoolClass, 
      results, 
      subjectAnalysis, 
      top10, 
      bottom10, 
      highest, 
      lowest, 
      maleAvg, 
      femaleAvg,
      passedCount,
      failedCount,
      dropoutCount,
      yaadaRules,
      activeCount: activeResults.length,
      classAvg: activeResults.length > 0 ? activeResults.reduce((a, b) => a + b.generalAverage, 0) / activeResults.length : 0
    };
  }, [classId]);

  const exportPDF = () => {
    if (!data) return;
    const { schoolClass, results, subjectAnalysis, top10, highest, classAvg, activeCount, passedCount, failedCount, dropoutCount, maleAvg, femaleAvg, yaadaRules } = data;

    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Header
    doc.setFontSize(20);
    doc.text(`${schoolClass.schoolName.toUpperCase()}`, 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`Class Performance Analysis Report`, 105, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Grade: ${schoolClass.grade}${schoolClass.section} | Year: ${schoolClass.academicYear}`, 105, 28, { align: 'center' });

    // Summary Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("CLASS SUMMARY", 14, 40);
    autoTable(doc, {
      startY: 42,
      head: [['Metric', 'Value']],
      body: [
        ['Total Students', String(results.length)],
        ['Active Students', String(activeCount)],
        ['Passed Students', String(passedCount)],
        ['Failed Students', String(failedCount)],
        ['Dropouts', String(dropoutCount)],
        ['Class Average', classAvg.toFixed(2)],
        ['Male Average', data.maleAvg.toFixed(2)],
        ['Female Average', data.femaleAvg.toFixed(2)],
        ['Pass Rate', `${((passedCount / activeCount) * 100).toFixed(1)}%`],
      ],
      theme: 'grid'
    });

    // Subject Performance
    doc.text("SUBJECT PERFORMANCE", 14, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 12,
      head: [['Subject', 'Max', 'Min', 'Average', 'Pass Rate']],
      body: subjectAnalysis.map(s => [
        s.subject,
        s.max.toFixed(1),
        s.min.toFixed(1),
        s.avg.toFixed(1),
        `${s.passRate.toFixed(1)}%`
      ]),
      theme: 'grid'
    });

    // Top 10 Students
    doc.text("TOP 10 STUDENTS", 14, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 12,
      head: [['Rank', 'Name', 'Average', 'Status']],
      body: top10.map((s, idx) => [
        idx + 1,
        s.fullName,
        s.generalAverage.toFixed(2),
        s.status
      ]),
      theme: 'grid'
    });

    doc.save(`analysis-${schoolClass.grade}${schoolClass.section}.pdf`);
  };

  const exportExcel = () => {
    if (!data) return;
    const { subjectAnalysis, top10, yaadaRules } = data;
    
    const wb = XLSX.utils.book_new();
    
    const subjectData = subjectAnalysis.map(s => ({
      'Subject': s.subject,
      'Highest Mark': s.max.toFixed(1),
      'Lowest Mark': s.min.toFixed(1),
      'Average Mark': s.avg.toFixed(1),
      'Pass Rate': `${s.passRate.toFixed(1)}%`
    }));
    const ws1 = XLSX.utils.json_to_sheet(subjectData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Subject Analysis');

    const topStudentsData = top10.map((s, idx) => ({
      'Rank': idx + 1,
      'Name': s.fullName,
      'Average': s.generalAverage.toFixed(2),
      'Status': s.status
    }));
    const ws2 = XLSX.utils.json_to_sheet(topStudentsData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Top 10 Students');

    XLSX.writeFile(wb, `class-analysis-${data.schoolClass.grade}${data.schoolClass.section}.xlsx`);
  };

  if (!data) return <div className="text-center py-20">Loading analysis...</div>;

  const getYaadaText = (r: any, rules: any) => {
    if (r.isDropout) return rules.dropoutText;
    const isPass = r.generalAverage >= 50;
    const isMale = r.gender === 'Male';
    
    if (isPass) {
      return isMale ? rules.passMale : rules.passFemale;
    } else {
      return isMale ? rules.failMale : rules.failFemale;
    }
  };

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
        <div className="flex flex-col gap-1">
          <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em]">Data Insights</h4>
          <h1 className="text-2xl font-black tracking-tight">Class Analysis Dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none gap-2 rounded-xl h-11" onClick={exportPDF}>
            <Download className="h-4 w-4" />
            <span className="inline sm:hidden md:inline">Export PDF</span>
            <span className="hidden sm:inline md:hidden">PDF</span>
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none gap-2 rounded-xl h-11" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            <span>Excel</span>
          </Button>
          <Button className="flex-1 sm:flex-none gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 h-11 px-4 sm:px-6 shadow-lg shadow-slate-900/20" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Class Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Class Average', value: data.classAvg.toFixed(2), icon: TrendingUp, color: 'text-indigo-600' },
          { label: 'Pass Rate', value: `${((data.passedCount / data.activeCount) * 100).toFixed(1)}%`, icon: Award, color: 'text-green-600' },
          { label: 'Highest Student', value: `${data.highest?.fullName} (${data.highest?.generalAverage.toFixed(1)})`, icon: Users, color: 'text-slate-900' },
          { label: 'Lowest Student', value: `${data.lowest?.fullName} (${data.lowest?.generalAverage.toFixed(1)})`, icon: Users, color: 'text-red-900' },
        ].map((stat, i) => (
          <Card key={i} className="rounded-2xl border-none shadow-md overflow-hidden bg-white dark:bg-slate-900">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className={`text-xl font-black ${stat.color} truncate`}>{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Male Average', value: data.maleAvg.toFixed(2), icon: Users, color: 'text-blue-600' },
          { label: 'Female Average', value: data.femaleAvg.toFixed(2), icon: Users, color: 'text-pink-600' },
          { label: 'Total Passed', value: data.passedCount, icon: Award, color: 'text-green-600' },
          { label: 'Total Failed', value: data.failedCount, icon: Award, color: 'text-red-600' },
        ].map((stat, i) => (
          <Card key={i} className="rounded-2xl border-none shadow-md overflow-hidden bg-white dark:bg-slate-900">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subject Average Chart */}
        <Card className="rounded-3xl border-slate-200 shadow-xl overflow-hidden">
          <CardHeader>
            <CardTitle>Subject Performance (Average)</CardTitle>
            <CardDescription>Average score across all students for each subject.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.subjectAnalysis}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="subject" fontSize={10} tick={{ fill: '#64748b' }} />
                <YAxis fontSize={10} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                  {data.subjectAnalysis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pass Rate Chart */}
        <Card className="rounded-3xl border-slate-200 shadow-xl overflow-hidden">
          <CardHeader>
            <CardTitle>Pass Rate by Subject (%)</CardTitle>
            <CardDescription>Percentage of students who scored 50% or more.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.subjectAnalysis} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} fontSize={10} />
                <YAxis dataKey="subject" type="category" fontSize={10} width={80} />
                <Tooltip 
                  formatter={(value: any) => [`${value.toFixed(1)}%`, 'Pass Rate']}
                />
                <Bar dataKey="passRate" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Max vs Min Chart */}
      <Card className="rounded-3xl border-slate-200 shadow-xl overflow-hidden">
        <CardHeader>
          <CardTitle>Subject Performance (Max vs Min)</CardTitle>
          <CardDescription>Comparison of highest and lowest scores in each subject.</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.subjectAnalysis}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="subject" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Legend />
              <Bar dataKey="max" name="Highest Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="min" name="Lowest Score" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top 10 Students */}
        <Card className="rounded-3xl border-slate-200 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Top 10 Students
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Rank</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="text-right">Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.top10.map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-center font-black text-slate-400">{i + 1}</TableCell>
                      <TableCell className="font-bold">{s.fullName}</TableCell>
                      <TableCell className="text-right font-black text-indigo-600">{s.generalAverage.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Bottom 10 Students */}
        <Card className="rounded-3xl border-slate-200 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-500 rotate-180" />
              Bottom 10 Students
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Rank</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="text-right">Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.bottom10.map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-center font-black text-slate-400">{i + 1}</TableCell>
                      <TableCell className="font-bold">{s.fullName}</TableCell>
                      <TableCell className="text-right font-black text-red-600">{s.generalAverage.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Performance Table */}
      <Card className="rounded-3xl border-slate-200 shadow-xl overflow-hidden">
        <CardHeader>
          <CardTitle>Complete Subject Analysis</CardTitle>
          <CardDescription>Detailed statistical breakdown for every subject course.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-900">
                <TableHead>Subject Name</TableHead>
                <TableHead className="text-center">Max Mark</TableHead>
                <TableHead className="text-center">Min Mark</TableHead>
                <TableHead className="text-center">Average</TableHead>
                <TableHead className="text-center">Pass Count</TableHead>
                <TableHead className="text-center">Fail Count</TableHead>
                <TableHead className="text-center">Pass Rate</TableHead>
                <TableHead className="text-center">Fail Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.subjectAnalysis.map(s => (
                <TableRow key={s.subject}>
                  <TableCell className="font-black uppercase">{s.subject}</TableCell>
                  <TableCell className="text-center font-bold text-blue-600">{s.max.toFixed(1)}</TableCell>
                  <TableCell className="text-center font-bold text-red-600">{s.min.toFixed(1)}</TableCell>
                  <TableCell className="text-center font-black">{s.avg.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-medium">{s.passCount}</TableCell>
                  <TableCell className="text-center font-medium">{s.failCount}</TableCell>
                  <TableCell className="text-center font-black text-green-600">{s.passRate.toFixed(1)}%</TableCell>
                  <TableCell className="text-center font-black text-red-600">{s.failRate.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

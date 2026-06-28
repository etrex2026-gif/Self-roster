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
    const top10 = [...activeResults]
      .sort((a, b) => {
        if (a.rank !== b.rank) {
          return a.rank - b.rank;
        }
        if (b.generalAverage !== a.generalAverage) {
          return b.generalAverage - a.generalAverage;
        }
        return b.totalScore - a.totalScore;
      })
      .slice(0, 10);
    const bottom10 = [...activeResults]
      .sort((a, b) => {
        if (b.rank !== a.rank) {
          return b.rank - a.rank;
        }
        if (a.generalAverage !== b.generalAverage) {
          return a.generalAverage - b.generalAverage;
        }
        return a.totalScore - b.totalScore;
      })
      .slice(0, 10);
    const highest = top10[0];
    const lowest = [...activeResults].sort((a, b) => a.generalAverage - b.generalAverage)[0];

    const maleResults = activeResults.filter(r => r.gender === 'Male');
    const femaleResults = activeResults.filter(r => r.gender === 'Female');
    const maleAvg = maleResults.length > 0 ? maleResults.reduce((a, b) => a + b.generalAverage, 0) / maleResults.length : 0;
    const femaleAvg = femaleResults.length > 0 ? femaleResults.reduce((a, b) => a + b.generalAverage, 0) / femaleResults.length : 0;

    const passedCount = activeResults.filter(r => r.generalAverage >= 50).length;
    const failedCount = activeResults.length - passedCount;
    const dropoutCount = results.filter(r => r.isDropout).length;

    const registeredCountM = results.filter(r => r.gender === 'Male').length;
    const registeredCountF = results.filter(r => r.gender === 'Female').length;
    const registeredCountT = results.length;

    const satCountM = activeResults.filter(r => r.gender === 'Male').length;
    const satCountF = activeResults.filter(r => r.gender === 'Female').length;
    const satCountT = activeResults.length;

    const passedCountM = activeResults.filter(r => r.generalAverage >= 50 && r.gender === 'Male').length;
    const passedCountF = activeResults.filter(r => r.generalAverage >= 50 && r.gender === 'Female').length;
    const passedCountT = activeResults.filter(r => r.generalAverage >= 50).length;

    const failedCountM = activeResults.filter(r => r.generalAverage < 50 && r.gender === 'Male').length;
    const failedCountF = activeResults.filter(r => r.generalAverage < 50 && r.gender === 'Female').length;
    const failedCountT = activeResults.filter(r => r.generalAverage < 50).length;

    const dropoutCountM = results.filter(r => r.isDropout && r.gender === 'Male').length;
    const dropoutCountF = results.filter(r => r.isDropout && r.gender === 'Female').length;
    const dropoutCountT = results.filter(r => r.isDropout).length;

    const summaryStats = {
      registered: { m: registeredCountM, f: registeredCountF, t: registeredCountT },
      sat: { m: satCountM, f: satCountF, t: satCountT },
      passed: { m: passedCountM, f: passedCountF, t: passedCountT },
      failed: { m: failedCountM, f: failedCountF, t: failedCountT },
      dropout: { m: dropoutCountM, f: dropoutCountF, t: dropoutCountT }
    };

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
      summaryStats,
      yaadaRules,
      activeCount: activeResults.length,
      classAvg: activeResults.length > 0 ? activeResults.reduce((a, b) => a + b.generalAverage, 0) / activeResults.length : 0
    };
  }, [classId]);

  const exportPDF = () => {
    if (!data) return;
    const { schoolClass, results, subjectAnalysis, top10, highest, classAvg, activeCount, passedCount, failedCount, dropoutCount, maleAvg, femaleAvg, summaryStats, yaadaRules } = data;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const marginSide = 14;

    // --- PAGE 1 ---
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(`${schoolClass.schoolName.toUpperCase()}`, 105, 18, { align: 'center' });
    
    doc.setFontSize(15);
    doc.text(`CLASS PERFORMANCE ANALYSIS REPORT`, 105, 25, { align: 'center' });
    doc.setFontSize(13);
    doc.text(`GABAASA XIINXALA KUTAA BARNOOTAA`, 105, 31, { align: 'center' });

    // Header Separator Line
    doc.setLineWidth(0.6);
    doc.setDrawColor(15, 23, 42);
    doc.line(14, 35, 196, 35);

    // Section 1: School Information / Odeeffannoo Mana Barumsaa
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("1. School Information / Odeeffannoo Mana Barumsaa", 14, 43);

    autoTable(doc, {
      startY: 46,
      body: [
        [
          { content: "School Name / Maqaa Mana Barumsaa", styles: { fontStyle: 'bold', fillColor: [245, 247, 250] } },
          { content: schoolClass.schoolName, styles: { fontStyle: 'bold' } },
          { content: "Academic Year / Bara Barnootaa", styles: { fontStyle: 'bold', fillColor: [245, 247, 250] } },
          { content: schoolClass.academicYear, styles: { fontStyle: 'bold' } }
        ],
        [
          { content: "Grade & Section / Kutaa & Daree", styles: { fontStyle: 'bold', fillColor: [245, 247, 250] } },
          { content: `${schoolClass.grade} ${schoolClass.section}`, styles: { fontStyle: 'bold' } },
          { content: "Homeroom Teacher / Barsiisaa I/G", styles: { fontStyle: 'bold', fillColor: [245, 247, 250] } },
          { content: schoolClass.teacherName || "N/A", styles: { fontStyle: 'bold' } }
        ]
      ],
      theme: 'grid',
      styles: { fontSize: 11, cellPadding: 3, lineColor: [80, 80, 80], lineWidth: 0.2 },
      columnStyles: {
        0: { halign: 'left', cellWidth: 46 },
        1: { halign: 'left', cellWidth: 45 },
        2: { halign: 'left', cellWidth: 46 },
        3: { halign: 'left', cellWidth: 45 }
      },
      margin: { left: 14, right: 14 }
    });

    // Section 2: Student Statistics / Lakkoofsa Barattootaa
    const nextY1 = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("2. Student Statistics / Lakkoofsa Barattootaa", 14, nextY1);

    autoTable(doc, {
      startY: nextY1 + 3,
      head: [['Category / Garee', 'Male / Dhiira', 'Female / Dubartii', 'Total / Waligala']],
      body: [
        ['Registered Students / Barattoota Galmaa\'an', String(summaryStats.registered.m), String(summaryStats.registered.f), String(summaryStats.registered.t)],
        ['Students Who Sat for Examination / Kan Qoraman', String(summaryStats.sat.m), String(summaryStats.sat.f), String(summaryStats.sat.t)],
        ['Passed Students / Barattoota Darban', String(summaryStats.passed.m), String(summaryStats.passed.f), String(summaryStats.passed.t)],
        ['Failed Students / Barattoota Kufan', String(summaryStats.failed.m), String(summaryStats.failed.f), String(summaryStats.failed.t)],
        ['Dropout Students / Barattoota Addaan Citan', String(summaryStats.dropout.m), String(summaryStats.dropout.f), String(summaryStats.dropout.t)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 12, halign: 'center' },
      bodyStyles: { fontSize: 11, fontStyle: 'bold', cellPadding: 3, lineColor: [80, 80, 80], lineWidth: 0.2 },
      columnStyles: {
        0: { halign: 'left', cellWidth: 92 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 30 }
      },
      margin: { left: 14, right: 14 }
    });

    // Section 3: Result Statistics / Bu'aa Qormaataa
    const nextY2 = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("3. Result Statistics / Bu'aa Qormaataa", 14, nextY2);

    autoTable(doc, {
      startY: nextY2 + 3,
      head: [['Metric / Safartuu', 'Value / Gatii']],
      body: [
        ['Class Average / Giddugaleessa Kutaa', `${classAvg.toFixed(2)}%`],
        ['Male Average / Giddugaleessa Dhiiraa', `${data.maleAvg.toFixed(2)}%`],
        ['Female Average / Giddugaleessa Dubartootaa', `${data.femaleAvg.toFixed(2)}%`],
        ['Pass Rate / Reejjii Darbiinsaa', `${((passedCount / activeCount) * 100).toFixed(1)}%`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 12, halign: 'center' },
      bodyStyles: { fontSize: 11, fontStyle: 'bold', cellPadding: 3, lineColor: [80, 80, 80], lineWidth: 0.2 },
      columnStyles: {
        0: { halign: 'left', cellWidth: 122 },
        1: { halign: 'center', cellWidth: 60 }
      },
      margin: { left: 14, right: 14 }
    });

    // Page 1 Footer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text("Page 1 of 2", 105, 285, { align: 'center' });


    // --- PAGE 2 ---
    doc.addPage();

    // Page 2 Running Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${schoolClass.schoolName.toUpperCase()} - GRADE ${schoolClass.grade}${schoolClass.section}`, 14, 15);
    doc.setFont('helvetica', 'normal');
    doc.text(`Academic Year: ${schoolClass.academicYear}`, 196, 15, { align: 'right' });
    doc.setLineWidth(0.3);
    doc.setDrawColor(15, 23, 42);
    doc.line(14, 18, 196, 18);

    // Section 4: Top 10 Students / Barattoota 10 Ol'aanaa
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("4. Top 10 Students / Barattoota 10 Ol'aanaa", 14, 26);

    autoTable(doc, {
      startY: 29,
      head: [['Rank / Sadarkaa', 'Student Name / Maqaa Barataa', 'Total Marks / Walitti Ida\'ama Qabxii', 'Average / Giddugaleessa']],
      body: top10.map((s, idx) => [
        s.rank || (idx + 1),
        s.fullName,
        s.totalScore.toFixed(2),
        `${s.generalAverage.toFixed(2)}%`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 12, halign: 'center' },
      bodyStyles: { fontSize: 11, fontStyle: 'bold', cellPadding: 2.5, lineColor: [80, 80, 80], lineWidth: 0.2 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 25 },
        1: { halign: 'left', cellWidth: 77 },
        2: { halign: 'right', cellWidth: 40 },
        3: { halign: 'right', cellWidth: 40 }
      },
      margin: { left: 14, right: 14 }
    });

    // Section 5: Summary & Subject Performance / Cuunfaa fi Hoji-raawwii Barnootaa
    const nextY3 = (doc as any).lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("5. Summary & Subject Performance / Cuunfaa fi Hoji-raawwii Barnootaa", 14, nextY3);

    autoTable(doc, {
      startY: nextY3 + 3,
      head: [['Subject / Barnoota', 'Highest / Ol\'aanaa', 'Lowest / Gad-aanaa', 'Average / Giddugaleessa', 'Pass Rate / Reejjii Darbiinsaa']],
      body: subjectAnalysis.map(s => [
        s.subject,
        s.max.toFixed(1),
        s.min.toFixed(1),
        s.avg.toFixed(1),
        `${s.passRate.toFixed(1)}%`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 12, halign: 'center' },
      bodyStyles: { fontSize: 11, fontStyle: 'bold', cellPadding: 2.5, lineColor: [80, 80, 80], lineWidth: 0.2 },
      columnStyles: {
        0: { halign: 'left', cellWidth: 62 },
        1: { halign: 'right', cellWidth: 30 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 30 }
      },
      margin: { left: 14, right: 14 }
    });

    // Teacher's Remarks Area
    const remarksY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("Yaada fi Gorsa Barsiisaa / Teacher's Remarks & Recommendations:", 14, remarksY);
    
    doc.setLineWidth(0.1);
    doc.setDrawColor(180, 180, 180);
    doc.line(14, remarksY + 7, 196, remarksY + 7);
    doc.line(14, remarksY + 14, 196, remarksY + 14);

    // Signature Area
    const sigY = remarksY + 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    
    doc.text("_____________________________", 14, sigY);
    doc.text("Barsiisaa Daree / Homeroom Teacher", 14, sigY + 5);
    doc.text("Mallattoo / Signature", 14, sigY + 9);

    doc.text("_____________________________", 130, sigY);
    doc.text("Duree Mana Barumsaa / Director", 130, sigY + 5);
    doc.text("Mallattoo / Signature", 130, sigY + 9);

    // Page 2 Footer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text("Page 2 of 2", 105, 285, { align: 'center' });

    doc.save(`analysis-${schoolClass.grade}${schoolClass.section}.pdf`);
  };

  const exportExcel = () => {
    if (!data) return;
    const { subjectAnalysis, top10, summaryStats, yaadaRules } = data;
    
    const wb = XLSX.utils.book_new();
    
    const summaryData = [
      { 'Category': 'Registered Students', 'Male (Dhi)': summaryStats.registered.m, 'Female (Dub)': summaryStats.registered.f, 'Total': summaryStats.registered.t },
      { 'Category': 'Students Who Sat for Exam (Kan Qoraman)', 'Male (Dhi)': summaryStats.sat.m, 'Female (Dub)': summaryStats.sat.f, 'Total': summaryStats.sat.t },
      { 'Category': 'Passed Students', 'Male (Dhi)': summaryStats.passed.m, 'Female (Dub)': summaryStats.passed.f, 'Total': summaryStats.passed.t },
      { 'Category': 'Failed Students', 'Male (Dhi)': summaryStats.failed.m, 'Female (Dub)': summaryStats.failed.f, 'Total': summaryStats.failed.t },
      { 'Category': 'Dropout Students', 'Male (Dhi)': summaryStats.dropout.m, 'Female (Dub)': summaryStats.dropout.f, 'Total': summaryStats.dropout.t },
    ];
    const ws0 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws0, 'Class Summary');

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
      'Rank': s.rank || (idx + 1),
      'Student Name': s.fullName,
      'Total': Number(s.totalScore.toFixed(2)),
      'Average': Number(s.generalAverage.toFixed(2))
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

      {/* Comprehensive Statistical Analysis Table */}
      <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-xl font-black">Comprehensive Statistical Summary</CardTitle>
          <CardDescription>
            Detailed analysis of registered, tested, passed, failed, and dropout students by gender.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/30 dark:bg-slate-900/30">
                <TableHead className="font-bold text-slate-700 dark:text-slate-200">Category</TableHead>
                <TableHead className="text-center font-bold text-slate-700 dark:text-slate-200">Dhi (Male)</TableHead>
                <TableHead className="text-center font-bold text-slate-700 dark:text-slate-200">Dub (Female)</TableHead>
                <TableHead className="text-center font-bold text-slate-700 dark:text-slate-200">Total (Waliigala)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { label: 'Registered Students', stats: data.summaryStats.registered, bg: '' },
                { label: 'Students Who Sat for Exam (Kan Qoraman)', stats: data.summaryStats.sat, bg: 'bg-indigo-50/40 dark:bg-indigo-950/10 font-semibold' },
                { label: 'Passed Students', stats: data.summaryStats.passed, bg: 'text-green-600 dark:text-green-400 font-semibold' },
                { label: 'Failed Students', stats: data.summaryStats.failed, bg: 'text-red-600 dark:text-red-400 font-semibold' },
                { label: 'Dropout Students', stats: data.summaryStats.dropout, bg: 'text-slate-500 font-semibold' }
              ].map((row, index) => (
                <TableRow key={index} className={`${row.bg} hover:bg-slate-50/50`}>
                  <TableCell className="font-bold">{row.label}</TableCell>
                  <TableCell className="text-center text-base">{row.stats.m}</TableCell>
                  <TableCell className="text-center text-base">{row.stats.f}</TableCell>
                  <TableCell className="text-center text-lg font-black">{row.stats.t}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                    <TableHead className="w-16 text-center font-bold">Rank</TableHead>
                    <TableHead className="font-bold">Student Name</TableHead>
                    <TableHead className="text-right font-bold">Total</TableHead>
                    <TableHead className="text-right font-bold">Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.top10.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-center font-black text-slate-500">{s.rank}</TableCell>
                      <TableCell className="font-semibold text-slate-800 dark:text-slate-150">{s.fullName}</TableCell>
                      <TableCell className="text-right font-medium text-slate-600 dark:text-slate-400">{s.totalScore.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-black text-indigo-600 dark:text-indigo-400">{s.generalAverage.toFixed(2)}%</TableCell>
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
                    <TableHead className="w-16 text-center font-bold">Rank</TableHead>
                    <TableHead className="font-bold">Student Name</TableHead>
                    <TableHead className="text-right font-bold">Total</TableHead>
                    <TableHead className="text-right font-bold">Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.bottom10.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-center font-black text-slate-500">{s.rank}</TableCell>
                      <TableCell className="font-semibold text-slate-800 dark:text-slate-150">{s.fullName}</TableCell>
                      <TableCell className="text-right font-medium text-slate-600 dark:text-slate-400">{s.totalScore.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-black text-red-600 dark:text-red-400">{s.generalAverage.toFixed(2)}%</TableCell>
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

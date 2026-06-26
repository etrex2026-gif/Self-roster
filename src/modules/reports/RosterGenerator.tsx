import React from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { calculateClassResults } from '../../lib/calculations';
import { Card, CardContent } from '@/src/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Button } from '@/src/components/ui/button';
import { Download, Printer, FileSpreadsheet } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getLetterFromAverage } from '../../types';

export default function RosterGenerator() {
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

    return { schoolClass, results, yaadaRules };
  }, [classId]);

  const getYaadaText = (r: any, rules: any, overrideAvg?: number) => {
    if (r.isDropout) return rules.dropoutText;
    const avg = overrideAvg !== undefined ? overrideAvg : r.generalAverage;
    const isPass = avg >= 50;
    const isMale = r.gender === 'Male';
    
    if (isPass) {
      return isMale ? rules.passMale : rules.passFemale;
    } else {
      return isMale ? rules.failMale : rules.failFemale;
    }
  };

  const calculateSubjectSums = (results: any[], subjects: string[]) => {
    const sums: Record<string, number> = {};
    subjects.forEach(s => {
      sums[s] = results.reduce((acc, r) => acc + (r.subjectScores[s]?.average || 0), 0);
    });
    return sums;
  };

  const calculateStats = (results: any[]) => {
    const active = results.filter(r => !r.isDropout);
    const pass = active.filter(r => r.generalAverage >= 50);
    const fail = active.filter(r => r.generalAverage < 50);
    const drop = results.filter(r => r.isDropout);

    return {
      reg: { m: results.filter(r => r.gender === 'Male').length, f: results.filter(r => r.gender === 'Female').length, t: results.length },
      pass: { m: pass.filter(r => r.gender === 'Male').length, f: pass.filter(r => r.gender === 'Female').length, t: pass.length },
      fail: { m: fail.filter(r => r.gender === 'Male').length, f: fail.filter(r => r.gender === 'Female').length, t: fail.length },
      drop: { m: drop.filter(r => r.gender === 'Male').length, f: drop.filter(r => r.gender === 'Female').length, t: drop.length }
    };
  };

  const exportPDF = () => {
    if (!data) return;
    const { schoolClass, results, yaadaRules } = data;

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const subjects = schoolClass.subjects;

    const studentsPerPage = 6;
    const chunks = [];
    for (let i = 0; i < results.length; i += studentsPerPage) {
      chunks.push(results.slice(i, i + studentsPerPage));
    }

    chunks.forEach((chunk, pageIndex) => {
      if (pageIndex > 0) doc.addPage('a4', 'l');

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(schoolClass.schoolName.toUpperCase(), pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(8);
      doc.text(`BARA BARNOOTAA (ACADEMIC YEAR): ${schoolClass.academicYear}`, 14, 25);
      doc.text(`KUTAA & DAREE (GRADE & SECTION): ${schoolClass.grade}${schoolClass.section}`, pageWidth / 2 + 10, 25);
      doc.text(`BARSIISAA I/GAFATAMAA DAREE (HOMEROOM TEACHER): ${schoolClass.teacherName}`, 14, 30);
      doc.text(`WALIGALA BARATTOOTA (TOTAL GRADE STUDENTS): ${results.length}`, pageWidth / 2 + 10, 30);
      doc.text(`PAGE: ${pageIndex + 1} OF ${chunks.length}`, pageWidth - 14, 30, { align: 'right' });

      const head = [
        [
          { content: 'T/L (S/N)', rowSpan: 2 },
          { content: 'MAQAA GUUTUU (STUDENT FULL NAME)', rowSpan: 2 },
          { content: 'SAALA (SEX)', rowSpan: 2 },
          { content: 'UMRII (AGE)', rowSpan: 2 },
          { content: 'SEEM (TERM)', rowSpan: 2 },
          { content: 'GOSA BARNOOTAA (SUBJECT COURSES)', colSpan: subjects.length },
          { content: 'WALIIGALA BARNOOTAA (ACADEMIC RESULTS SUMMARY)', colSpan: 7 }
        ],
        [
          ...subjects.map(s => s.substring(0, 3).toUpperCase()),
          'IDA (TOT)', 'AVE', 'SAD (RNK)', 'YAADA', 'AMALA (CONDUCT)', 'HAFTE'
        ]
      ];

      const body: any[] = [];
      chunk.forEach((r, idxInChunk) => {
        const studentIdx = pageIndex * studentsPerPage + idxInChunk;
        
        // 1ffaa
        const row1 = [
          { content: String(studentIdx + 1), rowSpan: 3 },
          { content: r.fullName.toUpperCase(), rowSpan: 3 },
          { content: r.gender === 'Male' ? 'Dhi' : 'Dub', rowSpan: 3 },
          { content: String(r.age), rowSpan: 3 },
          '1ffaa'
        ];
        subjects.forEach(s => row1.push(r.isDropout ? '-' : String(r.subjectScores[s].sem1 ?? '-')));
        row1.push(
          r.isDropout ? '-' : String(r.sem1Total?.toFixed(1) || '-'),
          r.isDropout ? '-' : String(r.sem1Avg?.toFixed(1) || '-'),
          { content: r.isDropout ? '-' : String(r.sem1Rank || '-'), rowSpan: 1 },
          { content: getYaadaText(r, yaadaRules).toUpperCase(), rowSpan: 3 },
          { content: String(r.conduct || '-'), rowSpan: 3 },
          { content: String(r.absent || 0), rowSpan: 3 }
        );
        body.push(row1);

        // 2ffaa
        const row2: any[] = ['2ffaa'];
        subjects.forEach(s => row2.push(r.isDropout ? '-' : String(r.subjectScores[s].sem2 ?? '-')));
        row2.push(
          r.isDropout ? '-' : String(r.sem2Total?.toFixed(1) || '-'),
          r.isDropout ? '-' : String(r.sem2Avg?.toFixed(1) || '-'),
          r.isDropout ? '-' : String(r.sem2Rank || '-')
        );
        body.push(row2);

        // Ave
        const row3: any[] = ['Ave'];
        subjects.forEach(s => row3.push(r.isDropout ? '-' : String(r.subjectScores[s].average?.toFixed(1) || '-')));
        row3.push(
          r.isDropout ? '-' : r.totalScore.toFixed(1),
          r.isDropout ? '-' : r.generalAverage.toFixed(1),
          r.isDropout ? '-' : String(r.rank)
        );
        body.push(row3);
      });

      autoTable(doc, {
        head: head,
        body: body,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 6.5, cellPadding: 1, halign: 'center', valign: 'middle', lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.2 },
        columnStyles: {
          1: { halign: 'left', cellWidth: 35 },
          4: { fontStyle: 'italic', fontSize: 5.5 }
        }
      });

      const stats = calculateStats(chunk);
      const finalY = (doc as any).lastAutoTable.finalY + 5;
      
      const footerTable = (title: string, s: { m: number, f: number, t: number }, x: number) => {
        autoTable(doc, {
          startY: finalY,
          head: [[{ content: title, colSpan: 3, styles: { halign: 'center', fontSize: 6, fillColor: [240, 240, 240], textColor: [0, 0, 0] } }], ['Dhiira (M)', 'Dubartii (F)', 'Ida\'ama (T)']],
          body: [[s.m, s.f, s.t]],
          theme: 'grid',
          styles: { fontSize: 6, halign: 'center', cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
          headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
          margin: { left: x },
          tableWidth: 65
        });
      };

      footerTable("Barattoota Galma'an (Registered)", stats.reg, 14);
      footerTable("Barattoota Darban (Passed)", stats.pass, 82);
      footerTable("Barattoota Kufan (Failed)", stats.fail, 150);
      footerTable("Barattoota Addaan Kutan (Dropout)", stats.drop, 218);

      // Signature Section
      const sigY = 175;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);

      // Teacher (Left Column)
      doc.text(`Maqaa Barsiisaa/Barsiistuu (Homeroom Teacher Name): ${schoolClass.teacherName}`, 20, sigY);
      doc.line(20, sigY + 3, 100, sigY + 3);
      doc.text("Mallattoo (Signature):", 20, sigY + 9);
      doc.line(20, sigY + 12, 100, sigY + 12);
      doc.text("Guyyaa (Date):", 20, sigY + 18);
      doc.line(20, sigY + 21, 100, sigY + 21);

      // Director (Right Column)
      doc.text("M/I/G (Director Name):", 160, sigY);
      doc.line(160, sigY + 3, 240, sigY + 3);
      doc.text("Mallattoo (Signature):", 160, sigY + 9);
      doc.line(160, sigY + 12, 240, sigY + 12);
      doc.text("Guyyaa (Date):", 160, sigY + 18);
      doc.line(160, sigY + 21, 240, sigY + 21);
    });

    doc.save(`Roster_${schoolClass.grade}${schoolClass.section}.pdf`);
  };

  const exportExcel = async () => {
    if (!data) return;
    const { schoolClass, results, yaadaRules } = data;
    const { Workbook } = await import('exceljs');
    const { saveAs } = await import('file-saver');

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Roster');

    const subjects = schoolClass.subjects;
    const numCols = 11 + subjects.length;

    // Page Setup
    worksheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { top: 0.5, left: 0.5, bottom: 0.5, right: 0.5, header: 0.2, footer: 0.2 },
      printTitlesRow: '1:5'
    };

    const studentsPerPage = 6;
    const chunks = [];
    for (let i = 0; i < results.length; i += studentsPerPage) {
      chunks.push(results.slice(i, i + studentsPerPage));
    }

    chunks.forEach((chunk, pageIndex) => {
      // Header
      const headerRow = worksheet.addRow([]);
      headerRow.height = 30;
      worksheet.mergeCells(worksheet.rowCount, 1, worksheet.rowCount, numCols);
      const titleCell = worksheet.getCell(worksheet.rowCount, 1);
      titleCell.value = schoolClass.schoolName.toUpperCase();
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Info rows
      worksheet.addRow(['Academic Year:', schoolClass.academicYear, '', '', '', '', '', '', '', '', '', 'Grade & Section:', `${schoolClass.grade}${schoolClass.section}`]);
      worksheet.addRow(['Homeroom Teacher:', schoolClass.teacherName, '', '', '', '', '', '', '', '', '', 'Total Students:', results.length]);
      
      // Table Header
      const headRow1 = worksheet.addRow(['S/N', 'Full Name', 'Sex', 'Age', 'Sem', ...subjects.map(() => ''), 'Summary', '', '', '', '', '']);
      const headRow2 = worksheet.addRow(['', '', '', '', '', ...subjects, 'Tot', 'Ave', 'Rnk', 'G/H', 'Yaada', 'Hafte']);
      
      // Formatting header
      [headRow1, headRow2].forEach(row => {
        row.eachCell(cell => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        });
      });

      // Merge header cells
      worksheet.mergeCells(worksheet.rowCount - 1, 1, worksheet.rowCount, 1); // S/N
      worksheet.mergeCells(worksheet.rowCount - 1, 2, worksheet.rowCount, 2); // Full Name
      worksheet.mergeCells(worksheet.rowCount - 1, 3, worksheet.rowCount, 3); // Sex
      worksheet.mergeCells(worksheet.rowCount - 1, 4, worksheet.rowCount, 4); // Age
      worksheet.mergeCells(worksheet.rowCount - 1, 5, worksheet.rowCount, 5); // Sem
      worksheet.mergeCells(worksheet.rowCount - 1, 6, worksheet.rowCount - 1, 5 + subjects.length); // Subjects
      worksheet.mergeCells(worksheet.rowCount - 1, 6 + subjects.length, worksheet.rowCount - 1, 11 + subjects.length); // Summary

      // Student rows
      chunk.forEach((r, idxInChunk) => {
        const studentIdx = pageIndex * studentsPerPage + idxInChunk;
        const row1 = worksheet.addRow([studentIdx + 1, r.fullName, r.gender === 'Male' ? 'Dhi' : 'Dub', r.age, '1st', ...subjects.map(s => r.subjectScores[s].sem1 || '-'), r.sem1Total?.toFixed(1) || '-', r.sem1Avg?.toFixed(1) || '-', r.sem1Rank || '-', getLetterFromAverage(r.generalAverage), getYaadaText(r, yaadaRules), r.absent ?? 0]);
        const row2 = worksheet.addRow(['', '', '', '', '2nd', ...subjects.map(s => r.subjectScores[s].sem2 || '-'), r.sem2Total?.toFixed(1) || '-', r.sem2Avg?.toFixed(1) || '-', r.sem2Rank || '-', '', '', '']);
        const row3 = worksheet.addRow(['', '', '', '', 'Ave', ...subjects.map(s => r.subjectScores[s].average?.toFixed(1) || '-'), r.totalScore.toFixed(1), r.generalAverage.toFixed(1), r.rank, '', '', '']);

        [row1, row2, row3].forEach(row => {
            row.eachCell(cell => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });
        });
        
        // Merge student columns
        [1, 2, 3, 4, 6 + subjects.length, 7 + subjects.length, 8 + subjects.length, 9 + subjects.length, 10 + subjects.length, 11 + subjects.length].forEach(col => {
            worksheet.mergeCells(row1.number, col, row3.number, col);
        });
      });
      
      // Statistics section (Horizontal)
      worksheet.addRow([]);
      const stats = calculateStats(chunk);
      const statData = [
          { title: "Registered", s: stats.reg },
          { title: "Passed", s: stats.pass },
          { title: "Failed", s: stats.fail },
          { title: "Dropout", s: stats.drop }
      ];
      
      const statsStartRow = worksheet.rowCount + 1;
      
      // Title row
      const titleRow = worksheet.addRow([statData[0].title, '', '', statData[1].title, '', '', statData[2].title, '', '', statData[3].title, '', '']);
      // Labels
      const labelRow = worksheet.addRow(['M', 'F', 'T', 'M', 'F', 'T', 'M', 'F', 'T', 'M', 'F', 'T']);
      // Values
      const dataRow = worksheet.addRow([statData[0].s.m, statData[0].s.f, statData[0].s.t, statData[1].s.m, statData[1].s.f, statData[1].s.t, statData[2].s.m, statData[2].s.f, statData[2].s.t, statData[3].s.m, statData[3].s.f, statData[3].s.t]);
      
      [titleRow, labelRow, dataRow].forEach(row => {
          row.eachCell(cell => {
              cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
              cell.alignment = { horizontal: 'center' };
          });
      });
      
      // Merge titles
      [1, 4, 7, 10].forEach(col => worksheet.mergeCells(titleRow.number, col, titleRow.number, col + 2));
      
      const newRow = worksheet.addRow([]);
      newRow.addPageBreak();
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Roster_${schoolClass.grade}${schoolClass.section}.xlsx`);
  };

  if (!data) return <div className="text-center py-20 text-slate-400 italic">Generating roster...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
        <div className="flex flex-col gap-1">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Roster Generator</h4>
          <h1 className="text-2xl font-black tracking-tight">Class Score Sheet</h1>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none gap-2 rounded-xl h-11" onClick={exportPDF}>
            <Download className="h-4 w-4" />
            <span>PDF</span>
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none gap-2 rounded-xl h-11" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            <span>Excel</span>
          </Button>
          <Button className="flex-1 sm:flex-none gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 h-11 px-6 shadow-lg" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-xl print:shadow-none print:border-none">
        <div className="p-8 border-b bg-white text-center space-y-2">
          <h2 className="text-4xl font-black uppercase tracking-widest text-slate-900">{data.schoolClass.schoolName}</h2>
          
          <div className="grid grid-cols-2 gap-8 text-left max-w-4xl mx-auto pt-6 border-t border-slate-100">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bara Barnootaa (Academic Year)</p>
              <p className="text-sm font-bold text-slate-900">{data.schoolClass.academicYear}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">Barsiisaa I/Gafatamaa Daree (Homeroom Teacher)</p>
              <p className="text-sm font-bold text-slate-900">{data.schoolClass.teacherName}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kutaa & Daree (Grade & Section)</p>
              <p className="text-sm font-bold text-slate-900">{data.schoolClass.grade}{data.schoolClass.section}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">Waligala Barattoota (Total Students)</p>
              <p className="text-sm font-bold text-slate-900">{data.results.length}</p>
            </div>
          </div>
        </div>

        <CardContent className="p-0 overflow-x-auto">
          <Table className="border-collapse border border-slate-900">
            <TableHeader>
              <TableRow className="bg-white border-b border-slate-900">
                <TableHead rowSpan={2} className="w-12 text-center border-r border-slate-900 font-black text-[9px] uppercase">T/L (S/N)</TableHead>
                <TableHead rowSpan={2} className="min-w-[200px] border-r border-slate-900 font-black text-[9px] uppercase">Maqaa Guutuu (Full Name)</TableHead>
                <TableHead rowSpan={2} className="w-12 text-center border-r border-slate-900 font-black text-[9px] uppercase">Saala (Sex)</TableHead>
                <TableHead rowSpan={2} className="w-12 text-center border-r border-slate-900 font-black text-[9px] uppercase">Umrii (Age)</TableHead>
                <TableHead rowSpan={2} className="w-20 text-center border-r border-slate-900 font-black text-[9px] uppercase">Seem (Term)</TableHead>
                <TableHead colSpan={data.schoolClass.subjects.length} className="text-center border-r border-slate-900 font-black text-[10px] uppercase py-2 bg-slate-50">Gosa Barnootaa (Subject Courses)</TableHead>
                <TableHead colSpan={6} className="text-center font-black text-[10px] uppercase py-2 bg-slate-50">Waliigala Barnootaa (Summary)</TableHead>
              </TableRow>
              <TableRow className="bg-white border-b border-slate-900">
                {data.schoolClass.subjects.map(s => (
                  <TableHead key={s} className="text-center border-r border-slate-900 font-black text-[8px] uppercase py-1">{s.substring(0, 3)}</TableHead>
                ))}
                <TableHead className="text-center border-r border-slate-900 font-black text-[8px] uppercase">Ida (Tot)</TableHead>
                <TableHead className="text-center border-r border-slate-900 font-black text-[8px] uppercase">Ave</TableHead>
                <TableHead className="text-center border-r border-slate-900 font-black text-[8px] uppercase">Sad (Rnk)</TableHead>
                <TableHead className="text-center border-r border-slate-900 font-black text-[8px] uppercase">Yaada</TableHead>
                <TableHead className="text-center border-r border-slate-900 font-black text-[8px] uppercase">Amala (Conduct)</TableHead>
                <TableHead className="text-center font-black text-[8px] uppercase">Hafte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.results.map((r, idx) => (
                <React.Fragment key={r.id}>
                  {/* Semester 1 Row */}
                  <TableRow className="border-b border-slate-900">
                    <TableCell rowSpan={3} className="text-center border-r border-slate-900 font-bold text-xs">{idx + 1}</TableCell>
                    <TableCell rowSpan={3} className="font-black text-slate-900 border-r border-slate-900 text-xs uppercase px-4">{r.fullName}</TableCell>
                    <TableCell rowSpan={3} className="text-center border-r border-slate-900 text-xs font-bold">{r.gender === 'Male' ? 'Dhi' : 'Dub'}</TableCell>
                    <TableCell rowSpan={3} className="text-center border-r border-slate-900 text-xs font-bold">{r.age}</TableCell>
                    <TableCell className="text-center border-r border-slate-900 text-[9px] font-black uppercase text-slate-500 py-1 bg-slate-50/30">1ffaa</TableCell>
                    {data.schoolClass.subjects.map(s => (
                      <TableCell key={`${s}-sem1`} className="text-center border-r border-slate-900 text-[10px] font-medium py-1">{r.subjectScores[s].sem1 || '-'}</TableCell>
                    ))}
                    <TableCell className="text-center border-r border-slate-900 text-[10px] font-bold">{r.sem1Total?.toFixed(1) || '-'}</TableCell>
                    <TableCell className="text-center border-r border-slate-900 text-[10px] font-bold">{r.sem1Avg?.toFixed(1) || '-'}</TableCell>
                    <TableCell className="text-center border-r border-slate-900 text-[10px] font-bold">{r.sem1Rank || '-'}</TableCell>
                    <TableCell rowSpan={3} className="text-center border-r border-slate-900 text-[10px] font-black uppercase text-slate-500">{getYaadaText(r, data.yaadaRules)}</TableCell>
                    <TableCell rowSpan={3} className="text-center border-r border-slate-900 text-xs font-black">{r.conduct || '-'}</TableCell>
                    <TableCell rowSpan={3} className="text-center text-xs font-black">{r.absent ?? 0}</TableCell>
                  </TableRow>
                  {/* Semester 2 Row */}
                  <TableRow className="border-b border-slate-900">
                    <TableCell className="text-center border-r border-slate-900 text-[9px] font-black uppercase text-slate-500 py-1 bg-slate-50/30">2ffaa</TableCell>
                    {data.schoolClass.subjects.map(s => (
                      <TableCell key={`${s}-sem2`} className="text-center border-r border-slate-900 text-[10px] font-medium py-1">{r.subjectScores[s].sem2 || '-'}</TableCell>
                    ))}
                    <TableCell className="text-center border-r border-slate-900 text-[10px] font-bold">{r.sem2Total?.toFixed(1) || '-'}</TableCell>
                    <TableCell className="text-center border-r border-slate-900 text-[10px] font-bold">{r.sem2Avg?.toFixed(1) || '-'}</TableCell>
                    <TableCell className="text-center border-r border-slate-900 text-xs font-black">{r.sem2Rank || '-'}</TableCell>
                  </TableRow>
                  {/* Average Row */}
                  <TableRow className="border-b border-slate-900 bg-slate-50/50">
                    <TableCell className="text-center border-r border-slate-900 text-[9px] font-black uppercase text-slate-900 py-1">Ave</TableCell>
                    {data.schoolClass.subjects.map(s => (
                      <TableCell key={`${s}-avg`} className="text-center border-r border-slate-900 text-[10px] font-black py-1">{r.subjectScores[s].average?.toFixed(1) || '-'}</TableCell>
                    ))}
                    <TableCell className="text-center border-r border-slate-900 text-xs font-black">{r.totalScore.toFixed(1)}</TableCell>
                    <TableCell className="text-center border-r border-slate-900 text-xs font-black">{r.generalAverage.toFixed(1)}</TableCell>
                    <TableCell className="text-center border-r border-slate-900 font-bold">{r.rank}</TableCell>
                  </TableRow>
                </React.Fragment>
              ))}

            </TableBody>
          </Table>

          {/* Statistics Footer Tables */}
          <div className="p-8 bg-slate-50 border-t print:hidden">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: "Barattoota Galma'an (Registered)", stats: calculateStats(data.results).reg },
                  { title: "Barattoota Darban (Passed)", stats: calculateStats(data.results).pass },
                  { title: "Barattoota Kufan (Failed)", stats: calculateStats(data.results).fail },
                  { title: "Barattoota Addaan Kutan (Dropout)", stats: calculateStats(data.results).drop }
                ].map(item => (
                  <div key={item.title} className="bg-white rounded-2xl border-2 border-slate-900 overflow-hidden shadow-md">
                    <div className="bg-slate-900 text-white p-2 text-center text-[10px] font-black uppercase tracking-widest">{item.title}</div>
                    <div className="grid grid-cols-3 text-center border-t border-slate-900">
                      <div className="p-2 border-r border-slate-900">
                        <p className="text-[8px] font-bold text-slate-400">Dhiira (M)</p>
                        <p className="text-lg font-black">{item.stats.m}</p>
                      </div>
                      <div className="p-2 border-r border-slate-900">
                        <p className="text-[8px] font-bold text-slate-400">Dubartii (F)</p>
                        <p className="text-lg font-black">{item.stats.f}</p>
                      </div>
                      <div className="p-2">
                        <p className="text-[8px] font-bold text-slate-400">Ida'ama (T)</p>
                        <p className="text-lg font-black">{item.stats.t}</p>
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

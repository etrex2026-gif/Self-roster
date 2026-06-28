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
      sat: { m: active.filter(r => r.gender === 'Male').length, f: active.filter(r => r.gender === 'Female').length, t: active.length },
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
    const pageHeight = doc.internal.pageSize.getHeight();
    const subjects = schoolClass.subjects || [];
    const marginSide = 7;

    const studentsPerPage = 6;
    const chunks = [];
    for (let i = 0; i < results.length; i += studentsPerPage) {
      chunks.push(results.slice(i, i + studentsPerPage));
    }

    chunks.forEach((chunk, pageIndex) => {
      if (pageIndex > 0) doc.addPage('a4', 'l');

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.text((schoolClass.schoolName || '').toUpperCase(), pageWidth / 2, 16, { align: 'center' });
      
      doc.setFontSize(10.5);
      doc.text(`BARA BARNOOTAA (ACADEMIC YEAR): ${schoolClass.academicYear || '-'}`, marginSide + 3, 25);
      doc.text(`KUTAA & DAREE (GRADE & SECTION): ${schoolClass.grade || '-'}${schoolClass.section || '-'}`, pageWidth - marginSide - 3, 25, { align: 'right' });
      doc.text(`BARSIISAA I/GAFATAMAA DAREE (HOMEROOM TEACHER): ${schoolClass.teacherName || '-'}`, marginSide + 3, 31);
      doc.text(`WALIGALA BARATTOOTA (TOTAL GRADE STUDENTS): ${results.length}`, marginSide + 3, 37);
      doc.setFontSize(9);
      doc.text(`PAGE: ${pageIndex + 1} OF ${chunks.length}`, pageWidth - marginSide - 3, 37, { align: 'right' });

      const head = [
        [
          { content: 'T/L (S/N)', rowSpan: 2 },
          { content: 'MAQAA GUUTUU (STUDENT FULL NAME)', rowSpan: 2 },
          { content: 'SAALA (SEX)', rowSpan: 2 },
          { content: 'UMRII (AGE)', rowSpan: 2 },
          { content: 'SEEM (TERM)', rowSpan: 2 },
          { content: 'GOSA BARNOOTAA (SUBJECT COURSES)', colSpan: subjects.length },
          { content: 'WALIIGALA BARNOOTAA (ACADEMIC RESULTS SUMMARY)', colSpan: 6 }
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
          { content: (r.fullName || '').toUpperCase(), rowSpan: 3 },
          { content: r.gender === 'Male' ? 'Dhi' : 'Dub', rowSpan: 3 },
          { content: String(r.age || '-'), rowSpan: 3 },
          '1ffaa'
        ];
        subjects.forEach(s => row1.push(r.isDropout ? '-' : String(r.subjectScores[s]?.sem1 ?? '-')));
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
        subjects.forEach(s => row2.push(r.isDropout ? '-' : String(r.subjectScores[s]?.sem2 ?? '-')));
        row2.push(
          r.isDropout ? '-' : String(r.sem2Total?.toFixed(1) || '-'),
          r.isDropout ? '-' : String(r.sem2Avg?.toFixed(1) || '-'),
          r.isDropout ? '-' : String(r.sem2Rank || '-')
        );
        body.push(row2);

        // Ave
        const row3: any[] = ['Ave'];
        subjects.forEach(s => row3.push(r.isDropout ? '-' : String(r.subjectScores[s]?.average?.toFixed(1) || '-')));
        row3.push(
          r.isDropout ? '-' : Number(r.totalScore || 0).toFixed(1),
          r.isDropout ? '-' : Number(r.generalAverage || 0).toFixed(1),
          r.isDropout ? '-' : String(r.rank || '-')
        );
        body.push(row3);
      });

      autoTable(doc, {
        head: head,
        body: body,
        startY: 40,
        theme: 'grid',
        margin: { left: marginSide, right: marginSide },
        styles: { 
          fontSize: 8, 
          cellPadding: 1.1, 
          halign: 'center', 
          valign: 'middle', 
          lineColor: [0, 0, 0], 
          lineWidth: 0.15,
          textColor: [0, 0, 0],
          font: 'helvetica'
        },
        headStyles: { 
          fillColor: [240, 240, 240], 
          textColor: [0, 0, 0], 
          fontStyle: 'bold', 
          lineWidth: 0.25,
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { halign: 'left', cellWidth: 45, fontStyle: 'bold' },
          2: { fontStyle: 'bold', cellWidth: 9 },
          3: { fontStyle: 'bold', cellWidth: 8 },
          4: { fontStyle: 'bold', cellWidth: 10, fontSize: 7.5 },
          ...Object.fromEntries(subjects.map((_, idx) => [
            5 + idx, { fontStyle: 'bold', halign: 'center' }
          ])),
          [5 + subjects.length]: { cellWidth: 15.5, fontStyle: 'bold', halign: 'center' },
          [5 + subjects.length + 1]: { cellWidth: 15.5, fontStyle: 'bold', halign: 'center' },
          [5 + subjects.length + 2]: { cellWidth: 12, fontStyle: 'bold', halign: 'center' },
          [5 + subjects.length + 3]: { cellWidth: 25, fontStyle: 'bold', halign: 'center' },
          [5 + subjects.length + 4]: { cellWidth: 11, fontStyle: 'bold', halign: 'center' },
          [5 + subjects.length + 5]: { cellWidth: 9, fontStyle: 'bold', halign: 'center' }
        },
        didParseCell: (dataCell) => {
          if (dataCell.section === 'body') {
            dataCell.cell.styles.fontStyle = 'bold';
          }
        }
      });

      const stats = calculateStats(chunk);
      const finalY = (doc as any).lastAutoTable.finalY + 3;
      
      const tableWidth = 53;
      const footerSpacing = (pageWidth - (marginSide * 2) - (tableWidth * 5)) / 4;

      const footerTable = (title: string, s: { m: number, f: number, t: number }, x: number) => {
        autoTable(doc, {
          startY: finalY,
          head: [[{ content: title, colSpan: 3, styles: { halign: 'center', fontSize: 6.8, fontStyle: 'bold', fillColor: [230, 230, 230], textColor: [0, 0, 0] } }], ['Dhiira (M)', 'Dubartii (F)', 'Ida\'ama (T)']],
          body: [[s.m, s.f, s.t]],
          theme: 'grid',
          styles: { fontSize: 7.5, fontStyle: 'bold', halign: 'center', cellPadding: 1.0, lineColor: [0, 0, 0], lineWidth: 0.2 },
          headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
          margin: { left: x },
          tableWidth: tableWidth
        });
      };

      footerTable("Barattoota Galma'an (Registered)", stats.reg, marginSide);
      footerTable("Barattoota Darban (Passed)", stats.pass, marginSide + (tableWidth + footerSpacing));
      footerTable("Barattoota Kufan (Failed)", stats.fail, marginSide + (tableWidth + footerSpacing) * 2);
      footerTable("Barattoota Addaan Kutan (Dropout)", stats.drop, marginSide + (tableWidth + footerSpacing) * 3);
      footerTable("KAN QORAMAN (STUDENTS WHO SAT FOR THE EXAMINATION)", stats.sat, marginSide + (tableWidth + footerSpacing) * 4);

      // Signature Section
      const sigY = Math.min(pageHeight - 18, Math.max(pageHeight - 25, (doc as any).lastAutoTable.finalY + 4));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const lineLen = 95;

      // Teacher (Left Column)
      doc.text(`Maqaa Barsiisaa/Barsiistuu (Homeroom Teacher Name): ${schoolClass.teacherName || '-'}`, 15, sigY);
      doc.line(15, sigY + 1.2, 15 + lineLen, sigY + 1.2);
      doc.text("Mallattoo (Signature):", 15, sigY + 6.5);
      doc.line(15, sigY + 7.7, 15 + lineLen, sigY + 7.7);
      doc.text("Guyyaa (Date):", 15, sigY + 13);
      doc.line(15, sigY + 14.2, 15 + lineLen, sigY + 14.2);

      // Director (Right Column)
      doc.text("M/I/G (Director Name):", 170, sigY);
      doc.line(170, sigY + 1.2, 170 + lineLen, sigY + 1.2);
      doc.text("Mallattoo (Signature):", 170, sigY + 6.5);
      doc.line(170, sigY + 7.7, 170 + lineLen, sigY + 7.7);
      doc.text("Guyyaa (Date):", 170, sigY + 13);
      doc.line(170, sigY + 14.2, 170 + lineLen, sigY + 14.2);
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
      headerRow.height = 35;
      worksheet.mergeCells(worksheet.rowCount, 1, worksheet.rowCount, numCols);
      const titleCell = worksheet.getCell(worksheet.rowCount, 1);
      titleCell.value = schoolClass.schoolName.toUpperCase();
      titleCell.font = { bold: true, size: 20 };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Info rows
      worksheet.addRow(['Academic Year:', schoolClass.academicYear, '', '', '', '', '', '', '', '', '', 'Grade & Section:', `${schoolClass.grade}${schoolClass.section}`]);
      worksheet.addRow(['Homeroom Teacher:', schoolClass.teacherName, '', '', '', '', '', '', '', '', '', 'Total Students:', results.length]);
      
      // Table Header
      const headRow1 = worksheet.addRow(['S/N', 'Full Name', 'Sex', 'Age', 'Sem', ...subjects.map(() => ''), 'Summary', '', '', '', '', '']);
      const headRow2 = worksheet.addRow(['', '', '', '', '', ...subjects, 'Tot', 'Ave', 'Rnk', 'G/H', 'Yaada', 'Hafte']);
      
      // Formatting header
      [headRow1, headRow2].forEach(row => {
        row.height = 25;
        row.eachCell(cell => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.font = { bold: true, size: 12 };
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
            row.height = 20;
            row.eachCell(cell => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.font = { bold: true, size: 11 };
            });
        });
        [2, 3, 4].forEach(col => {
            row1.getCell(col).font = { bold: true, size: 11 };
        });
        
        // Bold mark columns 5 to numCols
        for (let col = 5; col <= numCols; col++) {
          row1.getCell(col).font = { bold: true, size: 11 };
          row2.getCell(col).font = { bold: true, size: 11 };
          row3.getCell(col).font = { bold: true, size: 11 };
        }        
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
          { title: "Sat for Exam", s: stats.sat },
          { title: "Passed", s: stats.pass },
          { title: "Failed", s: stats.fail },
          { title: "Dropout", s: stats.drop }
      ];
      
      const statsStartRow = worksheet.rowCount + 1;
      
      // Title row
      const titleRow = worksheet.addRow([
          statData[0].title, '', '', 
          statData[1].title, '', '', 
          statData[2].title, '', '', 
          statData[3].title, '', '', 
          statData[4].title, '', ''
      ]);
      // Labels
      const labelRow = worksheet.addRow(['M', 'F', 'T', 'M', 'F', 'T', 'M', 'F', 'T', 'M', 'F', 'T', 'M', 'F', 'T']);
      // Values
      const dataRow = worksheet.addRow([
          statData[0].s.m, statData[0].s.f, statData[0].s.t, 
          statData[1].s.m, statData[1].s.f, statData[1].s.t, 
          statData[2].s.m, statData[2].s.f, statData[2].s.t, 
          statData[3].s.m, statData[3].s.f, statData[3].s.t, 
          statData[4].s.m, statData[4].s.f, statData[4].s.t
      ]);
      
      [titleRow, labelRow, dataRow].forEach(row => {
          row.eachCell(cell => {
              cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
              cell.alignment = { horizontal: 'center' };
          });
      });
      
      // Merge titles
      [1, 4, 7, 10, 13].forEach(col => worksheet.mergeCells(titleRow.number, col, titleRow.number, col + 2));
      
      // Configure Excel column widths
      worksheet.getColumn(1).width = 5;  // S/N (compact)
      worksheet.getColumn(2).width = 30; // Full Name
      worksheet.getColumn(3).width = 7;  // Sex (compact)
      worksheet.getColumn(4).width = 7;  // Age (compact)
      worksheet.getColumn(5).width = 7;  // Sem (compact)
      
      for (let i = 0; i < subjects.length; i++) {
        worksheet.getColumn(6 + i).width = 7; // Subjects (compact)
      }
      
      const baseIdx = 6 + subjects.length;
      worksheet.getColumn(baseIdx).width = 11;     // Tot
      worksheet.getColumn(baseIdx + 1).width = 11; // Ave
      worksheet.getColumn(baseIdx + 2).width = 8;  // Rnk (compact)
      worksheet.getColumn(baseIdx + 3).width = 8;  // G/H (compact)
      worksheet.getColumn(baseIdx + 4).width = 14; // Yaada
      worksheet.getColumn(baseIdx + 5).width = 8;  // Hafte (compact)

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

      <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-xl print:shadow-none print:border-none print:p-0">
        <div className="p-8 print:p-4 border-b bg-white text-center space-y-2">
          <h2 className="text-4xl print:text-5xl font-black uppercase tracking-widest text-slate-900">{data.schoolClass.schoolName}</h2>
          
          <div className="grid grid-cols-2 gap-8 text-left max-w-4xl mx-auto pt-6 border-t border-slate-100 print:pt-4">
            <div className="space-y-1">
              <p className="text-[10px] print:text-xs font-black text-slate-400 uppercase tracking-widest">Bara Barnootaa (Academic Year)</p>
              <p className="text-sm print:text-base font-bold text-slate-900">{data.schoolClass.academicYear}</p>
              <p className="text-[10px] print:text-xs font-black text-slate-400 uppercase tracking-widest pt-2">Barsiisaa I/Gafatamaa Daree (Homeroom Teacher)</p>
              <p className="text-sm print:text-base font-bold text-slate-900">{data.schoolClass.teacherName}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] print:text-xs font-black text-slate-400 uppercase tracking-widest">Kutaa & Daree (Grade & Section)</p>
              <p className="text-sm print:text-base font-bold text-slate-900">{data.schoolClass.grade}{data.schoolClass.section}</p>
              <p className="text-[10px] print:text-xs font-black text-slate-400 uppercase tracking-widest pt-2">Waligala Barattoota (Total Students)</p>
              <p className="text-sm print:text-base font-bold text-slate-900">{data.results.length}</p>
            </div>
          </div>
        </div>

        <CardContent className="p-0 overflow-x-auto print:overflow-visible">
          <Table className="border-collapse border-2 border-slate-900 w-full">
            <TableHeader>
              <TableRow className="bg-white border-b-2 border-slate-900">
                <TableHead rowSpan={2} className="w-10 text-center border-r-2 border-slate-900 font-black text-[10px] print:text-sm uppercase px-0.5">T/L (S/N)</TableHead>
                <TableHead rowSpan={2} className="min-w-[200px] border-r-2 border-slate-900 font-black text-[10px] print:text-sm uppercase px-4">Maqaa Guutuu (Full Name)</TableHead>
                <TableHead rowSpan={2} className="w-10 text-center border-r-2 border-slate-900 font-black text-[10px] print:text-sm uppercase px-0.5">Saala (Sex)</TableHead>
                <TableHead rowSpan={2} className="w-10 text-center border-r-2 border-slate-900 font-black text-[10px] print:text-sm uppercase px-0.5">Umrii (Age)</TableHead>
                <TableHead rowSpan={2} className="w-12 text-center border-r-2 border-slate-900 font-black text-[10px] print:text-sm uppercase px-0.5">Seem (Term)</TableHead>
                <TableHead colSpan={data.schoolClass.subjects.length} className="text-center border-r-2 border-slate-900 font-black text-[11px] print:text-base uppercase py-3 bg-slate-50">Gosa Barnootaa (Subject Courses)</TableHead>
                <TableHead colSpan={6} className="text-center font-black text-[11px] print:text-base uppercase py-3 bg-slate-50">Waliigala Barnootaa (Summary)</TableHead>
              </TableRow>
              <TableRow className="bg-white border-b-2 border-slate-900">
                {data.schoolClass.subjects.map(s => (
                  <TableHead key={s} className="text-center border-r-2 border-slate-900 font-black text-[9px] print:text-xs uppercase py-2">{s.substring(0, 3)}</TableHead>
                ))}
                <TableHead className="w-20 text-center border-r-2 border-slate-900 font-black text-[9px] print:text-xs uppercase px-1">Ida (Tot)</TableHead>
                <TableHead className="w-20 text-center border-r-2 border-slate-900 font-black text-[9px] print:text-xs uppercase px-1">Ave</TableHead>
                <TableHead className="w-14 text-center border-r-2 border-slate-900 font-black text-[9px] print:text-xs uppercase px-1">Sad (Rnk)</TableHead>
                <TableHead className="min-w-[90px] w-[100px] text-center border-r-2 border-slate-900 font-black text-[9px] print:text-xs uppercase px-2">Yaada</TableHead>
                <TableHead className="w-12 text-center border-r-2 border-slate-900 font-black text-[9px] print:text-xs uppercase px-1">Amala (Conduct)</TableHead>
                <TableHead className="w-10 text-center font-black text-[9px] print:text-xs uppercase px-1">Hafte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.results.map((r, idx) => (
                <React.Fragment key={r.id}>
                    {/* Semester 1 Row */}
                  <TableRow className="border-b border-slate-900 print:h-12">
                    <TableCell rowSpan={3} className="text-center border-r-2 border-slate-900 font-bold text-xs print:text-base px-0.5">{idx + 1}</TableCell>
                    <TableCell rowSpan={3} className="font-bold text-slate-900 border-r-2 border-slate-900 text-xs print:text-base uppercase px-4">{r.fullName}</TableCell>
                    <TableCell rowSpan={3} className="text-center border-r-2 border-slate-900 text-xs print:text-base font-bold px-0.5">{r.gender === 'Male' ? 'Dhi' : 'Dub'}</TableCell>
                    <TableCell rowSpan={3} className="text-center border-r-2 border-slate-900 text-xs print:text-base font-bold px-0.5">{r.age}</TableCell>
                    <TableCell className="text-center border-r-2 border-slate-900 text-[10px] print:text-sm font-black uppercase text-slate-500 py-2 bg-slate-50/30 px-0.5">1ffaa</TableCell>
                    {data.schoolClass.subjects.map(s => (
                       <TableCell key={`${s}-sem1`} className="text-center border-r-2 border-slate-900 text-[11px] print:text-base font-bold py-2 px-1">{r.subjectScores[s].sem1 || '-'}</TableCell>
                    ))}
                    <TableCell className="text-center border-r-2 border-slate-900 text-[11px] print:text-base font-bold px-1">{r.sem1Total?.toFixed(1) || '-'}</TableCell>
                    <TableCell className="text-center border-r-2 border-slate-900 text-[11px] print:text-base font-bold px-1">{r.sem1Avg?.toFixed(1) || '-'}</TableCell>
                    <TableCell className="text-center border-r-2 border-slate-900 text-[11px] print:text-base font-bold px-1">{r.sem1Rank || '-'}</TableCell>
                    <TableCell rowSpan={3} className="text-center border-r-2 border-slate-900 text-[11px] print:text-base font-black uppercase text-slate-500 whitespace-nowrap px-2">{getYaadaText(r, data.yaadaRules)}</TableCell>
                    <TableCell rowSpan={3} className="text-center border-r-2 border-slate-900 text-xs print:text-base font-bold px-1">{r.conduct || '-'}</TableCell>
                    <TableCell rowSpan={3} className="text-center text-xs print:text-base font-bold px-1">{r.absent ?? 0}</TableCell>
                  </TableRow>
                  {/* Semester 2 Row */}
                  <TableRow className="border-b border-slate-900 print:h-12">
                    <TableCell className="text-center border-r-2 border-slate-900 text-[10px] print:text-sm font-black uppercase text-slate-500 py-2 bg-slate-50/30">2ffaa</TableCell>
                    {data.schoolClass.subjects.map(s => (
                      <TableCell key={`${s}-sem2`} className="text-center border-r-2 border-slate-900 text-[11px] print:text-base font-bold py-2">{r.subjectScores[s].sem2 || '-'}</TableCell>
                    ))}
                    <TableCell className="text-center border-r-2 border-slate-900 text-[11px] print:text-base font-bold">{r.sem2Total?.toFixed(1) || '-'}</TableCell>
                    <TableCell className="text-center border-r-2 border-slate-900 text-[11px] print:text-base font-bold">{r.sem2Avg?.toFixed(1) || '-'}</TableCell>
                    <TableCell className="text-center border-r-2 border-slate-900 text-xs print:text-base font-bold">{r.sem2Rank || '-'}</TableCell>
                  </TableRow>
                  {/* Average Row */}
                  <TableRow className="border-b border-slate-900 bg-slate-50/50 print:h-12">
                    <TableCell className="text-center border-r-2 border-slate-900 text-[10px] print:text-sm font-black uppercase text-slate-900 py-2">Ave</TableCell>
                    {data.schoolClass.subjects.map(s => (
                      <TableCell key={`${s}-avg`} className="text-center border-r-2 border-slate-900 text-[11px] print:text-base font-black py-2">{r.subjectScores[s].average?.toFixed(1) || '-'}</TableCell>
                    ))}
                    <TableCell className="text-center border-r-2 border-slate-900 text-xs print:text-base font-black">{r.totalScore.toFixed(1)}</TableCell>
                    <TableCell className="text-center border-r-2 border-slate-900 text-xs print:text-base font-black">{r.generalAverage.toFixed(1)}</TableCell>
                    <TableCell className="text-center border-r-2 border-slate-900 font-bold print:text-base">{r.rank}</TableCell>
                  </TableRow>
                </React.Fragment>
              ))}

            </TableBody>
          </Table>

          {/* Statistics Footer Tables */}
          <div className="p-8 bg-slate-50 border-t print:bg-white print:p-4 print:border-t-2">
             <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 print:grid-cols-5 print:gap-1.5">
                {[
                  { title: "Barattoota Galma'an (Registered)", stats: calculateStats(data.results).reg },
                  { title: "Barattoota Darban (Passed)", stats: calculateStats(data.results).pass },
                  { title: "Barattoota Kufan (Failed)", stats: calculateStats(data.results).fail },
                  { title: "Barattoota Addaan Kutan (Dropout)", stats: calculateStats(data.results).drop },
                  { title: "KAN QORAMAN (STUDENTS WHO SAT FOR THE EXAMINATION)", stats: calculateStats(data.results).sat }
                ].map(item => (
                  <div key={item.title} className="bg-white rounded-xl border-2 border-slate-900 overflow-hidden shadow-sm print:shadow-none w-full flex flex-col justify-between">
                    <div className="bg-slate-900 text-white p-1.5 text-center text-[9px] lg:text-[10px] print:text-[8px] font-black uppercase tracking-wider min-h-[42px] flex items-center justify-center">{item.title}</div>
                    <div className="grid grid-cols-3 text-center border-t border-slate-900">
                      <div className="p-1.5 border-r border-slate-900">
                        <p className="text-[7px] lg:text-[8px] print:text-[7px] font-bold text-slate-400 uppercase">Dhi (M)</p>
                        <p className="text-base print:text-sm font-black">{item.stats.m}</p>
                      </div>
                      <div className="p-1.5 border-r border-slate-900">
                        <p className="text-[7px] lg:text-[8px] print:text-[7px] font-bold text-slate-400 uppercase">Dub (F)</p>
                        <p className="text-base print:text-sm font-black">{item.stats.f}</p>
                      </div>
                      <div className="p-1.5">
                        <p className="text-[7px] lg:text-[8px] print:text-[7px] font-bold text-slate-400 uppercase">Tot (T)</p>
                        <p className="text-base print:text-sm font-black">{item.stats.t}</p>
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

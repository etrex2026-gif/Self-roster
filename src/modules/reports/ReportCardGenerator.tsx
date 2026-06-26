import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { calculateClassResults } from '../../lib/calculations';
import { Button } from '@/src/components/ui/button';
import { Download, ChevronLeft, ChevronRight, FileArchive, Printer, CheckCircle2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { cn } from '@/src/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const MULTILINGUAL_COMMENTS = [
  {
    en: "More effort is needed in ______________ please give attention to this area at home.",
    or: "Caalaatti cimtee hojjechuu qabda. Mee mana keessatti _______________ xiyyeeffannoo kennaa.",
    am: "የበለጠ ሊሠራ ልትሠራ ይገባል፡:እባክዎን በቤት ወስጥ _______________ ዙሪያ ትኩረት ሰጥተው ይከታተሉት፡:"
  },
  {
    en: "Excellent! Keep up the good work.",
    or: "Baayyee gaariidha. Jabaadhuu itti fufi.",
    am: "እጅግ በጣም ጥሩ ነው በዚሁ ቀጥል/ቀጥይ::"
  },
  {
    en: "Good, try to do more.",
    or: "Gaariidha, garuu kana caalaa hojjetamuu qaba.",
    am: "ጥሩ ነው ከዚህ በበለጠ መስራት ይጠበቅብሃል / ይጠበቅብሻል::"
  },
  {
    en: "Give serious follow up at home.",
    or: "Mana keessattis to’annoo barbaada.",
    am: "ተከታታይ ክትትል በቤትም ያስፈልገዋል/ያስፈልጋታል፡፡"
  },
  {
    en: "Please come to the school and talk to us.",
    or: "Mee mana barumsichaa koottaa nu haasofsiisaa.",
    am: "እባክዎ ወደ ት/ቤት መጥተው ያነጋግሩን፡፡"
  },
  {
    en: "Get a home teacher for further assistance.",
    or: "Mucaa keessaniif barsiisaa manaa qacaradhaa.",
    am: "ለልጅዎ በቤት ውስጥ አስጠኚ ይቅጠሩ፡"
  },
  {
    en: "Other ________________________________",
    or: "Kan biraa immoo _______________ .",
    am: "ሌላም _______________"
  }
];

let cachedFontBase64: string | null = null;

const fetchFontAndRegister = async (doc: jsPDF) => {
  if (cachedFontBase64) {
    doc.addFileToVFS("AppUnicodeFont.ttf", cachedFontBase64);
    doc.addFont("AppUnicodeFont.ttf", "AppUnicodeFont", "normal");
    return true;
  }
  
  const urls = [
    "https://raw.githubusercontent.com/keymanapp/keyboards/master/release/shared/fonts/sil/abyssinica/AbyssinicaSIL-Regular.ttf",
    "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansethiopic/NotoSansEthiopic%5Bwght%5D.ttf",
    "/fonts/NotoSansEthiopic.ttf"
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const buffer = await response.arrayBuffer();
      const binary = new Uint8Array(buffer);
      let binaryString = "";
      const len = binary.byteLength;
      for (let i = 0; i < len; i++) {
        binaryString += String.fromCharCode(binary[i]);
      }
      cachedFontBase64 = btoa(binaryString);
      doc.addFileToVFS("AppUnicodeFont.ttf", cachedFontBase64);
      doc.addFont("AppUnicodeFont.ttf", "AppUnicodeFont", "normal");
      return true;
    } catch (err) {
      console.warn(`Could not load Unicode font from ${url}`, err);
    }
  }

  console.error("Could not load Unicode font from any sources, falling back to default");
  return false;
};

class ScaledPdfWriter {
  private doc: any;
  private scale: number;
  private offsetX: number;
  private offsetY: number;
  private hasUnicodeFont: boolean;

  constructor(doc: any, scale: number, offsetX: number, offsetY: number, hasUnicodeFont: boolean = false) {
    this.doc = doc;
    this.scale = scale;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.hasUnicodeFont = hasUnicodeFont;
  }

  rect(x: number, y: number, w: number, h: number, style?: string) {
    this.doc.rect(
      this.offsetX + x * this.scale,
      this.offsetY + y * this.scale,
      w * this.scale,
      h * this.scale,
      style
    );
  }

  line(x1: number, y1: number, x2: number, y2: number) {
    this.doc.line(
      this.offsetX + x1 * this.scale,
      this.offsetY + y1 * this.scale,
      this.offsetX + x2 * this.scale,
      this.offsetY + y2 * this.scale
    );
  }

  text(text: string | string[], x: number, y: number, options?: any) {
    this.doc.text(
      text,
      this.offsetX + x * this.scale,
      this.offsetY + y * this.scale,
      options
    );
  }

  setDrawColor(r: any, g?: number, b?: number) {
    if (g !== undefined && b !== undefined) {
      this.doc.setDrawColor(r, g, b);
    } else {
      this.doc.setDrawColor(r);
    }
  }

  setLineWidth(width: number) {
    this.doc.setLineWidth(width * this.scale);
  }

  setFillColor(r: any, g?: number, b?: number) {
    if (g !== undefined && b !== undefined) {
      this.doc.setFillColor(r, g, b);
    } else {
      this.doc.setFillColor(r);
    }
  }

  setFont(fontName: string, fontStyle?: string) {
    if (this.hasUnicodeFont) {
      this.doc.setFont("AppUnicodeFont", fontStyle || "normal");
    } else {
      this.doc.setFont(fontName, fontStyle);
    }
  }

  setFontSize(size: number) {
    this.doc.setFontSize(size * this.scale);
  }

  setTextColor(r: any, g?: number, b?: number) {
    if (g !== undefined && b !== undefined) {
      this.doc.setTextColor(r, g, b);
    } else {
      this.doc.setTextColor(r);
    }
  }

  setLineDashPattern(pattern: number[], phase: number) {
    this.doc.setLineDashPattern(pattern.map(p => p * this.scale), phase * this.scale);
  }

  splitTextToSize(text: string, maxW: number) {
    return this.doc.splitTextToSize(text, maxW * this.scale);
  }

  getTextWidth(text: string): number {
    return (this.doc.getTextWidth ? this.doc.getTextWidth(text) : this.doc.getStringUnitWidth(text) * this.doc.getFontSize() / this.doc.internal.scaleFactor) / this.scale;
  }
}

export default function ReportCardGenerator() {
  const { id } = useParams();
  const classId = parseInt(id!);
  const [currentPage, setCurrentPage] = useState(0);
  const [previewPage, setPreviewPage] = useState<1 | 2>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGeneratingCombined, setIsGeneratingCombined] = useState(false);
  const [combinedProgress, setCombinedProgress] = useState(0);

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

  const buildPortraitReportCards = (
    doc: jsPDF,
    students: any[],
    schoolClass: any,
    yaadaRules: any,
    hasEthiopicFont: boolean,
    totalStudentsCount: number,
    onProgress?: (progress: number) => void
  ) => {
    const scale = 0.66;
    const offsetX = 7.0;
    const topOffsetY = 5.0;
    const bottomOffsetY = 153.5;

    for (let i = 0; i < students.length; i += 2) {
      const student1 = students[i];
      const student2 = i + 1 < students.length ? students[i + 1] : null;

      // Page 1 of this pair: Cover Pages
      const topCoverWriter = new ScaledPdfWriter(doc, scale, offsetX, topOffsetY, hasEthiopicFont);
      drawCoverPage(topCoverWriter, student1, schoolClass);

      if (student2) {
        const bottomCoverWriter = new ScaledPdfWriter(doc, scale, offsetX, bottomOffsetY, hasEthiopicFont);
        drawCoverPage(bottomCoverWriter, student2, schoolClass);
      }

      // Thin separator line on Page 1
      doc.setDrawColor(128, 128, 128);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(0, 148.5, 210, 148.5);
      doc.setLineDashPattern([], 0); // reset

      // Page 2 of this pair: Results Pages
      doc.addPage('a4', 'p');

      const yaadaText1 = getYaadaText(student1, yaadaRules);
      const topResultsWriter = new ScaledPdfWriter(doc, scale, offsetX, topOffsetY, hasEthiopicFont);
      drawResultsPage(topResultsWriter, student1, schoolClass, yaadaText1, hasEthiopicFont, totalStudentsCount);

      if (student2) {
        const yaadaText2 = getYaadaText(student2, yaadaRules);
        const bottomResultsWriter = new ScaledPdfWriter(doc, scale, offsetX, bottomOffsetY, hasEthiopicFont);
        drawResultsPage(bottomResultsWriter, student2, schoolClass, yaadaText2, hasEthiopicFont, totalStudentsCount);
      }

      // Thin separator line on Page 2
      doc.setDrawColor(128, 128, 128);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(0, 148.5, 210, 148.5);
      doc.setLineDashPattern([], 0); // reset

      if (onProgress) {
        const processedCount = Math.min(i + 2, students.length);
        onProgress(Math.round((processedCount / students.length) * 100));
      }

      // If there are more students, add a new page for the next pair
      if (i + 2 < students.length) {
        doc.addPage('a4', 'p');
      }
    }
  };

  const generatePDFDirect = async (student: any) => {
    if (!data) return;
    const { schoolClass, yaadaRules } = data;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const hasEthiopicFont = await fetchFontAndRegister(doc);

    buildPortraitReportCards(doc, [student], schoolClass, yaadaRules, hasEthiopicFont, data?.results.length || 0);

    return doc;
  };

  const drawCoverPage = (doc: any, student: any, schoolClass: any) => {
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 10;
    const innerMargin = 15;
    const centerLine = pageWidth / 2;

    // Decorative Border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.5);
    doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));
    doc.setLineWidth(0.5);
    doc.rect(margin + 2, margin + 2, pageWidth - (margin * 2) - 4, pageHeight - (margin * 2) - 4);

    // Corner Accents
    const size = 5;
    const pts = [[margin, margin], [pageWidth-margin, margin], [margin, pageHeight-margin], [pageWidth-margin, pageHeight-margin]];
    pts.forEach(([px, py]) => { doc.setFillColor(0, 0, 0); doc.rect(px - 1, py - 1, 2, 2, 'F'); });

    // Vertical Divider
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(centerLine, innerMargin, centerLine, pageHeight - innerMargin);
    doc.setLineDashPattern([], 0);

    // LEFT PANEL: GUIDANCE
    const leftMid = (centerLine + innerMargin) / 2;
    doc.setFontSize(11);
    doc.setFont('times', 'bold');
    doc.text("METHOD OF MARKING / MADAALLII QABXIILEE", leftMid, innerMargin + 8, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(innerMargin + 10, innerMargin + 11, centerLine - 10, innerMargin + 11);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const grading = [
      { r: '90 - 100', g: 'A', d: 'Excellent / Baayyee Gaarii' },
      { r: '80 - 89', g: 'B', d: 'Very Good / Haalaan Gaarii' },
      { r: '70 - 79', g: 'C', d: 'Good / Gaarii' },
      { r: '60 - 69', g: 'D', d: 'Satisfactory / Quubsaa' },
      { r: '50 - 59', g: 'E', d: "Needs Imp. / Fooyya'iinsa Barbaada" },
      { r: 'Below 50', g: 'F', d: 'Poor / Laafaa' },
    ];
    let y = innerMargin + 19;
    grading.forEach(g => {
      doc.text(g.r, innerMargin + 10, y);
      doc.text(`${g.g} - ${g.d}`, centerLine - 10, y, { align: 'right' });
      doc.setDrawColor(200, 200, 200);
      doc.line(innerMargin + 10, y + 2, centerLine - 10, y + 2);
      y += 7.5;
    });

    y += 4;
    doc.setDrawColor(0, 0, 0);
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text("PARENT GUIDANCE / QAJEELFAMA MAATII", leftMid, y, { align: 'center' });
    doc.line(innerMargin + 10, y + 2, centerLine - 10, y + 2);
    
    const guidance = [
      { en: "1. Follow up your child's progress daily.", or: "Guyyaa guyyaadhaan adeemsa barnoota mucaa keessanii hordofaa." },
      { en: "2. Devote some of your time to help child's school work.", or: "Hojii barnoota mucaa keessaniif yeroo keessan dabarsaa." },
      { en: "3. Inculcate good manners and values in your child.", or: "Mucaa keessan keessatti amala gaariifi naamusaa gabbisaa." },
      { en: "4. Meet educational and psychological needs of child.", or: "Fedhii barnootaa fi xiinsammuu mucaa keessanii guutaa." },
      { en: "5. Observe your child's behavior and group of friends.", or: "Amala mucaa keessanii fi hiriyyoota isaa hordofaa." },
      { en: "6. Attend school functions to know child's success.", or: "Milkaa'ina mucaaf sagantaalee mana barumsaa irratti argamaa." }
    ];
    y += 7;
    guidance.forEach(l => { 
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(l.en, innerMargin + 5, y);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.text(l.or, innerMargin + 5, y + 3.5);
      y += 8; 
    });

    // RIGHT PANEL: COVER
    const rightMid = centerLine + (pageWidth - margin - centerLine) / 2;
    doc.setFont('times', 'bold');
    doc.setFontSize(20);
    const wrappedSchoolName = doc.splitTextToSize(schoolClass.schoolName.toUpperCase(), 130);
    doc.text(wrappedSchoolName, rightMid, innerMargin + 10, { align: 'center' });
    doc.setLineWidth(0.8);
    doc.line(centerLine + 20, innerMargin + 14 + (wrappedSchoolName.length * 7), pageWidth - innerMargin - 20, innerMargin + 14 + (wrappedSchoolName.length * 7));
    doc.setFontSize(9);
    doc.text("ACADEMIC ASSESSMENT RECORD / GALMEE MADAALLII BARNOOTAA", rightMid, innerMargin + 20 + (wrappedSchoolName.length * 7), { align: 'center' });

    doc.setFillColor(0, 0, 0);
    doc.rect(centerLine + 15, innerMargin + 26 + (wrappedSchoolName.length * 7), (pageWidth - innerMargin - centerLine) - 30, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text("STUDENT REPORT CARD", rightMid, innerMargin + 32 + (wrappedSchoolName.length * 7), { align: 'center' });
    doc.setFontSize(9);
    doc.text("KAARDII GABAASA BARATAA", rightMid, innerMargin + 38 + (wrappedSchoolName.length * 7), { align: 'center' });

    doc.setTextColor(0, 0, 0);
    const details = [
      { l_en: 'STUDENT NAME', l_or: 'MAQAA BARATAA', v: student.fullName.toUpperCase(), bold: true, size: 12 },
      { l_en: 'SEX / AGE', l_or: 'SAALA / UMURII', v: `${student.gender === 'Male' ? 'MALE / DHIIRA' : 'FEMALE / DUBARTII'} / ${student.age}` },
      { l_en: 'ACADEMIC YEAR', l_or: 'BARA BARNOOTAA', v: schoolClass.academicYear },
      { l_en: 'GRADE & SECTION', l_or: 'KUTAA & DAREE', v: `${schoolClass.grade} - ${schoolClass.section}` },
      { l_en: 'HOMEROOM TEACHER', l_or: 'Barsiisaa Itti Gafatamaa Daree', v: schoolClass.teacherName.toUpperCase() },
      { l_en: 'CONDUCT', l_or: 'AMALA', v: String(student.conduct || '-') },
      { l_en: 'ABSENT', l_or: 'HAFUU', v: `${student.absent ?? 0} DAYS` },
    ];
    
    y = innerMargin + 48;
    details.forEach(d => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(d.l_en, centerLine + 15, y);
      const enWidth = doc.getTextWidth(d.l_en);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.text(d.l_or, centerLine + 15, y + 3.5);
      const orWidth = doc.getTextWidth(d.l_or);

      const labelWidth = Math.max(enWidth, orWidth);
      const colWidth = (pageWidth - innerMargin - 15) - (centerLine + 15); // 103.5
      const gap = 4; // 4mm safety gap
      const maxValueWidth = colWidth - labelWidth - gap;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const valueLines = doc.splitTextToSize(String(d.v), maxValueWidth);

      let valueBaselineY = y + 1.5;
      if (valueLines.length > 1) {
        valueBaselineY = y;
      }
      valueLines.forEach((line: string, index: number) => {
        doc.text(line, pageWidth - innerMargin - 15, valueBaselineY + (index * 3.5), { align: 'right' });
      });

      const maxBaseline = Math.max(y + 3.5, valueBaselineY + (valueLines.length - 1) * 3.5);

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.line(centerLine + 15, maxBaseline + 2, pageWidth - innerMargin - 15, maxBaseline + 2);
      y = maxBaseline + 6;
    });

    // AUTO-PROMOTION LOGIC
    const isPass = student.generalAverage >= 50;
    const currentGradeNum = parseInt(schoolClass.grade.match(/\d+/)?.[0] || "0");
    const nextGradeLabelEn = isPass ? `GRADE ${currentGradeNum + 1}` : `GRADE ${currentGradeNum} (RETAINED)`;
    const nextGradeLabelOr = isPass ? `KUTAA ${currentGradeNum + 1}` : `KUTAA ${currentGradeNum} (KUTAA KANATTI HAFE)`;

    y += 3;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(centerLine + 15, y, (pageWidth - innerMargin - centerLine) - 30, 23);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.text(isPass ? "PROMOTED TO GRADE:" : "DETAINED IN GRADE:", centerLine + 18, y + 5.5);
    doc.setFont('times', 'italic');
    doc.setFontSize(7.5);
    doc.text(isPass ? "GARA KUTAA ITTI AANUTTI DARBEE:" : "KUTAA KANA KEESSATTI HAFE:", centerLine + 18, y + 10.5);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text(`${nextGradeLabelEn} / ${nextGradeLabelOr}`, rightMid, y + 18, { align: 'center' });
  };

  const drawResultsPage = (doc: any, student: any, schoolClass: any, yaadaText: string, hasEthiopicFont?: boolean, totalStudents?: number) => {
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 10;
    const innerMargin = 15;
    const centerLine = pageWidth / 2;

    // Border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));
    
    // Header
    doc.setFont('times', 'bold');
    let schoolNameFontSize = 15;
    let schoolName = schoolClass.schoolName.toUpperCase();
    while (doc.getTextWidth(schoolName) > 100 && schoolNameFontSize > 8) {
        schoolNameFontSize -= 0.5;
        doc.setFontSize(schoolNameFontSize);
    }
    doc.text(schoolName, innerMargin, innerMargin + 6);
    
    doc.setFontSize(10); // Larger
    doc.text(`STUDENT: ${student.fullName.toUpperCase()}`, pageWidth - innerMargin, innerMargin + 5, { align: 'right' });
    doc.setFontSize(7.5);
    doc.text(`| GRADE: ${schoolClass.grade} ${schoolClass.section}`, pageWidth - innerMargin - doc.getTextWidth(student.fullName.toUpperCase()) - 2, innerMargin + 5, { align: 'right' });
    
    doc.setFont('times', 'italic');
    doc.setFontSize(7.5);
    doc.text(`BARATAA: ${student.fullName.toUpperCase()} | KUTAA: ${schoolClass.grade} ${schoolClass.section}`, pageWidth - innerMargin, innerMargin + 9, { align: 'right' });
    doc.setLineWidth(0.3);
    doc.line(innerMargin, innerMargin + 12, pageWidth - innerMargin, innerMargin + 12);

    // LEFT HALF: RESULTS TABLE
    const tableTop = innerMargin + 20;
    const colWidths = [45, 15, 15, 18];
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    
    doc.setFillColor(240, 240, 240);
    doc.rect(innerMargin, tableTop, tableWidth, 10, 'F');
    doc.rect(innerMargin, tableTop, tableWidth, 10);
    doc.setFont('times', 'bold');
    doc.setFontSize(7);
    doc.text("SUBJECT", innerMargin + 2, tableTop + 4);
    doc.setFont('times', 'italic');
    doc.setFontSize(6);
    doc.text("BU'AA BARNOOTAA", innerMargin + 2, tableTop + 8);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(7);
    doc.text("SEM 1", innerMargin + colWidths[0] + 7.5, tableTop + 4, { align: 'center' });
    doc.setFont('times', 'italic');
    doc.setFontSize(5.5);
    doc.text("SEM 1", innerMargin + colWidths[0] + 7.5, tableTop + 8, { align: 'center' });
    
    doc.setFont('times', 'bold');
    doc.setFontSize(7);
    doc.text("SEM 2", innerMargin + colWidths[0] + colWidths[1] + 7.5, tableTop + 4, { align: 'center' });
    doc.setFont('times', 'italic');
    doc.setFontSize(5.5);
    doc.text("SEM 2", innerMargin + colWidths[0] + colWidths[1] + 7.5, tableTop + 8, { align: 'center' });
    
    doc.setFont('times', 'bold');
    doc.setFontSize(7);
    doc.text("AVG", innerMargin + colWidths[0] + colWidths[1] + colWidths[2] + 9, tableTop + 4, { align: 'center' });
    doc.setFont('times', 'italic');
    doc.setFontSize(5.5);
    doc.text("GIDDU-G", innerMargin + colWidths[0] + colWidths[1] + colWidths[2] + 9, tableTop + 8, { align: 'center' });

    let y = tableTop + 10;
    schoolClass.subjects.forEach((sub: string) => {
      doc.rect(innerMargin, y, tableWidth, 7);
      doc.setFont('times', 'bold');
      doc.setFontSize(6.5);
      doc.text(sub.toUpperCase(), innerMargin + 2, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(String(student.subjectScores[sub]?.sem1 ?? '-'), innerMargin + colWidths[0] + 7.5, y + 4.5, { align: 'center' });
      doc.text(String(student.subjectScores[sub]?.sem2 ?? '-'), innerMargin + colWidths[0] + colWidths[1] + 7.5, y + 4.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(student.subjectScores[sub]?.average?.toFixed(1) || '-', innerMargin + colWidths[0] + colWidths[1] + colWidths[2] + 9, y + 4.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      y += 7;
    });

    // 1. TOTAL SCORE Row
    doc.setFillColor(245, 245, 245);
    doc.rect(innerMargin, y, tableWidth, 9, 'F');
    doc.rect(innerMargin, y, tableWidth, 9);
    doc.setFont('times', 'bold');
    doc.setFontSize(7.5);
    doc.text("TOTAL SCORE", innerMargin + 2, y + 4);
    doc.setFont('times', 'italic');
    doc.setFontSize(6.5);
    doc.text("WALIIGALA", innerMargin + 2, y + 7.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(String(student.sem1Total || 0), innerMargin + colWidths[0] + 7.5, y + 5, { align: 'center' });
    doc.text(String(student.sem2Total || 0), innerMargin + colWidths[0] + colWidths[1] + 7.5, y + 5, { align: 'center' });
    doc.text(student.totalScore.toFixed(1), innerMargin + colWidths[0] + colWidths[1] + colWidths[2] + 9, y + 5, { align: 'center' });
    y += 9;

    // 2. GENERAL AVERAGE Row
    doc.setFillColor(235, 235, 235);
    doc.rect(innerMargin, y, tableWidth, 9, 'F');
    doc.rect(innerMargin, y, tableWidth, 9);
    doc.setFont('times', 'bold');
    doc.setFontSize(7.5);
    doc.text("GENERAL AVERAGE", innerMargin + 2, y + 4);
    doc.setFont('times', 'italic');
    doc.setFontSize(6.5);
    doc.text("GIDDU-GALEESSA", innerMargin + 2, y + 7.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text((student.sem1Avg || 0).toFixed(1) + "%", innerMargin + colWidths[0] + 7.5, y + 5, { align: 'center' });
    doc.text((student.sem2Avg || 0).toFixed(1) + "%", innerMargin + colWidths[0] + colWidths[1] + 7.5, y + 5, { align: 'center' });
    doc.text(student.generalAverage.toFixed(1) + "%", innerMargin + colWidths[0] + colWidths[1] + colWidths[2] + 9, y + 5, { align: 'center' });
    y += 9;

    // 3. RANK Row
    const totalStr = totalStudents ? `/${totalStudents}` : '';
    const sem1RankStr = student.sem1Rank ? `${student.sem1Rank}${totalStr}` : '-';
    const sem2RankStr = student.sem2Rank ? `${student.sem2Rank}${totalStr}` : '-';
    const rankStr = student.rank ? `${student.rank}${totalStr}` : '-';

    doc.setFillColor(0, 0, 0);
    doc.rect(innerMargin, y, tableWidth, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.text("RANK", innerMargin + 2, y + 4);
    doc.setFont('times', 'italic');
    doc.setFontSize(7);
    doc.text("SADARKAA", innerMargin + 2, y + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(sem1RankStr, innerMargin + colWidths[0] + 7.5, y + 5.5, { align: 'center' });
    doc.text(sem2RankStr, innerMargin + colWidths[0] + colWidths[1] + 7.5, y + 5.5, { align: 'center' });
    doc.text(rankStr, innerMargin + colWidths[0] + colWidths[1] + colWidths[2] + 9, y + 5.5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('times', 'normal');
    y += 10;

    // Conduct and Absent Box in PDF
    const statusBoxY = y + 4;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(innerMargin, statusBoxY, tableWidth, 12);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(7.5);
    doc.text("CONDUCT:", innerMargin + 2, statusBoxY + 4.5);
    doc.setFont('times', 'italic');
    doc.setFontSize(6.5);
    doc.text("AMALA:", innerMargin + 2, statusBoxY + 9.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(String(student.conduct || '-'), innerMargin + 18, statusBoxY + 7);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(7.5);
    doc.text("ABSENT:", innerMargin + 48, statusBoxY + 4.5);
    doc.setFont('times', 'italic');
    doc.setFontSize(6.5);
    doc.text("HAFUU:", innerMargin + 48, statusBoxY + 9.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(String(student.absent ?? '0') + " days", innerMargin + 62, statusBoxY + 7);

    // RIGHT HALF: BEHAVIOR & COMMENTS
    const rightX = centerLine + 5;
    const rightWidth = pageWidth - innerMargin - rightX;
    let ry = tableTop;

    // Behavior Table
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.text("GENERAL BEHAVIOR ASSESSMENT", rightX, ry - 5);
    doc.setFont('times', 'italic');
    doc.setFontSize(7.5);
    doc.text("MADAALLII AMALA WALIIGALAA", rightX, ry - 1.5);
    
    const bCols = [rightWidth - 40, 10, 10, 10, 10]; 
    doc.setFillColor(240, 240, 240);
    doc.rect(rightX, ry, rightWidth, 8, 'F');
    doc.rect(rightX, ry, rightWidth, 8);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(7);
    doc.text("BEHAVIOR ITEM", rightX + 2, ry + 3.5);
    doc.setFont('times', 'italic');
    doc.setFontSize(5.5);
    doc.text("GOSA AMALAA", rightX + 2, ry + 6.5);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(7);
    doc.text("E", rightX + bCols[0] + 5, ry + 5, { align: 'center' });
    doc.text("V", rightX + bCols[0] + bCols[1] + 5, ry + 5, { align: 'center' });
    doc.text("G", rightX + bCols[0] + bCols[1] + bCols[2] + 5, ry + 5, { align: 'center' });
    doc.text("P", rightX + bCols[0] + bCols[1] + bCols[2] + bCols[3] + 5, ry + 5, { align: 'center' });

    const behaviors = [
      { en: "Following Rules", or: "Seera Kabajuu" },
      { en: "Homework Completion", or: "Hojii Manaa Raawwachuu" },
      { en: "Uniform", or: "Yuniformii" },
      { en: "Attendance", or: "Hirmaannaa Barnootaa" },
      { en: "Effort in All Areas", or: "Carraaqqii Waliigalaa" }
    ];
    ry += 8;
    behaviors.forEach(b => {
      doc.rect(rightX, ry, rightWidth, 6.5);
      doc.setFont('times', 'bold');
      doc.setFontSize(6.5);
      doc.text(b.en, rightX + 2, ry + 3);
      doc.setFont('times', 'italic');
      doc.setFontSize(5.5);
      doc.text(b.or, rightX + 2, ry + 5.5);
      
      doc.setLineWidth(0.15);
      for(let i=0; i<4; i++) { 
        doc.rect(rightX + bCols[0] + (i * 10) + 3.5, ry + 1.75, 3, 3); 
      }
      ry += 6.5;
    });
    doc.setFont('times', 'normal');
    doc.setFontSize(5);
    doc.text("E=Excellent/Baayyee Gaarii, V=Very Good/Haalaan Gaarii, G=Good/Gaarii, P=Poor/Laafaa", rightX, ry + 3.5);

    // Teacher's Comment Section
    ry += 6;
    doc.setFontSize(8.5);
    doc.setFont('times', 'bold');
    doc.text("TEACHER'S RECOMMENDATIONS / YAADA BARSIISAA", rightX, ry);
    doc.line(rightX, ry + 1, rightX + rightWidth, ry + 1);
    
    const colWidth = (rightWidth / 2) - 2;
    const col1X = rightX;
    const col2X = rightX + colWidth + 4;

    ry += 5;
    doc.setFontSize(7.5);
    doc.setFont('times', 'bold');
    doc.text("1st Semester / Semistara 1", col1X, ry);
    doc.text("2nd Semester / Semistara 2", col2X, ry);
    doc.line(col1X, ry + 0.8, col1X + colWidth, ry + 0.8);
    doc.line(col2X, ry + 0.8, col2X + colWidth, ry + 0.8);

    ry += 4;
    doc.setFontSize(4);
    MULTILINGUAL_COMMENTS.forEach(item => {
      const maxTextWidth = colWidth - 4;
      
      doc.setFont('helvetica', 'bold');
      const linesEn = doc.splitTextToSize(item.en, maxTextWidth);
      
      doc.setFont('helvetica', 'italic');
      const linesOr = doc.splitTextToSize(item.or, maxTextWidth);
      
      let linesAm: string[] = [];
      if (hasEthiopicFont) {
        doc.setFont('AppUnicodeFont', 'normal');
        linesAm = doc.splitTextToSize(item.am, maxTextWidth);
      } else {
        doc.setFont('helvetica', 'normal');
        linesAm = doc.splitTextToSize(item.am, maxTextWidth);
      }
      
      // Draw checkbox for Col 1
      doc.setLineWidth(0.15);
      doc.rect(col1X, ry - 1.8, 2.0, 2.0);
      
      // Draw checkbox for Col 2
      doc.rect(col2X, ry - 1.8, 2.0, 2.0);
      
      let currY1 = ry;
      let currY2 = ry;
      
      // EN
      doc.setFont('helvetica', 'bold');
      linesEn.forEach((line: string) => {
        doc.text(line, col1X + 3.2, currY1);
        doc.text(line, col2X + 3.2, currY2);
        currY1 += 1.5;
        currY2 += 1.5;
      });
      
      // OR
      doc.setFont('helvetica', 'italic');
      linesOr.forEach((line: string) => {
        doc.text(line, col1X + 3.2, currY1);
        doc.text(line, col2X + 3.2, currY2);
        currY1 += 1.5;
        currY2 += 1.5;
      });
      
      // AM
      if (hasEthiopicFont) {
        doc.setFont('AppUnicodeFont', 'normal');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      linesAm.forEach((line: string) => {
        doc.text(line, col1X + 3.2, currY1);
        doc.text(line, col2X + 3.2, currY2);
        currY1 += 1.5;
        currY2 += 1.5;
      });
      
      ry = Math.max(currY1, currY2) + 1.2;
    });

    // Parent's Comments Separated by Semester
    ry += 5;
    doc.setFontSize(8.5);
    doc.setFont('times', 'bold');
    doc.text("PARENT'S COMMENT & SIGNATURE / YAADA MAATII FI MALLATTOO", rightX, ry);
    doc.line(rightX, ry + 1, rightX + rightWidth, ry + 1);

    // Semester 1
    ry += 6;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text("Sem 1 Comment / Yaada Sem 1:", rightX, ry);
    doc.setLineWidth(0.1);
    doc.line(rightX + 42, ry + 0.5, rightX + rightWidth - 25, ry + 0.5);
    doc.text("Sign / Mallattoo:", rightX + rightWidth - 24, ry);
    doc.line(rightX + rightWidth - 6, ry + 0.5, rightX + rightWidth, ry + 0.5);

    // Semester 2
    ry += 6;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text("Sem 2 Comment / Yaada Sem 2:", rightX, ry);
    doc.line(rightX + 42, ry + 0.5, rightX + rightWidth - 25, ry + 0.5);
    doc.text("Sign / Mallattoo:", rightX + rightWidth - 24, ry);
    doc.line(rightX + rightWidth - 6, ry + 0.5, rightX + rightWidth, ry + 0.5);

    // Signatures
    const sigY = pageHeight - innerMargin - 8;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    const labelText = "Class Teacher Name / Barsiisaa Itti Gafatamaa Daree:";
    const labelW = doc.getTextWidth ? doc.getTextWidth(labelText) : doc.getStringUnitWidth(labelText) * doc.getFontSize() / doc.internal.scaleFactor;
    doc.text(labelText, innerMargin, sigY);
    
    doc.setFont('helvetica', 'normal');
    const nameStr = schoolClass.teacherName.toUpperCase();
    const nameW = Math.max(35, (doc.getTextWidth ? doc.getTextWidth(nameStr) : doc.getStringUnitWidth(nameStr) * doc.getFontSize() / doc.internal.scaleFactor) + 4);
    doc.text(nameStr, innerMargin + labelW + 2, sigY - 0.5);
    doc.line(innerMargin + labelW + 1, sigY, innerMargin + labelW + nameW, sigY);
    
    doc.setFont('helvetica', 'bold');
    doc.text("Teacher Sign / Mallattoo Barsiisaa:", innerMargin, sigY + 6);
    doc.line(innerMargin + labelW + 1, sigY + 6, innerMargin + labelW + nameW, sigY + 6);

    doc.text("Principal Sign / Mallattoo Hogganaa:", centerLine + 10, sigY);
    doc.line(centerLine + 56, sigY, pageWidth - innerMargin - 30, sigY);
    
    doc.text("School Stamp / Chaappaa Mana Barumsaa:", centerLine + 10, sigY + 6);
    doc.rect(pageWidth - innerMargin - 25, sigY - 3, 22, 11);
  };

  const downloadPDF = async () => {
    if (!data) return;
    setIsGenerating(true);
    try {
      const doc = await generatePDFDirect(data.results[currentPage]);
      doc?.save(`${data.results[currentPage].fullName}_Report.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAllPDFs = async () => {
    if (!data) return;
    setIsGeneratingAll(true);
    setGenerationProgress(0);
    try {
      const zip = new JSZip();
      const total = data.results.length;
      for (let i = 0; i < total; i++) {
        const student = data.results[i];
        const doc = await generatePDFDirect(student);
        if (doc) {
          const pdfBlob = doc.output('blob');
          const safeName = student.fullName.replace(/[\/\\?%*:|"<>\s]+/g, '_');
          zip.file(`${safeName}_Report.pdf`, pdfBlob);
        }
        setGenerationProgress(Math.round(((i + 1) / total) * 100));
      }
      const zipContent = await zip.generateAsync({ type: 'blob' });
      const safeClassName = data.schoolClass.grade && data.schoolClass.section 
        ? `${data.schoolClass.grade}_${data.schoolClass.section}`.replace(/[\/\\?%*:|"<>\s]+/g, '_')
        : 'Class';
      saveAs(zipContent, `${safeClassName}_All_ReportCards.zip`);
    } catch (err) {
      console.error("Bulk PDF generation failed:", err);
    } finally {
      setIsGeneratingAll(false);
      setGenerationProgress(0);
    }
  };

  const downloadAllCombinedPDF = async () => {
    if (!data) return;
    setIsGeneratingCombined(true);
    setCombinedProgress(0);
    try {
      const { schoolClass, yaadaRules } = data;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const hasEthiopicFont = await fetchFontAndRegister(doc);
      const total = data.results.length;

      buildPortraitReportCards(
        doc,
        data.results,
        schoolClass,
        yaadaRules,
        hasEthiopicFont,
        total,
        (progress) => setCombinedProgress(progress)
      );

      const safeClassName = data.schoolClass.grade && data.schoolClass.section 
        ? `${data.schoolClass.grade}_${data.schoolClass.section}`.replace(/[\/\\?%*:|"<>\s]+/g, '_')
        : 'Class';
      doc.save(`${safeClassName}_All_ReportCards_Combined.pdf`);
    } catch (err) {
      console.error("Combined PDF generation failed:", err);
    } finally {
      setIsGeneratingCombined(false);
      setCombinedProgress(0);
    }
  };

  if (!data) return <div className="min-h-screen flex items-center justify-center bg-slate-50 italic text-slate-400">Loading student data...</div>;

  const currentStudent = data.results[currentPage];

  return (
    <div className="min-h-screen bg-slate-100 p-4 lg:p-8">
      <div className="max-w-[297mm] mx-auto mb-8 bg-white p-6 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4 border border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} disabled={currentPage === 0}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center min-w-[150px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student {currentPage + 1} of {data.results.length}</p>
            <p className="text-sm font-black text-slate-900 truncate max-w-[200px]">{currentStudent.fullName}</p>
          </div>
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setCurrentPage(prev => Math.min(data.results.length - 1, prev + 1))} disabled={currentPage === data.results.length - 1}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-center xl:justify-end">
          <div className="flex bg-slate-200 p-1 rounded-xl w-full sm:w-auto justify-center">
            <Button 
              variant={previewPage === 1 ? "default" : "ghost"} 
              size="sm" 
              className="rounded-lg text-[10px] h-8 px-4 flex-1 sm:flex-none"
              onClick={() => setPreviewPage(1)}
            >
              Results (P1)
            </Button>
            <Button 
              variant={previewPage === 2 ? "default" : "ghost"} 
              size="sm" 
              className="rounded-lg text-[10px] h-8 px-4 flex-1 sm:flex-none"
              onClick={() => setPreviewPage(2)}
            >
              Cover (P2)
            </Button>
          </div>
          <Button className="gap-2 rounded-xl h-12 bg-slate-900 hover:bg-slate-800 px-6 shadow-lg shadow-slate-900/20 flex-1 sm:flex-none justify-center text-xs sm:text-sm font-bold" onClick={downloadPDF} disabled={isGenerating || isGeneratingAll || isGeneratingCombined}>
            {isGenerating ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Download className="h-4 w-4" />}
            <span className="whitespace-nowrap">Download PDF</span>
          </Button>
          <Button 
            className="gap-2 rounded-xl h-12 bg-emerald-700 hover:bg-emerald-600 px-4 sm:px-6 shadow-lg shadow-emerald-700/20 text-white font-medium flex-1 sm:flex-none justify-center text-xs sm:text-sm" 
            onClick={downloadAllPDFs} 
            disabled={isGenerating || isGeneratingAll || isGeneratingCombined}
          >
            {isGeneratingAll ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Generating {generationProgress}%</span>
              </>
            ) : (
              <>
                <FileArchive className="h-4 w-4" />
                <span className="whitespace-nowrap">ZIP (All)</span>
              </>
            )}
          </Button>
          <Button 
            className="gap-2 rounded-xl h-12 bg-indigo-700 hover:bg-indigo-600 px-4 sm:px-6 shadow-lg shadow-indigo-700/20 text-white font-medium flex-1 sm:flex-none justify-center text-xs sm:text-sm" 
            onClick={downloadAllCombinedPDF} 
            disabled={isGenerating || isGeneratingAll || isGeneratingCombined}
          >
            {isGeneratingCombined ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Generating {combinedProgress}%</span>
              </>
            ) : (
              <>
                <Printer className="h-4 w-4" />
                <span className="whitespace-nowrap">Combined PDF</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Visual Preview (Simplified Web Preview) */}
      <div className="flex flex-col items-center gap-12 pb-20 w-full overflow-hidden">
        <div className="w-full overflow-x-auto py-4 px-2 flex justify-start xl:justify-center no-scrollbar">
          <div className="origin-top-left xl:origin-top scale-[0.35] sm:scale-[0.5] md:scale-[0.7] lg:scale-[0.8] xl:scale-100 min-w-[297mm] h-[210mm]">
             <div className="bg-white p-12 border-[10px] border-double border-slate-900 shadow-2xl w-[297mm] h-[210mm] relative font-serif overflow-hidden">
            {previewPage === 2 ? (
              <>
                {/* Decorative Corners */}
                <div className="absolute top-2 left-2 w-4 h-4 bg-slate-900 rounded-full" />
                <div className="absolute top-2 right-2 w-4 h-4 bg-slate-900 rounded-full" />
                <div className="absolute bottom-2 left-2 w-4 h-4 bg-slate-900 rounded-full" />
                <div className="absolute bottom-2 right-2 w-4 h-4 bg-slate-900 rounded-full" />

                <div className="flex h-full gap-16 p-4">
                   {/* Left Panel */}
                   <div className="w-1/2 border-r-2 border-dashed border-slate-300 pr-16 flex flex-col justify-between">
                      <div>
                        <div className="border-b-2 border-slate-900 mb-6 pb-2">
                           <h3 className="text-sm font-black text-center tracking-wide uppercase">METHOD OF MARKING / MADAALLII QABXIILEE</h3>
                        </div>
                        <div className="space-y-1">
                           {[
                             { g: 'A', r: '90-100', d: 'Excellent / Baayyee Gaarii' },
                             { g: 'B', r: '80-89', d: 'Very Good / Haalaan Gaarii' },
                             { g: 'C', r: '70-79', d: 'Good / Gaarii' },
                             { g: 'D', r: '60-69', d: 'Satisfactory / Quubsaa' },
                             { g: 'E', r: '50-59', d: "Needs Imp. / Fooyya'iinsa" },
                             { g: 'F', r: 'Below 50', d: 'Poor / Laafaa' }
                           ].map(item => (
                             <div key={item.g} className="flex justify-between items-center border-b border-slate-100 text-[10px] font-bold py-0.5">
                                <span className="bg-slate-900 text-white w-5 h-5 flex items-center justify-center rounded text-[8px]">{item.g}</span>
                                <span className="text-slate-400 text-[9px]">{item.r}</span>
                                <span className="italic">{item.d}</span>
                             </div>
                           ))}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h3 className="text-[10px] font-black mb-2 border-b border-slate-900 pb-0.5">PARENT GUIDANCE / QAJEELFAMA MAATII</h3>
                        <ul className="text-[8px] font-bold space-y-1.5 leading-tight">
                           <li>
                             <span className="text-slate-900 block font-black">1. Follow up your child's progress daily.</span>
                             <span className="text-slate-500 block italic">Guyyaa guyyaadhaan adeemsa barnoota mucaa keessanii hordofaa.</span>
                           </li>
                           <li>
                             <span className="text-slate-900 block font-black">2. Devote some time to help child's school work.</span>
                             <span className="text-slate-500 block italic">Hojii barnoota mucaa keessaniif yeroo keessan dabarsaa.</span>
                           </li>
                           <li>
                             <span className="text-slate-900 block font-black">3. Inculcate good manners and values.</span>
                             <span className="text-slate-500 block italic">Mucaa keessan keessatti amala gaariifi naamusaa gabbisaa.</span>
                           </li>
                        </ul>
                      </div>
                   </div>

                   {/* Right Panel */}
                   <div className="w-1/2 flex flex-col items-center justify-center text-center">
                      <div className="mb-10">
                        <h1 className="text-3xl font-black tracking-tighter mb-1">{data.schoolClass.schoolName.toUpperCase()}</h1>
                        <div className="flex items-center justify-center gap-4">
                           <div className="h-[2px] w-12 bg-slate-900" />
                           <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">ACADEMIC RECORD / GALMEE MADAALLII</span>
                           <div className="h-[2px] w-12 bg-slate-900" />
                        </div>
                      </div>

                      <div className="bg-slate-900 text-white px-8 py-3 text-lg font-black tracking-[0.1em] mb-6 shadow-md">
                        <div className="text-sm">STUDENT REPORT CARD</div>
                        <div className="text-[10px] font-medium tracking-normal text-slate-300">KAARDII GABAASA BARATAA</div>
                      </div>

                      <div className="w-full space-y-2.5 text-left px-8">
                         {[
                           { l_en: 'Student Full Name', l_or: 'Maqaa Barataa', v: currentStudent.fullName },
                           { l_en: 'Sex / Age', l_or: 'Saala / Umurii', v: `${currentStudent.gender === 'Male' ? 'MALE / DHIIRA' : 'FEMALE / DUBARTII'} / ${currentStudent.age}` },
                           { l_en: 'Academic Year', l_or: 'Bara Barnootaa', v: data.schoolClass.academicYear },
                           { l_en: 'Grade & Section', l_or: 'Kutaa & Daree', v: `${data.schoolClass.grade} - ${data.schoolClass.section}` },
                           { l_en: 'Homeroom Teacher', l_or: 'Barsiisaa Itti Gafatamaa Daree', v: data.schoolClass.teacherName },
                           { l_en: 'Conduct', l_or: 'Amala', v: currentStudent.conduct || '-' },
                           { l_en: 'Absent', l_or: 'Hafuu', v: `${currentStudent.absent ?? 0} days` }
                         ].map(item => (
                           <div key={item.l_en} className="border-b border-slate-100 flex justify-between items-end pb-1 gap-4">
                              <div className="flex flex-col min-w-0 max-w-[45%]">
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">{item.l_en}</span>
                                <span className="text-[7px] font-medium text-slate-500 italic tracking-wider leading-tight mt-0.5">{item.l_or}</span>
                              </div>
                              <span className="text-xs font-black text-slate-900 uppercase text-right break-words max-w-[55%] leading-tight pb-0.5">{item.v}</span>
                           </div>
                         ))}
                      </div>

                      <div className="mt-12 w-full px-12">
                         <div className="border-4 border-slate-900 p-4 rounded-xl flex flex-col items-start gap-2">
                            <span className="text-[10px] font-black uppercase">Promoted to Grade:</span>
                            <div className="w-full h-8 border-b-2 border-slate-200" />
                         </div>
                      </div>
                   </div>
                </div>
              </>
            ) : (
              <div className="p-10 h-full flex flex-col font-serif">
                <div className="flex justify-between items-start mb-6 border-b-2 border-slate-900 pb-4">
                  <div>
                    <h2 className="text-3xl font-black mb-1">{data.schoolClass.schoolName.toUpperCase()}</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Academic Performance Transcript</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-xl font-black mb-1">{currentStudent.fullName.toUpperCase()}</h3>
                    <p className="text-[10px] font-bold text-slate-500">GRADE: {data.schoolClass.grade}{data.schoolClass.section} | YEAR: {data.schoolClass.academicYear}</p>
                  </div>
                </div>

                <div className="flex gap-10 flex-1 overflow-hidden">
                  {/* Left: Results Table */}
                  <div className="w-[55%] flex flex-col">
                    <table className="w-full border-collapse border-2 border-slate-900">
                      <thead>
                        <tr className="bg-slate-100 text-slate-900 text-[10px] uppercase font-black border-b-2 border-slate-900">
                          <th className="p-2 text-left border-r border-slate-900">Subject Course</th>
                          <th className="p-2 text-center border-r border-slate-900">1st Term</th>
                          <th className="p-2 text-center border-r border-slate-900">2nd Term</th>
                          <th className="p-2 text-center">Average</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.schoolClass.subjects.map((sub, i) => (
                          <tr key={sub} className="border-b border-slate-900 text-[11px] font-bold">
                            <td className="p-2 border-r border-slate-900 uppercase">{sub}</td>
                            <td className="p-2 border-r border-slate-900 text-center">{currentStudent.subjectScores[sub]?.sem1 ?? '-'}</td>
                            <td className="p-2 border-r border-slate-900 text-center">{currentStudent.subjectScores[sub]?.sem2 ?? '-'}</td>
                            <td className="p-2 text-center font-black bg-slate-50">{currentStudent.subjectScores[sub]?.average?.toFixed(1) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-slate-900">
                        <tr className="bg-slate-50 text-slate-900 font-bold text-[10px] border-b border-slate-900">
                          <td className="p-2 border-r border-slate-900 uppercase">Total Score</td>
                          <td className="p-2 border-r border-slate-900 text-center">{currentStudent.sem1Total || 0}</td>
                          <td className="p-2 border-r border-slate-900 text-center">{currentStudent.sem2Total || 0}</td>
                          <td className="p-2 text-center font-black">{currentStudent.totalScore.toFixed(1)}</td>
                        </tr>
                        <tr className="bg-slate-100 text-slate-900 font-bold text-[10px] border-b border-slate-900">
                          <td className="p-2 border-r border-slate-900 uppercase">General Average</td>
                          <td className="p-2 border-r border-slate-900 text-center">{(currentStudent.sem1Avg || 0).toFixed(1)}%</td>
                          <td className="p-2 border-r border-slate-900 text-center">{(currentStudent.sem2Avg || 0).toFixed(1)}%</td>
                          <td className="p-2 text-center font-black">{currentStudent.generalAverage.toFixed(1)}%</td>
                        </tr>
                        <tr className="bg-slate-900 text-white font-black text-xs">
                          <td className="p-2 border-r border-white uppercase">Rank</td>
                          <td className="p-2 border-r border-white text-center">{currentStudent.sem1Rank ? `${currentStudent.sem1Rank}/${data?.results.length || 0}` : '-'}</td>
                          <td className="p-2 border-r border-white text-center">{currentStudent.sem2Rank ? `${currentStudent.sem2Rank}/${data?.results.length || 0}` : '-'}</td>
                          <td className="p-2 text-center font-black">{currentStudent.rank ? `${currentStudent.rank}/${data?.results.length || 0}` : '-'}</td>
                        </tr>
                      </tfoot>
                    </table>
                    
                    <div className="mt-4 p-4 bg-slate-50 border-2 border-slate-900 rounded-lg flex justify-between items-center text-xs font-serif shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Conduct (Amala):</span>
                        <span className="font-black text-slate-900 text-sm">{currentStudent.conduct || '-'}</span>
                      </div>
                      <div className="h-4 w-px bg-slate-300" />
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Absent (Hafte):</span>
                        <span className="font-black text-slate-900 text-sm">{currentStudent.absent ?? '0'} days</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Behavior & Comments */}
                  <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                    {/* Behavior Section */}
                    <div>
                       <h4 className="text-[10px] font-black uppercase mb-2 border-b border-slate-900 pb-1">General Behavior</h4>
                       <table className="w-full border-collapse border border-slate-900 text-[8px]">
                          <thead>
                             <tr className="bg-slate-100 border-b border-slate-900">
                                <th className="p-1 text-left border-r border-slate-900">Item</th>
                                <th className="p-1 text-center border-r border-slate-900 w-6">E</th>
                                <th className="p-1 text-center border-r border-slate-900 w-6">V</th>
                                <th className="p-1 text-center border-r border-slate-900 w-6">G</th>
                                <th className="p-1 text-center w-6">P</th>
                             </tr>
                          </thead>
                          <tbody>
                             {["Following Rules", "Homework Completion", "Uniform", "Attendance", "Effort in All Areas"].map(b => (
                                <tr key={b} className="border-b border-slate-900 font-bold">
                                   <td className="p-1 border-r border-slate-900">{b}</td>
                                   <td className="p-1 border-r border-slate-900 text-center"><div className="w-2 h-2 border border-slate-400 mx-auto" /></td>
                                   <td className="p-1 border-r border-slate-900 text-center"><div className="w-2 h-2 border border-slate-400 mx-auto" /></td>
                                   <td className="p-1 border-r border-slate-900 text-center"><div className="w-2 h-2 border border-slate-400 mx-auto" /></td>
                                   <td className="p-1 text-center"><div className="w-2 h-2 border border-slate-400 mx-auto" /></td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                        <p className="text-[7px] italic mt-1">E=Excellent, V=Very Good, G=Good, P=Poor</p>
                     </div>

                     {/* Comments Section */}
                     <div>
                        <h4 className="text-[10px] font-black uppercase mb-1.5 border-b border-slate-900 pb-1">Teacher's Recommendations</h4>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                           {/* 1st Semester column */}
                           <div>
                              <h5 className="text-[8px] font-black uppercase text-slate-500 mb-1 border-b border-slate-200 pb-0.5">1st Semester</h5>
                              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                 {MULTILINGUAL_COMMENTS.map((item, index) => (
                                    <div key={index} className="flex items-start gap-1.5">
                                       <div className="w-2.5 h-2.5 border border-slate-900 shrink-0 mt-0.5" />
                                       <div className="text-[7px] leading-tight font-bold text-slate-800">
                                          <p className="font-extrabold text-slate-900">EN: {item.en}</p>
                                          <p className="italic text-slate-600 font-medium">OR: {item.or}</p>
                                          <p className="text-slate-500 font-medium">AM: {item.am}</p>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                           
                           {/* 2nd Semester column */}
                           <div>
                              <h5 className="text-[8px] font-black uppercase text-slate-500 mb-1 border-b border-slate-200 pb-0.5">2nd Semester</h5>
                              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                 {MULTILINGUAL_COMMENTS.map((item, index) => (
                                    <div key={index} className="flex items-start gap-1.5">
                                       <div className="w-2.5 h-2.5 border border-slate-900 shrink-0 mt-0.5" />
                                       <div className="text-[7px] leading-tight font-bold text-slate-800">
                                          <p className="font-extrabold text-slate-900">EN: {item.en}</p>
                                          <p className="italic text-slate-600 font-medium">OR: {item.or}</p>
                                          <p className="text-slate-500 font-medium">AM: {item.am}</p>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                     </div>

                    {/* Parent's Comments Section */}
                    <div className="mt-4 border-t border-dashed border-slate-300 pt-3">
                       <h4 className="text-[10px] font-black uppercase mb-1.5 border-b border-slate-900 pb-1">Parent's Comments & Signatures</h4>
                       <div className="space-y-3 font-sans">
                          <div className="flex items-center gap-2">
                             <span className="text-[8px] font-black uppercase text-slate-500 shrink-0">1st Sem Parent's Comment:</span>
                             <div className="flex-1 border-b border-slate-300 h-4" />
                             <span className="text-[8px] font-black uppercase text-slate-500 shrink-0 ml-2">Sign:</span>
                             <div className="w-16 border-b border-slate-300 h-4" />
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[8px] font-black uppercase text-slate-500 shrink-0">2nd Sem Parent's Comment:</span>
                             <div className="flex-1 border-b border-slate-300 h-4" />
                             <span className="text-[8px] font-black uppercase text-slate-500 shrink-0 ml-2">Sign:</span>
                             <div className="w-16 border-b border-slate-300 h-4" />
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Footer Signatures */}
                <div className="flex justify-between items-end mt-8 border-t-2 border-slate-900 pt-6">
                  <div className="text-center w-40">
                    <p className="text-[10px] font-black uppercase mb-1 text-slate-800">{data.schoolClass.teacherName}</p>
                    <div className="h-px w-full bg-slate-900 mb-2" />
                    <p className="text-[8px] font-bold uppercase text-slate-500">Homeroom Teacher</p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center mb-2">
                      <p className="text-[10px] font-bold text-slate-300">SCHOOL SEAL</p>
                    </div>
                    <p className="text-[8px] font-bold uppercase">Principal</p>
                  </div>
                  <div className="text-center w-40">
                    <div className="h-px w-full bg-slate-900 mb-2" />
                    <p className="text-[8px] font-bold uppercase">Director / Principal</p>
                  </div>
                </div>
              </div>
            )}
         </div>
      </div>
    </div>
  </div>
  </div>
  );
}

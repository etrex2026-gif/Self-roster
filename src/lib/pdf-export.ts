import { jsPDF } from 'jspdf';

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
    if (this.hasUnicodeFont && fontName === "AppUnicodeFont") {
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

const drawCoverPage = (doc: any, student: any, schoolClass: any) => {
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 5;
    const innerMargin = 10;
    const centerLine = pageWidth / 2;

    // Decorative Border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(2);
    doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));
    doc.setLineWidth(0.6);
    doc.rect(margin + 2.5, margin + 2.5, pageWidth - (margin * 2) - 5, pageHeight - (margin * 2) - 5);

    // Corner Accents
    const pts = [[margin, margin], [pageWidth-margin, margin], [margin, pageHeight-margin], [pageWidth-margin, pageHeight-margin]];
    pts.forEach(([px, py]) => { doc.setFillColor(0, 0, 0); doc.rect(px - 1, py - 1, 2, 2, 'F'); });

    // Vertical Divider
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(centerLine, innerMargin, centerLine, pageHeight - innerMargin);
    doc.setLineDashPattern([], 0);

    // LEFT PANEL: GUIDANCE
    const leftMid = (centerLine + innerMargin) / 2;
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text("METHOD OF MARKING / MADAALLII QABXIILEE", leftMid, innerMargin + 8, { align: 'center' });
    doc.setLineWidth(0.6);
    doc.line(innerMargin + 10, innerMargin + 11, centerLine - 10, innerMargin + 11);

    doc.setFontSize(9.5);
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
      doc.setFont('helvetica', 'bold');
      doc.text(g.r, innerMargin + 10, y);
      doc.text(`${g.g} - ${g.d}`, centerLine - 10, y, { align: 'right' });
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(innerMargin + 10, y + 2, centerLine - 10, y + 2);
      y += 8;
    });

    y += 5;
    doc.setDrawColor(0, 0, 0);
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text("PARENT GUIDANCE / QAJEELFAMA MAATII", leftMid, y, { align: 'center' });
    doc.setLineWidth(0.6);
    doc.line(innerMargin + 10, y + 2, centerLine - 10, y + 2);
    
    const guidance = [
      { en: "1. Follow up your child's progress daily.", or: "Guyyaa guyyaadhaan adeemsa barnoota mucaa keessanii hordofaa." },
      { en: "2. Devote some of your time to help child's school work.", or: "Hojii barnoota mucaa keessaniif yeroo keessan dabarsaa." },
      { en: "3. Inculcate good manners and values in your child.", or: "Mucaa keessan keessatti amala gaariifi naamusaa gabbisaa." },
      { en: "4. Meet educational and psychological needs of child.", or: "Fedhii barnootaa fi xiinsammuu mucaa keessanii guutaa." },
      { en: "5. Observe your child's behavior and group of friends.", or: "Amala mucaa keessanii fi hiriyyoota isaa hordofaa." },
      { en: "6. Attend school functions to know child's success.", or: "Milkaa'ina mucaaf sagantaalee mana barumsaa irratti argamaa." }
    ];
    y += 8;
    guidance.forEach(l => { 
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(l.en, innerMargin + 5, y);
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(7.5);
      doc.text(l.or, innerMargin + 5, y + 4);
      y += 9.5; 
    });

    // RIGHT PANEL: COVER
    const rightMid = centerLine + (pageWidth - margin - centerLine) / 2;
    doc.setFont('times', 'bold');
    doc.setFontSize(19);
    const wrappedSchoolName = doc.splitTextToSize((schoolClass.schoolName || '').toUpperCase(), 120);
    doc.text(wrappedSchoolName, rightMid, innerMargin + 10, { align: 'center' });
    doc.setLineWidth(1.0);
    const schoolNameBottomY = innerMargin + 14 + (wrappedSchoolName.length * 8);
    doc.line(centerLine + 20, schoolNameBottomY, pageWidth - innerMargin - 20, schoolNameBottomY);
    doc.setFontSize(11);
    doc.text("ACADEMIC ASSESSMENT RECORD / GALMEE MADAALLII BARNOOTAA", rightMid, schoolNameBottomY + 7, { align: 'center' });

    doc.setFillColor(0, 0, 0);
    doc.rect(centerLine + 15, schoolNameBottomY + 14, (pageWidth - innerMargin - centerLine) - 30, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(15);
    doc.text("STUDENT REPORT CARD", rightMid, schoolNameBottomY + 21, { align: 'center' });
    doc.setFontSize(11);
    doc.text("KAARDII GABAASA BARATAA", rightMid, schoolNameBottomY + 28, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    const details = [
      { l_en: 'STUDENT NAME', l_or: 'MAQAA BARATAA', v: (student.fullName || '').toUpperCase(), bold: true, size: 12 },
      { l_en: 'SEX / AGE', l_or: 'SAALA / UMURII', v: `${String(student.gender || '-').toUpperCase()} / ${student.age || '-'}` },
      { l_en: 'ACADEMIC YEAR', l_or: 'BARA BARNOOTAA', v: schoolClass.academicYear || '-' },
      { l_en: 'GRADE & SECTION', l_or: 'KUTAA & DAREE', v: `${schoolClass.grade || '-'} - ${schoolClass.section || '-'}` },
      { l_en: 'HOMEROOM TEACHER', l_or: 'Barsiisaa Itti Gafatamaa Daree', v: (schoolClass.teacherName || '').toUpperCase() },
      { l_en: 'CONDUCT', l_or: 'AMALA', v: String(student.conduct || '-') },
      { l_en: 'ABSENT', l_or: 'HAFUU', v: `${student.absent ?? 0} DAYS` },
    ];
    
    y = schoolNameBottomY + 38;
    details.forEach(d => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(d.size || 10.5);
      doc.text(d.l_en, centerLine + 15, y);
      const enWidth = doc.getTextWidth(d.l_en);

      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(d.size ? d.size - 3 : 8.5);
      doc.text(d.l_or, centerLine + 15, y + 4.5);
      const orWidth = doc.getTextWidth(d.l_or);

      const labelWidth = Math.max(enWidth, orWidth);
      const colWidth = (pageWidth - innerMargin - 15) - (centerLine + 15); 
      const gap = 6;
      const maxValueWidth = colWidth - labelWidth - gap;

      doc.setFont('helvetica', d.bold ? 'bold' : 'bold');
      doc.setFontSize(d.size || 11);
      const valueLines = doc.splitTextToSize(String(d.v), maxValueWidth);

      let valueBaselineY = y + 2.5;
      if (valueLines.length > 1) {
        valueBaselineY = y;
      }
      valueLines.forEach((line: string, index: number) => {
        doc.text(line, pageWidth - innerMargin - 15, valueBaselineY + (index * 4.5), { align: 'right' });
      });

      const maxBaseline = Math.max(y + 4.5, valueBaselineY + (valueLines.length - 1) * 4.5);

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.15);
      doc.line(centerLine + 15, maxBaseline + 2.5, pageWidth - innerMargin - 15, maxBaseline + 2.5);
      y = maxBaseline + 7.5;
    });

    // PROMOTION
    const isPass = (student.generalAverage || 0) >= 50;
    const currentGradeNum = parseInt(schoolClass.grade?.match(/\d+/)?.[0] || "0");
    const nextGradeLabelEn = isPass ? `GRADE ${currentGradeNum + 1}` : `GRADE ${currentGradeNum} (RETAINED)`;
    const nextGradeLabelOr = isPass ? `KUTAA ${currentGradeNum + 1}` : `KUTAA ${currentGradeNum} (KUTAA KANATTI HAFE)`;

    y += 2;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.rect(centerLine + 15, y, (pageWidth - innerMargin - centerLine) - 30, 25);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text(isPass ? "PROMOTED TO GRADE:" : "DETAINED IN GRADE:", centerLine + 18, y + 6);
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(9);
    doc.text(isPass ? "GARA KUTAA ITTI AANUTTI DARBEE:" : "KUTAA KANA KEESSATTI HAFE:", centerLine + 18, y + 11.5);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.text(`${nextGradeLabelEn} / ${nextGradeLabelOr}`, rightMid, y + 20, { align: 'center' });
};

const drawResultsPage = (doc: any, student: any, schoolClass: any, hasEthiopicFont?: boolean, totalStudents?: number) => {
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 5;
    const innerMargin = 10;
    const centerLine = pageWidth / 2;

    // Border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.2);
    doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));
    
    // Header
    doc.setFont('times', 'bold');
    let schoolNameFontSize = 19;
    let schoolName = (schoolClass.schoolName || '').toUpperCase();
    while (doc.getTextWidth(schoolName) > 100 && schoolNameFontSize > 10) {
        schoolNameFontSize -= 0.5;
        doc.setFontSize(schoolNameFontSize);
    }
    doc.text(schoolName, innerMargin, innerMargin + 7);
    
    doc.setFontSize(11);
    // Student Name
    const nameLabelEn = "STUDENT: ";
    const nameLabelOr = "BARATAA: ";
    const studentName = (student.fullName || '').toUpperCase();
    
    // Grade/Section
    const gradeLabelEn = `   GRADE: ${schoolClass.grade || '-'} ${schoolClass.section || '-'}`;
    const gradeLabelOr = `   KUTAA: ${schoolClass.grade || '-'} ${schoolClass.section || '-'}`;

    const headerNameW = 100;
    const wrappedNameEn = doc.splitTextToSize(`${nameLabelEn}${studentName}`, headerNameW);
    const wrappedNameOr = doc.splitTextToSize(`${nameLabelOr}${studentName}`, headerNameW);

    doc.setFont('times', 'bold');
    doc.text(wrappedNameEn, pageWidth - innerMargin, innerMargin + 5, { align: 'right' });
    doc.setFont('times', 'bolditalic');
    doc.text(wrappedNameOr, pageWidth - innerMargin, innerMargin + 5 + (wrappedNameEn.length * 4.5), { align: 'right' });
    
    doc.setFont('times', 'bold');
    doc.text(gradeLabelEn, pageWidth - innerMargin, innerMargin + 5 + (wrappedNameEn.length * 4.5) + 5, { align: 'right' });
    doc.setFont('times', 'bolditalic');
    doc.text(gradeLabelOr, pageWidth - innerMargin, innerMargin + 5 + (wrappedNameEn.length * 4.5) + 10, { align: 'right' });
    
    doc.setLineWidth(0.4);
    doc.line(innerMargin, innerMargin + 5 + (wrappedNameEn.length * 4.5) + 15, pageWidth - innerMargin, innerMargin + 5 + (wrappedNameEn.length * 4.5) + 15);

    // LEFT HALF: RESULTS TABLE
    const tableTop = innerMargin + 26;
    const colWidths = [45, 15, 15, 18];
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    
    doc.setFillColor(240, 240, 240);
    doc.rect(innerMargin, tableTop, tableWidth, 11, 'F');
    doc.rect(innerMargin, tableTop, tableWidth, 11);
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text("SUBJECT", innerMargin + 2, tableTop + 4.5);
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(8);
    doc.text("BU'AA BARNOOTAA", innerMargin + 2, tableTop + 9);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text("SEM 1", innerMargin + colWidths[0] + 7.5, tableTop + 4.5, { align: 'center' });
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(7.5);
    doc.text("SEM 1", innerMargin + colWidths[0] + 7.5, tableTop + 9, { align: 'center' });
    
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text("SEM 2", innerMargin + colWidths[0] + colWidths[1] + 7.5, tableTop + 4.5, { align: 'center' });
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(7.5);
    doc.text("SEM 2", innerMargin + colWidths[0] + colWidths[1] + 7.5, tableTop + 9, { align: 'center' });
    
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text("AVG", innerMargin + colWidths[0] + colWidths[1] + colWidths[2] + 9, tableTop + 4.5, { align: 'center' });
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(7.5);
    doc.text("GIDDU-G", innerMargin + colWidths[0] + colWidths[1] + colWidths[2] + 9, tableTop + 9, { align: 'center' });

    let y = tableTop + 11;
    const subjectList = schoolClass.subjects || [];
    subjectList.forEach((sub: string) => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.25);
      doc.rect(innerMargin, y, tableWidth, 7.5);
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text(sub.toUpperCase(), innerMargin + 2, y + 5);
      
      const scores = student.subjectScores?.[sub] || {};
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(String(scores.sem1 ?? '-'), innerMargin + colWidths[0] + 7.5, y + 5, { align: 'center' });
      doc.text(String(scores.sem2 ?? '-'), innerMargin + colWidths[0] + colWidths[1] + 7.5, y + 5, { align: 'center' });
      doc.text(scores.average !== undefined ? Number(scores.average).toFixed(2) : '-', innerMargin + colWidths[0] + colWidths[1] + colWidths[2] + 9, y + 5, { align: 'center' });
      y += 7.5;
    });

    // 1. TOTAL SCORE Row
    doc.setFillColor(245, 245, 245);
    doc.rect(innerMargin, y, tableWidth, 10, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(innerMargin, y, tableWidth, 10);
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.text("TOTAL SCORE", innerMargin + 2, y + 4.5);
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(8.5);
    doc.text("WALIIGALA", innerMargin + 2, y + 8.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(String(student.sem1Total || 0), innerMargin + colWidths[0] + 7.5, y + 6, { align: 'center' });
    doc.text(String(student.sem2Total || 0), innerMargin + colWidths[0] + colWidths[1] + 7.5, y + 6, { align: 'center' });
    doc.text(Number(student.totalScore || 0).toFixed(2), innerMargin + colWidths[0] + colWidths[1] + colWidths[2] + 9, y + 6, { align: 'center' });
    y += 10;

    // 2. GENERAL AVERAGE Row
    doc.setFillColor(235, 235, 235);
    doc.rect(innerMargin, y, tableWidth, 10, 'F');
    doc.setLineWidth(0.4);
    doc.rect(innerMargin, y, tableWidth, 10);
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.text("GENERAL AVERAGE", innerMargin + 2, y + 4.5);
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(8.5);
    doc.text("GIDDU-GALEESSA", innerMargin + 2, y + 8.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text(Number(student.sem1Avg || 0).toFixed(2) + "%", innerMargin + colWidths[0] + 7.5, y + 6, { align: 'center' });
    doc.text(Number(student.sem2Avg || 0).toFixed(2) + "%", innerMargin + colWidths[0] + colWidths[1] + 7.5, y + 6, { align: 'center' });
    doc.text(Number(student.generalAverage || 0).toFixed(2) + "%", innerMargin + colWidths[0] + colWidths[1] + colWidths[2] + 9, y + 6, { align: 'center' });
    y += 10;

    // 3. RANK Row
    const totalStr = totalStudents ? `/${totalStudents}` : '';
    const sem1RankStr = student.sem1Rank ? `${student.sem1Rank}${totalStr}` : '-';
    const sem2RankStr = student.sem2Rank ? `${student.sem2Rank}${totalStr}` : '-';
    const rankStr = student.rank ? `${student.rank}${totalStr}` : '-';

    doc.setFillColor(0, 0, 0);
    doc.rect(innerMargin, y, tableWidth, 11, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text("RANK", innerMargin + 2, y + 4.5);
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(9);
    doc.text("SADARKAA", innerMargin + 2, y + 9.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text(sem1RankStr, innerMargin + colWidths[0] + 7.5, y + 7, { align: 'center' });
    doc.text(sem2RankStr, innerMargin + colWidths[0] + colWidths[1] + 7.5, y + 7, { align: 'center' });
    doc.text(rankStr, innerMargin + colWidths[0] + colWidths[1] + colWidths[2] + 9, y + 7, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('times', 'normal');
    y += 11;

    // Conduct and Absent Box in PDF
    const statusBoxY = y + 5;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(innerMargin, statusBoxY, tableWidth, 14);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text("CONDUCT:", innerMargin + 2, statusBoxY + 5.5);
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(9);
    doc.text("AMALA:", innerMargin + 2, statusBoxY + 11.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(String(student.conduct || '-'), innerMargin + 22, statusBoxY + 8.5);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text("ABSENT:", innerMargin + 48, statusBoxY + 5.5);
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(9);
    doc.text("HAFUU:", innerMargin + 48, statusBoxY + 11.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(String(student.absent ?? '0') + " days", innerMargin + 64, statusBoxY + 8.5);

    // RIGHT HALF: BEHAVIOR & COMMENTS
    const rightX = centerLine + 5;
    const rightWidth = pageWidth - innerMargin - rightX;
    let ry = tableTop;

    // Behavior Table
    doc.setFont('times', 'bold');
    doc.setFontSize(11.5);
    doc.text("GENERAL BEHAVIOR ASSESSMENT", rightX, ry - 7);
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(9);
    doc.text("MADAALLII AMALA WALIIGALAA", rightX, ry - 2.5);
    
    const bCols = [rightWidth - 40, 10, 10, 10, 10]; 
    doc.setFillColor(240, 240, 240);
    doc.rect(rightX, ry, rightWidth, 10, 'F');
    doc.rect(rightX, ry, rightWidth, 10);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.text("BEHAVIOR ITEM", rightX + 2, ry + 4.5);
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(7.5);
    doc.text("GOSA AMALAA", rightX + 2, ry + 8.5);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text("E", rightX + bCols[0] + 5, ry + 6, { align: 'center' });
    doc.text("V", rightX + bCols[0] + bCols[1] + 5, ry + 6, { align: 'center' });
    doc.text("G", rightX + bCols[0] + bCols[1] + bCols[2] + 5, ry + 6, { align: 'center' });
    doc.text("P", rightX + bCols[0] + bCols[1] + bCols[2] + bCols[3] + 5, ry + 6, { align: 'center' });

    const behaviors = [
      { en: "Following Rules", or: "Seera Kabajuu" },
      { en: "Homework Completion", or: "Hojii Manaa Raawwachuu" },
      { en: "Uniform", or: "Yuniformii" },
      { en: "Attendance", or: "Hirmaannaa Barnootaa" },
      { en: "Effort in All Areas", or: "Carraaqqii Waliigalaa" }
    ];
    ry += 10;
    behaviors.forEach(b => {
      doc.setLineWidth(0.2);
      doc.rect(rightX, ry, rightWidth, 8);
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.text(b.en, rightX + 2, ry + 3.5);
      doc.setFont('times', 'bolditalic');
      doc.setFontSize(8);
      doc.text(b.or, rightX + 2, ry + 6.5);
      
      doc.setLineWidth(0.2);
      for(let i=0; i<4; i++) { 
        doc.rect(rightX + bCols[0] + (i * 10) + 3.5, ry + 2, 4, 4); 
      }
      ry += 8;
    });
    doc.setFont('times', 'bold');
    doc.setFontSize(7);
    doc.text("E=Excellent/Baayyee Gaarii, V=Very Good/Haalaan Gaarii, G=Good/Gaarii, P=Poor/Laafaa", rightX, ry + 4.5);

    // Teacher's Comment Section
    ry += 9;
    doc.setFontSize(11);
    doc.setFont('times', 'bold');
    doc.text("TEACHER'S RECOMMENDATIONS / YAADA BARSIISAA", rightX, ry);
    doc.setLineWidth(0.5);
    doc.line(rightX, ry + 1.5, rightX + rightWidth, ry + 1.5);
    
    const colWidth = (rightWidth / 2) - 3;
    const col1X = rightX;
    const col2X = rightX + colWidth + 6;

    ry += 7;
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.text("1st Semester / Semistara 1", col1X, ry);
    doc.text("2nd Semester / Semistara 2", col2X, ry);
    doc.line(col1X, ry + 1, col1X + colWidth, ry + 1);
    doc.line(col2X, ry + 1, col2X + colWidth, ry + 1);

    ry += 5;
    doc.setFontSize(6.5);
    MULTILINGUAL_COMMENTS.forEach(item => {
      const maxTextWidth = colWidth - 6;
      
      doc.setFont('helvetica', 'bold');
      const linesEn = doc.splitTextToSize(item.en, maxTextWidth);
      
      doc.setFont('helvetica', 'bolditalic');
      const linesOr = doc.splitTextToSize(item.or, maxTextWidth);
      
      let linesAm: string[] = [];
      if (hasEthiopicFont) {
        doc.setFont('AppUnicodeFont', 'normal');
        linesAm = doc.splitTextToSize(item.am, maxTextWidth);
      } else {
        doc.setFont('helvetica', 'bold');
        linesAm = doc.splitTextToSize(item.am, maxTextWidth);
      }
      
      // Draw checkbox for Col 1
      doc.setLineWidth(0.2);
      doc.rect(col1X, ry - 2.5, 3.0, 3.0);
      
      // Draw checkbox for Col 2
      doc.rect(col2X, ry - 2.5, 3.0, 3.0);
      
      let currY1 = ry;
      let currY2 = ry;
      
      // EN
      doc.setFont('helvetica', 'bold');
      linesEn.forEach((line: string) => {
        doc.text(line, col1X + 4.5, currY1);
        doc.text(line, col2X + 4.5, currY2);
        currY1 += 2;
        currY2 += 2;
      });
      
      // OR
      doc.setFont('helvetica', 'bolditalic');
      linesOr.forEach((line: string) => {
        doc.text(line, col1X + 4.5, currY1);
        doc.text(line, col2X + 4.5, currY2);
        currY1 += 2;
        currY2 += 2;
      });
      
      // AM
      if (hasEthiopicFont) {
        doc.setFont('AppUnicodeFont', 'normal');
      } else {
        doc.setFont('helvetica', 'bold');
      }
      linesAm.forEach((line: string) => {
        doc.text(line, col1X + 4.5, currY1);
        doc.text(line, col2X + 4.5, currY2);
        currY1 += 2;
        currY2 += 2;
      });
      
      ry = Math.max(currY1, currY2) + 1.5;
    });

    const sigY = pageHeight - innerMargin - 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Teacher: ${schoolClass.teacherName || '-'}`, innerMargin, sigY);
    doc.line(innerMargin, sigY + 1.5, innerMargin + 60, sigY + 1.5);
    doc.text("Director / Principal Signature", centerLine + 10, sigY);
    doc.line(centerLine + 10, sigY + 1.5, centerLine + 80, sigY + 1.5);
};

export const exportAllReportCards = async (students: any[], setupData: any, onProgress: (progress: number) => void) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const hasEthiopicFont = await fetchFontAndRegister(doc);
    const total = students.length;
    
    const scale = 0.70;
    const offsetX = 3.5;
    const topOffsetY = 3.5;
    const bottomOffsetY = 150.5;

    for (let i = 0; i < total; i += 2) {
        const s1 = students[i];
        const s2 = i + 1 < total ? students[i + 1] : null;

        // Page 1: Cover Pages
        const topCoverWriter = new ScaledPdfWriter(doc, scale, offsetX, topOffsetY, hasEthiopicFont);
        drawCoverPage(topCoverWriter, s1, setupData);
        if (s2) {
            const bottomCoverWriter = new ScaledPdfWriter(doc, scale, offsetX, bottomOffsetY, hasEthiopicFont);
            drawCoverPage(bottomCoverWriter, s2, setupData);
        }
        
        doc.setDrawColor(128, 128, 128);
        doc.setLineWidth(0.2);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(0, 148.5, 210, 148.5);
        doc.setLineDashPattern([], 0);

        // Page 2: Results
        doc.addPage('a4', 'p');
        const topResultsWriter = new ScaledPdfWriter(doc, scale, offsetX, topOffsetY, hasEthiopicFont);
        drawResultsPage(topResultsWriter, s1, setupData, hasEthiopicFont, total);
        if (s2) {
            const bottomResultsWriter = new ScaledPdfWriter(doc, scale, offsetX, bottomOffsetY, hasEthiopicFont);
            drawResultsPage(bottomResultsWriter, s2, setupData, hasEthiopicFont, total);
        }

        doc.setDrawColor(128, 128, 128);
        doc.setLineWidth(0.2);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(0, 148.5, 210, 148.5);
        doc.setLineDashPattern([], 0);

        onProgress(Math.min(100, Math.round(((i + 2) / total) * 100)));
        if (i + 2 < total) doc.addPage('a4', 'p');
    }

    const safeName = (setupData.schoolName || 'Class').replace(/[\/\\?%*:|"<>\s]+/g, '_');
    doc.save(`${safeName}_ReportCards.pdf`);
};

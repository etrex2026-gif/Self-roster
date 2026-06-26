import { type Student, type Mark, type SchoolClass } from '../db/db';
import { type StudentResult, getStatusFromAverage } from '../types';

export function calculateClassResults(
  students: Student[],
  marks: Mark[],
  schoolClass: SchoolClass
): StudentResult[] {
  const subjects = schoolClass.subjects;
  
  const results: StudentResult[] = students.map(student => {
    const studentMarks = marks.filter(m => m.studentId === student.id);
    const subjectScores: StudentResult['subjectScores'] = {};
    
    let totalScore = 0;
    let sem1Total = 0;
    let sem2Total = 0;
    let sem1Count = 0;
    let sem2Count = 0;
    let subjectsCount = 0;

    subjects.forEach(subject => {
      const sem1Mark = studentMarks.find(m => m.subject === subject && m.semester === 1)?.score ?? null;
      const sem2Mark = studentMarks.find(m => m.subject === subject && m.semester === 2)?.score ?? null;
      
      if (sem1Mark !== null) {
        sem1Total += sem1Mark;
        sem1Count++;
      }
      if (sem2Mark !== null) {
        sem2Total += sem2Mark;
        sem2Count++;
      }

      let average: number | null = null;
      if (sem1Mark !== null && sem2Mark !== null) {
        average = (sem1Mark + sem2Mark) / 2;
        totalScore += average;
        subjectsCount++;
      } else if (sem1Mark !== null) {
        average = sem1Mark;
        totalScore += average;
        subjectsCount++;
      } else if (sem2Mark !== null) {
        average = sem2Mark;
        totalScore += average;
        subjectsCount++;
      }

      subjectScores[subject] = {
        sem1: sem1Mark,
        sem2: sem2Mark,
        average: average
      };
    });

    const generalAverage = subjectsCount > 0 ? totalScore / subjectsCount : 0;
    const sem1Avg = sem1Count > 0 ? sem1Total / sem1Count : 0;
    const sem2Avg = sem2Count > 0 ? sem2Total / sem2Count : 0;

    return {
      id: student.id!,
      rollNo: student.rollNo,
      fullName: student.fullName,
      gender: student.gender,
      age: student.age,
      subjectScores,
      totalScore,
      generalAverage,
      sem1Total,
      sem2Total,
      sem1Avg,
      sem2Avg,
      sem1Rank: 0,
      sem2Rank: 0,
      rank: 0, // Calculated later
      status: student.isDropout ? 'Dropout' : getStatusFromAverage(generalAverage),
      position: '', // Calculated later
      conduct: student.conduct,
      absent: student.absent,
      isDropout: student.isDropout
    };
  });

  // Sort by average to determine rank, excluding dropouts
  const nonDropouts = results.filter(r => !r.isDropout);
  const sortedNonDropouts = [...nonDropouts].sort((a, b) => b.generalAverage - a.generalAverage);
  
  sortedNonDropouts.forEach((res, index) => {
    // Find the original result object to update it
    const original = results.find(r => r.id === res.id);
    if (original) {
      original.rank = index + 1;
      original.position = getOrdinal(index + 1);
    }
  });

  // Sem 1 Rank
  const sortedSem1 = [...nonDropouts].sort((a, b) => (b.sem1Avg || 0) - (a.sem1Avg || 0));
  sortedSem1.forEach((res, index) => {
    const original = results.find(r => r.id === res.id);
    if (original) original.sem1Rank = index + 1;
  });

  // Sem 2 Rank
  const sortedSem2 = [...nonDropouts].sort((a, b) => (b.sem2Avg || 0) - (a.sem2Avg || 0));
  sortedSem2.forEach((res, index) => {
    const original = results.find(r => r.id === res.id);
    if (original) original.sem2Rank = index + 1;
  });

  return results.sort((a, b) => a.rollNo - b.rollNo);
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

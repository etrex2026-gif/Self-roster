export interface StudentResult {
  id: number;
  rollNo: number;
  fullName: string;
  gender: string;
  age: number;
  subjectScores: {
    [subject: string]: {
      sem1: number | null;
      sem2: number | null;
      average: number | null;
    }
  };
  totalScore: number;
  generalAverage: number;
  sem1Total?: number;
  sem2Total?: number;
  sem1Avg?: number;
  sem2Avg?: number;
  sem1Rank?: number;
  sem2Rank?: number;
  rank: number;
  status: string;
  position: string;
  conduct: string;
  absent: number;
  isDropout?: boolean;
}

export interface ClassAnalysis {
  highestStudent: string;
  highestScore: number;
  lowestStudent: string;
  lowestScore: number;
  top10: StudentResult[];
  bottom10: StudentResult[];
  classAverage: number;
  passRate: number;
  failRate: number;
  maleAverage: number;
  femaleAverage: number;
  studentCount: number;
}

export interface SubjectAnalysis {
  subject: string;
  highest: number;
  lowest: number;
  average: number;
  passRate: number;
  failRate: number;
}

export const GRADE_RULES = [
  { min: 90, max: 100, letter: 'A', status: 'Excellent' },
  { min: 80, max: 89, letter: 'B', status: 'Very Good' },
  { min: 70, max: 79, letter: 'C', status: 'Good' },
  { min: 60, max: 69, letter: 'D', status: 'Satisfactory' },
  { min: 50, max: 59, letter: 'E', status: 'Needs Improvement' },
  { min: 0, max: 49, letter: 'F', status: 'Poor' },
];

export function getStatusFromAverage(average: number): string {
  const rule = GRADE_RULES.find(r => average >= r.min && (average < (r.max + 1) || (r.max === 100 && average === 100)));
  // Handle edge cases for floating point or values exactly on boundaries
  const matchedRule = GRADE_RULES.find(r => average >= r.min && average <= r.max);
  return matchedRule ? matchedRule.status : (average >= 50 ? 'Pass' : 'Fail');
}

export function getLetterFromAverage(average: number): string {
  const matchedRule = GRADE_RULES.find(r => average >= r.min && average <= r.max);
  return matchedRule ? matchedRule.letter : 'F';
}

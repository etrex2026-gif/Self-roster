import Dexie, { type Table } from 'dexie';

export interface Teacher {
  id?: number;
  name: string;
  password: string;
  schoolName: string;
}

export interface SchoolClass {
  id?: number;
  schoolName: string;
  teacherName: string;
  academicYear: string;
  grade: string;
  section: string;
  subjects: string[];
}

export interface Student {
  id?: number;
  classId: number;
  rollNo: number;
  fullName: string;
  gender: string;
  age: number;
  dob?: string;
  conduct: string;
  absent: number;
  isDropout?: boolean;
}

export interface Mark {
  id?: number;
  studentId: number;
  classId: number;
  subject: string;
  semester: 1 | 2;
  score: number;
}

export interface Setting {
  id?: number;
  key: string;
  value: any;
}

export class SchoolDB extends Dexie {
  teachers!: Table<Teacher>;
  classes!: Table<SchoolClass>;
  students!: Table<Student>;
  marks!: Table<Mark>;
  settings!: Table<Setting>;

  constructor() {
    super('SchoolResultDB');
    this.version(2).stores({
      teachers: '++id, name, password',
      classes: '++id, grade, section',
      students: '++id, classId, rollNo, fullName',
      marks: '++id, [studentId+semester+subject], classId, studentId, subject, semester',
      settings: '++id, key'
    });
  }
}

export const db = new SchoolDB();

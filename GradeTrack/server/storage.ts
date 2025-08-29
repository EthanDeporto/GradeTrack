import {
  users,
  students,
  classes,
  assignments,
  grades,
  enrollments,
  type User,
  type UpsertUser,
  type Student,
  type InsertStudent,
  type Class,
  type InsertClass,
  type Assignment,
  type InsertAssignment,
  type Grade,
  type InsertGrade,
  type Enrollment,
  type InsertEnrollment,
  type StudentWithGrades,
  type ClassWithDetails,
  type GradeWithDetails,
  type AssignmentWithDetails,
} from "@shared/schema";
import { db } from "./localDb";
import { eq, and, desc, sql, like, or } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Student operations
  getStudents(teacherId?: string, searchQuery?: string): Promise<StudentWithGrades[]>;
  getStudent(id: string): Promise<StudentWithGrades | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student>;
  deleteStudent(id: string): Promise<void>;

  // Class operations
  getClasses(teacherId?: string): Promise<ClassWithDetails[]>;
  getClass(id: string): Promise<ClassWithDetails | undefined>;
  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: string, classData: Partial<InsertClass>): Promise<Class>;
  deleteClass(id: string): Promise<void>;

  // Assignment operations
  getAssignments(classId?: string): Promise<AssignmentWithDetails[]>;
  getAssignment(id: string): Promise<AssignmentWithDetails | undefined>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: string, assignment: Partial<InsertAssignment>): Promise<Assignment>;
  deleteAssignment(id: string): Promise<void>;

  // Grade operations
  getGrades(filters?: { studentId?: string; assignmentId?: string; classId?: string }): Promise<GradeWithDetails[]>;
  getGrade(id: string): Promise<GradeWithDetails | undefined>;
  createGrade(grade: InsertGrade): Promise<Grade>;
  updateGrade(id: string, grade: Partial<InsertGrade>): Promise<Grade>;
  deleteGrade(id: string): Promise<void>;

  // Enrollment operations
  enrollStudent(enrollment: InsertEnrollment): Promise<Enrollment>;
  unenrollStudent(studentId: string, classId: string): Promise<void>;
  getStudentEnrollments(studentId: string): Promise<Enrollment[]>;

  // Dashboard stats
  getDashboardStats(teacherId?: string): Promise<{
    totalStudents: number;
    averageGrade: string;
    assignmentsDue: number;
    activeClasses: number;
  }>;

  // Recent activity
  getRecentGrades(limit?: number, teacherId?: string): Promise<GradeWithDetails[]>;
  getUpcomingAssignments(limit?: number, teacherId?: string): Promise<AssignmentWithDetails[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Student operations
  async getStudents(teacherId?: string, searchQuery?: string): Promise<StudentWithGrades[]> {
    let baseQuery = db
      .select({
        student: students,
        enrollment: enrollments,
        class: classes,
      })
      .from(students)
      .leftJoin(enrollments, eq(students.id, enrollments.studentId))
      .leftJoin(classes, eq(enrollments.classId, classes.id));

    let conditions = [];
    
    if (teacherId) {
      conditions.push(eq(classes.teacherId, teacherId));
    }

    if (searchQuery) {
      conditions.push(
        or(
          like(students.firstName, `%${searchQuery}%`),
          like(students.lastName, `%${searchQuery}%`),
          like(students.email, `%${searchQuery}%`),
          like(students.studentId, `%${searchQuery}%`)
        )
      );
    }

    const query = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    const results = await query;
    
    // Group by student and calculate grades
    const studentMap = new Map<string, StudentWithGrades>();
    
    for (const row of results) {
      if (!studentMap.has(row.student.id)) {
        studentMap.set(row.student.id, {
          ...row.student,
          enrollments: [],
          grades: [],
        });
      }
      
      const student = studentMap.get(row.student.id)!;
      if (row.enrollment && row.class) {
        student.enrollments.push({
          ...row.enrollment,
          class: row.class,
        });
      }
    }

    // Get grades for each student
    for (const student of studentMap.values()) {
      const studentGrades = await db
        .select({
          grade: grades,
          assignment: assignments,
        })
        .from(grades)
        .innerJoin(assignments, eq(grades.assignmentId, assignments.id))
        .where(eq(grades.studentId, student.id));

      student.grades = studentGrades.map(({ grade, assignment }) => ({
        ...grade,
        assignment,
      }));

      // Calculate current grade
      if (student.grades.length > 0) {
        const totalPercentage = student.grades.reduce((sum, g) => sum + (Number(g.percentage) || 0), 0);
        const avgPercentage = totalPercentage / student.grades.length;
        student.currentGrade = {
          percentage: Math.round(avgPercentage),
          letterGrade: this.getLetterGrade(avgPercentage),
        };
      }
    }

    return Array.from(studentMap.values());
  }

  async getStudent(id: string): Promise<StudentWithGrades | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    if (!student) return undefined;

    const enrollmentData = await db
      .select({
        enrollment: enrollments,
        class: classes,
      })
      .from(enrollments)
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .where(eq(enrollments.studentId, id));

    const gradeData = await db
      .select({
        grade: grades,
        assignment: assignments,
      })
      .from(grades)
      .innerJoin(assignments, eq(grades.assignmentId, assignments.id))
      .where(eq(grades.studentId, id));

    const result: StudentWithGrades = {
      ...student,
      enrollments: enrollmentData.map(({ enrollment, class: cls }) => ({
        ...enrollment,
        class: cls,
      })),
      grades: gradeData.map(({ grade, assignment }) => ({
        ...grade,
        assignment,
      })),
    };

    // Calculate current grade
    if (result.grades.length > 0) {
      const totalPercentage = result.grades.reduce((sum, g) => sum + (Number(g.percentage) || 0), 0);
      const avgPercentage = totalPercentage / result.grades.length;
      result.currentGrade = {
        percentage: Math.round(avgPercentage),
        letterGrade: this.getLetterGrade(avgPercentage),
      };
    }

    return result;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db.insert(students).values(student).returning();
    return newStudent;
  }

  async updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student> {
    const [updatedStudent] = await db
      .update(students)
      .set({ ...student, updatedAt: new Date() })
      .where(eq(students.id, id))
      .returning();
    return updatedStudent;
  }

  async deleteStudent(id: string): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
  }

  // Class operations
  async getClasses(teacherId?: string): Promise<ClassWithDetails[]> {
    let query = db
      .select({
        class: classes,
        teacher: users,
      })
      .from(classes)
      .innerJoin(users, eq(classes.teacherId, users.id));

    if (teacherId) {
      query = query.where(eq(classes.teacherId, teacherId));
    }

    const classResults = await query;
    
    const classDetailsPromises = classResults.map(async ({ class: cls, teacher }) => {
      const enrollmentData = await db
        .select({
          enrollment: enrollments,
          student: students,
        })
        .from(enrollments)
        .innerJoin(students, eq(enrollments.studentId, students.id))
        .where(eq(enrollments.classId, cls.id));

      const assignmentData = await db
        .select()
        .from(assignments)
        .where(eq(assignments.classId, cls.id));

      return {
        ...cls,
        teacher,
        enrollments: enrollmentData.map(({ enrollment, student }) => ({
          ...enrollment,
          student,
        })),
        assignments: assignmentData,
      };
    });

    return Promise.all(classDetailsPromises);
  }

  async getClass(id: string): Promise<ClassWithDetails | undefined> {
    const [classData] = await db
      .select({
        class: classes,
        teacher: users,
      })
      .from(classes)
      .innerJoin(users, eq(classes.teacherId, users.id))
      .where(eq(classes.id, id));

    if (!classData) return undefined;

    const enrollmentData = await db
      .select({
        enrollment: enrollments,
        student: students,
      })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .where(eq(enrollments.classId, id));

    const assignmentData = await db
      .select()
      .from(assignments)
      .where(eq(assignments.classId, id));

    return {
      ...classData.class,
      teacher: classData.teacher,
      enrollments: enrollmentData.map(({ enrollment, student }) => ({
        ...enrollment,
        student,
      })),
      assignments: assignmentData,
    };
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const [newClass] = await db.insert(classes).values(classData).returning();
    return newClass;
  }

  async updateClass(id: string, classData: Partial<InsertClass>): Promise<Class> {
    const [updatedClass] = await db
      .update(classes)
      .set({ ...classData, updatedAt: new Date() })
      .where(eq(classes.id, id))
      .returning();
    return updatedClass;
  }

  async deleteClass(id: string): Promise<void> {
    await db.delete(classes).where(eq(classes.id, id));
  }

  // Assignment operations
  async getAssignments(classId?: string): Promise<AssignmentWithDetails[]> {
    let query = db
      .select({
        assignment: assignments,
        class: classes,
      })
      .from(assignments)
      .innerJoin(classes, eq(assignments.classId, classes.id));

    if (classId) {
      query = query.where(eq(assignments.classId, classId));
    }

    const assignmentResults = await query;
    
    const assignmentDetailsPromises = assignmentResults.map(async ({ assignment, class: cls }) => {
      const gradeData = await db
        .select({
          grade: grades,
          student: students,
        })
        .from(grades)
        .innerJoin(students, eq(grades.studentId, students.id))
        .where(eq(grades.assignmentId, assignment.id));

      return {
        ...assignment,
        class: cls,
        grades: gradeData.map(({ grade, student }) => ({
          ...grade,
          student,
        })),
        submissionCount: gradeData.length,
      };
    });

    return Promise.all(assignmentDetailsPromises);
  }

  async getAssignment(id: string): Promise<AssignmentWithDetails | undefined> {
    const [assignmentData] = await db
      .select({
        assignment: assignments,
        class: classes,
      })
      .from(assignments)
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(eq(assignments.id, id));

    if (!assignmentData) return undefined;

    const gradeData = await db
      .select({
        grade: grades,
        student: students,
      })
      .from(grades)
      .innerJoin(students, eq(grades.studentId, students.id))
      .where(eq(grades.assignmentId, id));

    return {
      ...assignmentData.assignment,
      class: assignmentData.class,
      grades: gradeData.map(({ grade, student }) => ({
        ...grade,
        student,
      })),
      submissionCount: gradeData.length,
    };
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [newAssignment] = await db.insert(assignments).values(assignment).returning();
    return newAssignment;
  }

  async updateAssignment(id: string, assignment: Partial<InsertAssignment>): Promise<Assignment> {
    const [updatedAssignment] = await db
      .update(assignments)
      .set({ ...assignment, updatedAt: new Date() })
      .where(eq(assignments.id, id))
      .returning();
    return updatedAssignment;
  }

  async deleteAssignment(id: string): Promise<void> {
    await db.delete(assignments).where(eq(assignments.id, id));
  }

  // Grade operations
  async getGrades(filters?: { studentId?: string; assignmentId?: string; classId?: string }): Promise<GradeWithDetails[]> {
    let query = db
      .select({
        grade: grades,
        student: students,
        assignment: assignments,
        class: classes,
      })
      .from(grades)
      .innerJoin(students, eq(grades.studentId, students.id))
      .innerJoin(assignments, eq(grades.assignmentId, assignments.id))
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .orderBy(desc(grades.gradedAt));

    if (filters?.studentId) {
      query = query.where(eq(grades.studentId, filters.studentId));
    }
    if (filters?.assignmentId) {
      query = query.where(eq(grades.assignmentId, filters.assignmentId));
    }
    if (filters?.classId) {
      query = query.where(eq(classes.id, filters.classId));
    }

    const results = await query;
    
    return results.map(({ grade, student, assignment, class: cls }) => ({
      ...grade,
      student,
      assignment: {
        ...assignment,
        class: cls,
      },
    }));
  }

  async getGrade(id: string): Promise<GradeWithDetails | undefined> {
    const [result] = await db
      .select({
        grade: grades,
        student: students,
        assignment: assignments,
        class: classes,
      })
      .from(grades)
      .innerJoin(students, eq(grades.studentId, students.id))
      .innerJoin(assignments, eq(grades.assignmentId, assignments.id))
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(eq(grades.id, id));

    if (!result) return undefined;

    return {
      ...result.grade,
      student: result.student,
      assignment: {
        ...result.assignment,
        class: result.class,
      },
    };
  }

  async createGrade(grade: InsertGrade): Promise<Grade> {
    // Calculate percentage and letter grade
    const assignment = await db.select().from(assignments).where(eq(assignments.id, grade.assignmentId)).limit(1);
    if (assignment.length > 0 && grade.pointsEarned !== null) {
      const percentage = (Number(grade.pointsEarned) / Number(assignment[0].totalPoints)) * 100;
      grade.percentage = percentage.toString();
      grade.letterGrade = this.getLetterGrade(percentage);
    }

    const [newGrade] = await db.insert(grades).values(grade).returning();
    return newGrade;
  }

  async updateGrade(id: string, grade: Partial<InsertGrade>): Promise<Grade> {
    // Recalculate percentage if points changed
    if (grade.pointsEarned !== undefined) {
      const [existingGrade] = await db.select().from(grades).where(eq(grades.id, id));
      if (existingGrade) {
        const assignment = await db.select().from(assignments).where(eq(assignments.id, existingGrade.assignmentId)).limit(1);
        if (assignment.length > 0) {
          const percentage = (Number(grade.pointsEarned) / Number(assignment[0].totalPoints)) * 100;
          grade.percentage = percentage.toString();
          grade.letterGrade = this.getLetterGrade(percentage);
        }
      }
    }

    const [updatedGrade] = await db
      .update(grades)
      .set({ ...grade, updatedAt: new Date() })
      .where(eq(grades.id, id))
      .returning();
    return updatedGrade;
  }

  async deleteGrade(id: string): Promise<void> {
    await db.delete(grades).where(eq(grades.id, id));
  }

  // Enrollment operations
  async enrollStudent(enrollment: InsertEnrollment): Promise<Enrollment> {
    const [newEnrollment] = await db.insert(enrollments).values(enrollment).returning();
    return newEnrollment;
  }

  async unenrollStudent(studentId: string, classId: string): Promise<void> {
    await db.delete(enrollments).where(
      and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.classId, classId)
      )
    );
  }

  async getStudentEnrollments(studentId: string): Promise<Enrollment[]> {
    return db.select().from(enrollments).where(eq(enrollments.studentId, studentId));
  }

  // Dashboard stats
  async getDashboardStats(teacherId?: string): Promise<{
    totalStudents: number;
    averageGrade: string;
    assignmentsDue: number;
    activeClasses: number;
  }> {
    let classFilter = sql`1=1`;
    if (teacherId) {
      classFilter = eq(classes.teacherId, teacherId);
    }

    // Total students
    const totalStudentsQuery = await db
      .select({ count: sql<number>`count(distinct ${students.id})` })
      .from(students)
      .innerJoin(enrollments, eq(students.id, enrollments.studentId))
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .where(classFilter);

    const totalStudents = totalStudentsQuery[0]?.count || 0;

    // Average grade
    const avgGradeQuery = await db
      .select({ avg: sql<number>`avg(${grades.percentage})` })
      .from(grades)
      .innerJoin(assignments, eq(grades.assignmentId, assignments.id))
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(classFilter);

    const avgGrade = avgGradeQuery[0]?.avg || 0;
    const averageGrade = this.getLetterGrade(avgGrade);

    // Assignments due this week
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const assignmentsDueQuery = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignments)
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(
        and(
          classFilter,
          sql`${assignments.dueDate} <= ${weekFromNow}`,
          sql`${assignments.dueDate} >= ${new Date()}`
        )
      );

    const assignmentsDue = assignmentsDueQuery[0]?.count || 0;

    // Active classes
    const activeClassesQuery = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .where(classFilter);

    const activeClasses = activeClassesQuery[0]?.count || 0;

    return {
      totalStudents,
      averageGrade,
      assignmentsDue,
      activeClasses,
    };
  }

  // Recent activity
  async getRecentGrades(limit = 10, teacherId?: string): Promise<GradeWithDetails[]> {
    let query = db
      .select({
        grade: grades,
        student: students,
        assignment: assignments,
        class: classes,
      })
      .from(grades)
      .innerJoin(students, eq(grades.studentId, students.id))
      .innerJoin(assignments, eq(grades.assignmentId, assignments.id))
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .orderBy(desc(grades.gradedAt))
      .limit(limit);

    if (teacherId) {
      query = query.where(eq(classes.teacherId, teacherId));
    }

    const results = await query;
    
    return results.map(({ grade, student, assignment, class: cls }) => ({
      ...grade,
      student,
      assignment: {
        ...assignment,
        class: cls,
      },
    }));
  }

  async getUpcomingAssignments(limit = 10, teacherId?: string): Promise<AssignmentWithDetails[]> {
    let query = db
      .select({
        assignment: assignments,
        class: classes,
      })
      .from(assignments)
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(sql`${assignments.dueDate} >= ${new Date()}`)
      .orderBy(assignments.dueDate)
      .limit(limit);

    if (teacherId) {
      query = query.where(eq(classes.teacherId, teacherId));
    }

    const assignmentResults = await query;
    
    const assignmentDetailsPromises = assignmentResults.map(async ({ assignment, class: cls }) => {
      const gradeCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(grades)
        .where(eq(grades.assignmentId, assignment.id));

      return {
        ...assignment,
        class: cls,
        grades: [],
        submissionCount: gradeCount[0]?.count || 0,
      };
    });

    return Promise.all(assignmentDetailsPromises);
  }

  private getLetterGrade(percentage: number): string {
    if (percentage >= 97) return 'A+';
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
  }
}

export const storage = new DatabaseStorage();

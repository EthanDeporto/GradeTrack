import {
  users,
  students,
  teachers,
  classes,
  assignments,
  grades,
  enrollments,
  type User,
  type UpsertUser,
  type Student,
  type InsertStudent,
  type InsertTeacher,
  type Class,
  type InsertClass,
  type Assignment,
  type InsertAssignment,
  type Grade,
  type AssignmentWithStudentGrade,
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
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  getStudents(teacherId?: string, searchQuery?: string): Promise<StudentWithGrades[]>;
  getStudent(id: string): Promise<StudentWithGrades | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student>;
  deleteStudent(id: string): Promise<void>;

  getClasses(teacherId?: string): Promise<ClassWithDetails[]>;
  getClass(id: string): Promise<ClassWithDetails | undefined>;
  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: string, classData: Partial<InsertClass>): Promise<Class>;
  deleteClass(id: string): Promise<void>;

  getAssignments(classId?: string): Promise<AssignmentWithDetails[]>;
  getAssignment(id: string): Promise<AssignmentWithDetails | undefined>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: string, assignment: Partial<InsertAssignment>): Promise<Assignment>;
  deleteAssignment(id: string): Promise<void>;

  getGrades(filters?: { studentId?: string; assignmentId?: string; classId?: string }): Promise<GradeWithDetails[]>;
  getGrade(id: string): Promise<GradeWithDetails | undefined>;
  createGrade(grade: InsertGrade): Promise<Grade>;
  updateGrade(id: string, grade: Partial<InsertGrade>): Promise<Grade>;
  deleteGrade(id: string): Promise<void>;

  enrollStudent(enrollment: InsertEnrollment): Promise<Enrollment>;
  unenrollStudent(studentId: string, classId: string): Promise<void>;
  getStudentEnrollments(studentId: string): Promise<Enrollment[]>;

  getDashboardStats(teacherId?: string): Promise<{
    totalStudents: number;
    averageGrade: string;
    assignmentsDue: number;
    activeClasses: number;
  }>;

  getRecentGrades(limit?: number, teacherId?: string): Promise<GradeWithDetails[]>;
  getUpcomingAssignments(limit?: number, teacherId?: string): Promise<AssignmentWithDetails[]>;
}
// storage.ts

export class DatabaseStorage implements IStorage {
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
        set: { ...userData, updatedAt: new Date() },
      })
      .returning();
    return user;
  }

  // -------------------------
  // Students
  // -------------------------
  async getStudents(teacherId?: string, searchQuery?: string): Promise<StudentWithGrades[]> {
    let baseQuery = db
  .select({ student: students, user: users, enrollment: enrollments, class: classes })
  .from(students)
  .leftJoin(users, eq(students.id, users.id))
  .leftJoin(enrollments, eq(students.id, enrollments.studentId))
  .leftJoin(classes, eq(enrollments.classId, classes.id));


    const conditions = [];
    if (teacherId) conditions.push(eq(classes.teacherId, teacherId));
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

    const results = conditions.length > 0 ? await baseQuery.where(and(...conditions)) : await baseQuery;

    const studentMap = new Map<string, StudentWithGrades>();
for (const row of results) {
  if (!studentMap.has(row.student.id)) {
    studentMap.set(row.student.id, {
      ...row.student,
      email: row.user?.email ?? null,
      profileImageUrl: row.user?.profileImageUrl ?? null,
      enrollments: [],
      grades: [],
    });
  }
  const student = studentMap.get(row.student.id)!;
  if (row.enrollment && row.class) {
    student.enrollments.push({ ...row.enrollment, class: row.class });
  }
}


    // Fetch grades for each student
    for (const student of studentMap.values()) {
      const studentGrades = await db
        .select({ grade: grades, assignment: assignments })
        .from(grades)
        .innerJoin(assignments, eq(grades.assignmentId, assignments.id))
        .where(eq(grades.studentId, student.id));

      student.grades = studentGrades.map(({ grade, assignment }) => ({ ...grade, assignment }));

      if (student.grades.length > 0) {
        const avg = student.grades.reduce((sum, g) => sum + Number(g.percentage || 0), 0) / student.grades.length;
        student.currentGrade = { percentage: Math.round(avg), letterGrade: this.getLetterGrade(avg) };
      }
    }

    return Array.from(studentMap.values());
  }

  async getStudent(id: string): Promise<StudentWithGrades | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    if (!student) return undefined;

    const enrollmentData = await db
      .select({ enrollment: enrollments, class: classes })
      .from(enrollments)
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .where(eq(enrollments.studentId, id));

    const gradeData = await db
      .select({ grade: grades, assignment: assignments })
      .from(grades)
      .innerJoin(assignments, eq(grades.assignmentId, assignments.id))
      .where(eq(grades.studentId, id));

    const result: StudentWithGrades = {
      ...student,
      enrollments: enrollmentData.map(({ enrollment, class: cls }) => ({ ...enrollment, class: cls })),
      grades: gradeData.map(({ grade, assignment }) => ({ ...grade, assignment })),
    };

    if (result.grades.length > 0) {
      const avg = result.grades.reduce((sum, g) => sum + Number(g.percentage || 0), 0) / result.grades.length;
      result.currentGrade = { percentage: Math.round(avg), letterGrade: this.getLetterGrade(avg) };
    }

    return result;
  }

async createStudent(student: InsertStudent & { password: string }): Promise<Student> {
  // 1. Hash the password
  const hashedPassword = await bcrypt.hash(student.password, 10);

  // 2. Create corresponding user
  const user = await this.upsertUser({
    id: randomUUID(), // new UUID for the `users` table
    email: student.email ?? "", // fallback if optional
    firstName: student.firstName,
    lastName: student.lastName,
    profileImageUrl: student.profileImageUrl ?? null,
    role: "student",
    passwordHash: hashedPassword,
  });

  // 2. Insert into `students` table
  const [newStudent] = await db.insert(students).values({ ...student, id: user.id }).returning();
  return newStudent;
}


async updateStudent(
  id: string,
  student: Partial<InsertStudent> & { password?: string }
): Promise<Student> {
  // Update password if provided
  if (student.password && student.password.trim() !== "") {
    const hashed = await bcrypt.hash(student.password, 10);
    await db
      .update(users)
      .set({ passwordHash: hashed, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Update email if provided
  if (student.email) {
    await db
      .update(users)
      .set({ email: student.email, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Remove password/email from object before updating students table
  const { password, email, ...studentData } = student;

  // ✅ Update studentId as well if provided
  const [updatedStudent] = await db
    .update(students)
    .set({ ...studentData, updatedAt: new Date() })
    .where(eq(students.id, id))
    .returning();

  return updatedStudent;
}


  async deleteStudent(id: string): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async getUsersByRole(role: "teacher" | "admin" | "student"): Promise<User[]> {
  return db.select().from(users).where(eq(users.role, role));
}

// Create a teacher
async createTeacher(teacher: InsertTeacher & { password: string }): Promise<User> {
  const hashedPassword = await bcrypt.hash(teacher.password, 10);

  // 1. Create corresponding user
  const user = await this.upsertUser({
    id: randomUUID(),
    email: teacher.email,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    profileImageUrl: teacher.profileImageUrl ?? null,
    role: "teacher",
    passwordHash: hashedPassword,
  });

  // 2. Insert into `teachers` table (linked by same UUID)
  await db.insert(teachers).values({
    id: user.id,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    email: teacher.email,
    profileImageUrl: teacher.profileImageUrl ?? null,
    department: teacher.department ?? null,
    officeLocation: teacher.officeLocation ?? null,
  });

  return user;
}


  
async deleteTeacher(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}

async updateTeacher(id: string, data: Partial<UpsertUser>): Promise<User> {
  const [updatedTeacher] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return updatedTeacher;
}


// -------------------------
  // Classes
  // -------------------------
  async getClasses(teacherId?: string): Promise<ClassWithDetails[]> {
    const query = db
      .select({ class: classes, teacher: users })
      .from(classes)
      .innerJoin(users, eq(classes.teacherId, users.id))
      .where(teacherId ? eq(classes.teacherId, teacherId) : undefined);

    const classResults = await query;
    const classDetailsPromises = classResults.map(async ({ class: cls, teacher }) => {
      const enrollmentData = await db
        .select({ enrollment: enrollments, student: students })
        .from(enrollments)
        .innerJoin(students, eq(enrollments.studentId, students.id))
        .where(eq(enrollments.classId, cls.id));

      const assignmentData = await db.select().from(assignments).where(eq(assignments.classId, cls.id));

      return {
        ...cls,
        teacher,
        enrollments: enrollmentData.map(({ enrollment, student }) => ({ ...enrollment, student })),
        assignments: assignmentData,
      };
    });

    return Promise.all(classDetailsPromises);
  }

  async getClass(id: string): Promise<ClassWithDetails | undefined> {
    const [classData] = await db
      .select({ class: classes, teacher: users })
      .from(classes)
      .innerJoin(users, eq(classes.teacherId, users.id))
      .where(eq(classes.id, id));

    if (!classData) return undefined;

    const enrollmentData = await db
      .select({ enrollment: enrollments, student: students })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .where(eq(enrollments.classId, id));

    const assignmentData = await db.select().from(assignments).where(eq(assignments.classId, id));

    return {
      ...classData.class,
      teacher: classData.teacher,
      enrollments: enrollmentData.map(({ enrollment, student }) => ({ ...enrollment, student })),
      assignments: assignmentData,
    };
  }

async getStudentClasses(studentId: string): Promise<ClassWithDetails[]> {
  const classResults = await db
    .select({ class: classes, teacher: users })
    .from(classes)
    .innerJoin(users, eq(classes.teacherId, users.id))
    .where(
      sql`EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.class_id = ${classes.id} AND e.student_id = ${studentId}
      )`
    );

  return Promise.all(
    classResults.map(async ({ class: cls, teacher }) => {
      const assignmentData = await db.select().from(assignments).where(eq(assignments.classId, cls.id));
      return {
        ...cls,
        teacher,
        enrollments: [], // optional: could fetch classmates
        assignments: assignmentData,
      };
    })
  );
}


  async createClass(classData: InsertClass): Promise<Class> {
    const [newClass] = await db.insert(classes).values(classData).returning();
    return newClass;
  }

  async updateClass(id: string, classData: Partial<InsertClass>): Promise<Class> {
    const [updatedClass] = await db.update(classes).set({ ...classData, updatedAt: new Date() }).where(eq(classes.id, id)).returning();
    return updatedClass;
  }

  async deleteClass(id: string): Promise<void> {
    await db.delete(classes).where(eq(classes.id, id));
  }

  // -------------------------
  // Assignments
  // -------------------------
  async getAssignments(classId?: string): Promise<AssignmentWithDetails[]> {
    const query = db
      .select({ assignment: assignments, class: classes })
      .from(assignments)
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(classId ? eq(assignments.classId, classId) : undefined);

    const assignmentResults = await query;

    const assignmentDetailsPromises = assignmentResults.map(async ({ assignment, class: cls }) => {
      const gradeData = await db
        .select({ grade: grades, student: students })
        .from(grades)
        .innerJoin(students, eq(grades.studentId, students.id))
        .where(eq(grades.assignmentId, assignment.id));

      return {
        ...assignment,
        class: cls,
        grades: gradeData.map(({ grade, student }) => ({ ...grade, student })),
        submissionCount: gradeData.length,
      };
    });

    return Promise.all(assignmentDetailsPromises);
  }

  async getAssignment(id: string): Promise<AssignmentWithDetails | undefined> {
    const [assignmentData] = await db
      .select({ assignment: assignments, class: classes })
      .from(assignments)
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(eq(assignments.id, id));

    if (!assignmentData) return undefined;

    const gradeData = await db
      .select({ grade: grades, student: students })
      .from(grades)
      .innerJoin(students, eq(grades.studentId, students.id))
      .where(eq(grades.assignmentId, id));

    return {
      ...assignmentData.assignment,
      class: assignmentData.class,
      grades: gradeData.map(({ grade, student }) => ({ ...grade, student })),
      submissionCount: gradeData.length,
    };
  }

// storage.ts
async getStudentAssignments(studentId: string): Promise<AssignmentWithStudentGrade[]> {
  const assignmentResults = await db
    .select({ assignment: assignments, class: classes })
    .from(assignments)
    .innerJoin(classes, eq(assignments.classId, classes.id))
    .where(
      sql`EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.class_id = ${classes.id} AND e.student_id = ${studentId}
      )`
    )
    .orderBy(assignments.dueDate);

  const detailedAssignments: AssignmentWithStudentGrade[] = await Promise.all(
    assignmentResults.map(async ({ assignment, class: cls }) => {
      const [gradeRecord] = await db
        .select()
        .from(grades)
        .where(and(eq(grades.assignmentId, assignment.id), eq(grades.studentId, studentId)));

      return {
        ...assignment,
        class: cls,
        grades: [],            // still required by AssignmentWithDetails
        submissionCount: 0,    // fill or calculate as needed
        studentGrade: gradeRecord ?? null,
      };
    })
  );

  return detailedAssignments;
}



  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [newAssignment] = await db.insert(assignments).values(assignment).returning();
    return newAssignment;
  }

  async updateAssignment(id: string, assignment: Partial<InsertAssignment>): Promise<Assignment> {
    const [updatedAssignment] = await db.update(assignments).set({ ...assignment, updatedAt: new Date() }).where(eq(assignments.id, id)).returning();
    return updatedAssignment;
  }

  async deleteAssignment(id: string): Promise<void> {
    await db.delete(assignments).where(eq(assignments.id, id));
  }

  // -------------------------
  // Grades
  // -------------------------
  async getGrades(filters?: { studentId?: string; assignmentId?: string; classId?: string }): Promise<GradeWithDetails[]> {
    const conditions = [
      filters?.studentId ? eq(grades.studentId, filters.studentId) : undefined,
      filters?.assignmentId ? eq(grades.assignmentId, filters.assignmentId) : undefined,
      filters?.classId ? eq(assignments.classId, filters.classId) : undefined,
    ].filter(Boolean) as any[];

    const results = await db
      .select({ grade: grades, student: students, assignment: assignments, class: classes })
      .from(grades)
      .innerJoin(students, eq(grades.studentId, students.id))
      .innerJoin(assignments, eq(grades.assignmentId, assignments.id))
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(grades.gradedAt));

    return results.map(({ grade, student, assignment, class: cls }) => ({ ...grade, student, assignment: { ...assignment, class: cls } }));
  }

  async getGrade(id: string): Promise<GradeWithDetails | undefined> {
    const [result] = await db
      .select({ grade: grades, student: students, assignment: assignments, class: classes })
      .from(grades)
      .innerJoin(students, eq(grades.studentId, students.id))
      .innerJoin(assignments, eq(grades.assignmentId, assignments.id))
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(eq(grades.id, id));

    if (!result) return undefined;

    return { ...result.grade, student: result.student, assignment: { ...result.assignment, class: result.class } };
  }

async createGrade(grade: InsertGrade): Promise<Grade> {
  // 1️⃣ Check if a grade already exists for this student & assignment
  const existingGrade = await db
    .select()
    .from(grades)
    .where(and(eq(grades.studentId, grade.studentId), eq(grades.assignmentId, grade.assignmentId)));

  if (existingGrade.length > 0) {
    throw new Error("Grade already exists for this student and assignment.");
  }

  // 2️⃣ Compute percentage & letter grade
  const assignment = await db.select().from(assignments).where(eq(assignments.id, grade.assignmentId)).limit(1);
  if (assignment.length > 0 && grade.pointsEarned !== null) {
    const percentage = (Number(grade.pointsEarned) / Number(assignment[0].totalPoints)) * 100;
    grade.percentage = percentage.toString();
    grade.letterGrade = this.getLetterGrade(percentage);
  }

  // 3️⃣ Insert grade
  const [newGrade] = await db.insert(grades).values(grade).returning();
  return newGrade;
}


  async updateGrade(id: string, grade: Partial<InsertGrade>): Promise<Grade> {
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

    const [updatedGrade] = await db.update(grades).set({ ...grade, updatedAt: new Date() }).where(eq(grades.id, id)).returning();
    return updatedGrade;
  }

  async deleteGrade(id: string): Promise<void> {
    await db.delete(grades).where(eq(grades.id, id));
  }

  // -------------------------
  // Enrollments
  // -------------------------
  async enrollStudent(enrollment: InsertEnrollment): Promise<Enrollment> {
    const [newEnrollment] = await db.insert(enrollments).values(enrollment).returning();
    return newEnrollment;
  }

  async unenrollStudent(studentId: string, classId: string): Promise<void> {
    await db.delete(enrollments).where(and(eq(enrollments.studentId, studentId), eq(enrollments.classId, classId)));
  }

  async getStudentEnrollments(studentId: string): Promise<Enrollment[]> {
    return db.select().from(enrollments).where(eq(enrollments.studentId, studentId));
  }

  // -------------------------
  // Dashboard
  // -------------------------
  async getDashboardStats(teacherId?: string) {
    const classConditions = teacherId ? [eq(classes.teacherId, teacherId)] : [];

    const totalStudentsQuery = await db
      .select({ count: sql<number>`count(distinct ${students.id})` })
      .from(students)
      .innerJoin(enrollments, eq(students.id, enrollments.studentId))
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .where(classConditions.length > 0 ? and(...classConditions) : undefined);

    const totalStudents = totalStudentsQuery[0]?.count || 0;

    const avgGradeQuery = await db
      .select({ avg: sql<number>`avg(${grades.percentage})` })
      .from(grades)
      .innerJoin(assignments, eq(grades.assignmentId, assignments.id))
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(classConditions.length > 0 ? and(...classConditions) : undefined);

    const avgGrade = avgGradeQuery[0]?.avg;
    const averageGrade = avgGrade != null ? this.getLetterGrade(avgGrade) : "-";

    const nowStr = new Date().toISOString();
    const weekFromNowStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ahead

    const assignmentsDueQuery = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignments)
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(and(
        ...classConditions,
        sql`${assignments.dueDate} >= ${nowStr}`,
        sql`${assignments.dueDate} <= ${weekFromNowStr}`
      ));

    const assignmentsDue = assignmentsDueQuery[0]?.count || 0;

    const activeClassesQuery = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .where(classConditions.length > 0 ? and(...classConditions) : undefined);

    const activeClasses = activeClassesQuery[0]?.count || 0;

    return { totalStudents, averageGrade, assignmentsDue, activeClasses };
  }

  async getRecentGrades(limit = 10, teacherId?: string): Promise<GradeWithDetails[]> {
    const results = await db
      .select({ grade: grades, student: students, assignment: assignments, class: classes })
      .from(grades)
      .innerJoin(students, eq(grades.studentId, students.id))
      .innerJoin(assignments, eq(grades.assignmentId, assignments.id))
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(teacherId ? eq(classes.teacherId, teacherId) : undefined)
      .orderBy(desc(grades.gradedAt))
      .limit(limit);

    return results.map(({ grade, student, assignment, class: cls }) => ({ ...grade, student, assignment: { ...assignment, class: cls } }));
  }

  async getUpcomingAssignments(limit = 10, teacherId?: string): Promise<AssignmentWithDetails[]> {
    const todayStr = new Date().toISOString(); // ✅ convert Date → string
    const conditions = [sql`${assignments.dueDate} >= ${todayStr}`];

    if (teacherId) conditions.push(eq(classes.teacherId, teacherId));

    const assignmentResults = await db
      .select({ assignment: assignments, class: classes })
      .from(assignments)
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(and(...conditions))
      .orderBy(assignments.dueDate)
      .limit(limit);

    const assignmentDetailsPromises = assignmentResults.map(async ({ assignment, class: cls }) => {
      const gradeCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(grades)
        .where(eq(grades.assignmentId, assignment.id));

      return { ...assignment, class: cls, grades: [], submissionCount: gradeCount[0]?.count || 0 };
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

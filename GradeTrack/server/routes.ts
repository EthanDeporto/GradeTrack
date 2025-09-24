import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isLocalDevelopment } from "./authConfig";
import { 
  insertStudentSchema,
  insertClassSchema,
  insertAssignmentSchema,
  insertGradeSchema,
  insertEnrollmentSchema
} from "@shared/schema";
import { z } from "zod";
import { db } from "./localDb";
import { eq } from "drizzle-orm";
import { users, classes } from "@shared/schema"; // tables
export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication & session
  await setupAuth(app);

  // -------------------------
  // Dashboard route
  // -------------------------
  app.get("/dashboard", isAuthenticated, (req: any, res) => {
    res.render("dashboard", { user: req.user });
  });


  // -------------------------
  // Dashboard API routes
  // -------------------------
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = isLocalDevelopment ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      const teacherId = req.user?.role === 'admin' ? undefined : req.user?.id;
      const stats = await storage.getDashboardStats(teacherId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/recent-grades", isAuthenticated, async (req: any, res) => {
    try {
      const userId = isLocalDevelopment ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      const teacherId = user?.role === 'admin' ? undefined : userId;
      const limit = parseInt(req.query.limit as string) || 10;
      const recentGrades = await storage.getRecentGrades(limit, teacherId);
      res.json(recentGrades);
    } catch (error) {
      console.error("Error fetching recent grades:", error);
      res.status(500).json({ message: "Failed to fetch recent grades" });
    }
  });

  app.get("/api/dashboard/upcoming-assignments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = isLocalDevelopment ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      const teacherId = user?.role === 'admin' ? undefined : userId;
      const limit = parseInt(req.query.limit as string) || 10;
      const upcomingAssignments = await storage.getUpcomingAssignments(limit, teacherId);
      res.json(upcomingAssignments);
    } catch (error) {
      console.error("Error fetching upcoming assignments:", error);
      res.status(500).json({ message: "Failed to fetch upcoming assignments" });
    }
  });

  // -------------------------
  // Student routes
  // -------------------------
// GET /api/students
app.get("/api/students", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.id || req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    let students;
    if (user.role === "admin") {
      // Admins see all students
      students = await storage.getStudents();
    } else {
      // Teachers only see students in their classes
      students = await storage.getStudents(userId); // teacherId
    }

    res.json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});


  app.get("/api/students/:id", isAuthenticated, async (req, res) => {
    try {
      const student = await storage.getStudent(req.params.id);
      if (!student) return res.status(404).json({ message: "Student not found" });
      res.json(student);
    } catch (error) {
      console.error("Error fetching student:", error);
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });

  app.post("/api/students", isAuthenticated, async (req, res) => {
    try {
      const studentData = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(studentData);
      res.status(201).json(student);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid student data", errors: error.errors });
      }
      console.error("Error creating student:", error);
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  app.put("/api/students/:id", isAuthenticated, async (req, res) => {
    try {
      const studentData = insertStudentSchema.partial().parse(req.body);
      const student = await storage.updateStudent(req.params.id, studentData);
      res.json(student);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid student data", errors: error.errors });
      }
      console.error("Error updating student:", error);
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  app.delete("/api/students/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteStudent(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

// Get grades for the logged-in student
app.get("/api/dashboard/student/grades", isAuthenticated, async (req: any, res) => {
  try {
    const userId = isLocalDevelopment ? req.user.id : req.user.claims.sub;

    // Only fetch grades for the student
    const grades = await storage.getGrades({ studentId: userId });
    res.json(grades);
  } catch (error) {
    console.error("Error fetching student grades:", error);
    res.status(500).json({ message: "Failed to fetch student grades" });
  }
});

// GET /api/dashboard/student/classes
app.get("/api/dashboard/student/classes", async (req, res) => {
  const studentId = req.user?.id;
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });

  const classes = await storage.getStudentClasses(studentId);
  res.json(classes);
});


const createTeacherSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
});

app.get("/api/teachers", isAuthenticated, async (req, res) => {
  try {
    // Only admins can see all teachers
    const teachers = await storage.getUsersByRole("teacher");
    res.json(teachers);
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({ message: "Failed to fetch teachers" });
  }
});

app.post("/api/teachers", isAuthenticated, async (req, res) => {
  try {
    const teacherData = createTeacherSchema.parse(req.body);

    const newTeacher = await storage.createTeacher(teacherData);

    res.status(201).json(newTeacher);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid teacher data", errors: error.errors });
    }
    console.error("Error creating teacher:", error);
    res.status(500).json({ message: "Failed to create teacher" });
  }
});
  
app.delete("/api/teachers/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;

  try {
    // Check if this teacher is assigned to any classes
    const assignedClasses = await db.select().from(classes).where(eq(classes.teacherId, id));
    if (assignedClasses.length > 0) {
      return res.status(400).json({
        message: "Cannot delete teacher: they are assigned to one or more classes."
      });
    }

    // Proceed to delete
    const deleted = await db.delete(users).where(eq(users.id, id)).returning();
    if (!deleted.length) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.json({ message: "Teacher deleted successfully" });
  } catch (err) {
    console.error("Error deleting teacher:", err);
    res.status(500).json({ message: "Failed to delete teacher" });
  }
});



app.put("/api/teachers/:id", isAuthenticated, async (req, res) => {
  try {
    const teacherData = createTeacherSchema.partial().parse(req.body); // allow partial updates
    const updatedTeacher = await storage.updateTeacher(req.params.id, teacherData);
    res.json(updatedTeacher);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid teacher data", errors: error.errors });
    }
    console.error("Error updating teacher:", error);
    res.status(500).json({ message: "Failed to update teacher" });
  }
});


// Class routes
app.get("/api/classes", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.id || req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "User not authenticated" });

    const user = await storage.getUser(userId);
    const teacherId = user?.role === 'admin' ? undefined : userId;

    const classesData = await storage.getClasses(teacherId);
    res.json(classesData);
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ message: "Failed to fetch classes" });
  }
});

  app.get("/api/classes/:id", isAuthenticated, async (req, res) => {
    try {
      const classData = await storage.getClass(req.params.id);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }
      res.json(classData);
    } catch (error) {
      console.error("Error fetching class:", error);
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });

// GET /api/teachers/classes - classes for the logged-in teacher
// GET /api/teachers/classes - classes for the logged-in teacher
app.get("/api/teachers/classes", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.id || req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await storage.getUser(userId);

    // check if user exists
    if (!user) return res.status(404).json({ message: "User not found" });

    // only allow teachers (and optionally admins) to fetch their classes
    if (user.role !== "teacher" && user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const classes = await storage.getTeachersClasses(userId);
    res.json(classes);
  } catch (error) {
    console.error("Error fetching teacher classes:", error);
    res.status(500).json({ message: "Failed to fetch teacher classes" });
  }
});



// GET all students in a specific class
app.get("/api/classes/:id/students", isAuthenticated, async (req, res) => {
  try {
    const classId = req.params.id;
    const classData = await storage.getClass(classId);
    if (!classData) return res.json([]);

    const students = classData.enrollments.map((e) => e.student);
    res.json(students);
  } catch (error) {
    console.error("Error fetching students for class:", error);
    res.status(500).json({ message: "Failed to fetch students for class" });
  }
});

  
  app.post("/api/classes", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    // If admin, allow choosing a teacher from body; otherwise force teacherId = userId
    const teacherId = user?.role === "admin" ? req.body.teacherId : userId;

    const classData = insertClassSchema.parse({
      ...req.body,
      teacherId,
    });

    const newClass = await storage.createClass(classData);
    res.status(201).json(newClass);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid class data", errors: error.errors });
    }
    console.error("Error creating class:", error);
    res.status(500).json({ message: "Failed to create class" });
  }
});


  app.put("/api/classes/:id", isAuthenticated, async (req, res) => {
    try {
      const classData = insertClassSchema.partial().parse(req.body);
      const updatedClass = await storage.updateClass(req.params.id, classData);
      res.json(updatedClass);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid class data", errors: error.errors });
      }
      console.error("Error updating class:", error);
      res.status(500).json({ message: "Failed to update class" });
    }
  });

  app.delete("/api/classes/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteClass(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting class:", error);
      res.status(500).json({ message: "Failed to delete class" });
    }
  });

  // Assignment routes
  // GET /api/assignments?classId=
app.get("/api/assignments", isAuthenticated, async (req: any, res) => {
  try {
    const classId = req.query.classId as string | undefined;
    const userId = req.user?.id || req.user?.claims?.sub;
    const user = await storage.getUser(userId);
    const teacherId = user?.role === 'teacher' ? userId : undefined;

    const assignments = await storage.getAssignments(classId, teacherId);
    res.json(assignments);
  } catch (err) {
    console.error("Error fetching assignments:", err);
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
});





  app.get("/api/assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });

 app.post("/api/assignments", isAuthenticated, async (req, res) => {
  try {
    console.log("Assignment payload:", req.body, "Query classId:", req.query.classId);

    const assignmentData = insertAssignmentSchema.parse({
      ...req.body,
      classId: req.body.classId || (req.query.classId as string),
      dueDate: new Date(req.body.dueDate),  // still convert date
      // totalPoints stays as string
    });

    const assignment = await storage.createAssignment(assignmentData);
    res.status(201).json(assignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod errors:", error.errors);
      return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
    }
    console.error("Error creating assignment:", error);
    res.status(500).json({ message: "Failed to create assignment" });
  }
});

  app.put("/api/assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const assignmentData = insertAssignmentSchema.partial().parse(req.body);
      const assignment = await storage.updateAssignment(req.params.id, assignmentData);
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      console.error("Error updating assignment:", error);
      res.status(500).json({ message: "Failed to update assignment" });
    }
  });

  app.delete("/api/assignments/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteAssignment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });

// Get assignments + grade for logged-in student
app.get("/api/student/assignments", isAuthenticated, async (req: any, res) => {
  const studentId = req.user?.id || req.user?.claims?.sub;
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const assignments = await storage.getStudentAssignments(studentId);
    res.json(assignments);
  } catch (error) {
    console.error("Error fetching student assignments:", error);
    res.status(500).json({ message: "Failed to fetch student assignments" });
  }
});



  // Grade routes
app.get("/api/grades", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const filters: {
      studentId?: string;
      assignmentId?: string;
      classId?: string;
      teacherId?: string;
    } = {
      studentId: req.query.studentId as string,
      assignmentId: req.query.assignmentId as string,
      classId: req.query.classId as string,
    };

    // Step 3: only filter by teacherId if user is a teacher
    if (user.role === "teacher") {
      filters.teacherId = userId; // ✅ TypeScript knows this is a string now
    }

    const grades = await storage.getGrades(filters);
    res.json(grades);
  } catch (error) {
    console.error("Error fetching grades:", error);
    res.status(500).json({ message: "Failed to fetch grades" });
  }
});



  app.get("/api/grades/:id", isAuthenticated, async (req, res) => {
    try {
      const grade = await storage.getGrade(req.params.id);
      if (!grade) {
        return res.status(404).json({ message: "Grade not found" });
      }
      res.json(grade);
    } catch (error) {
      console.error("Error fetching grade:", error);
      res.status(500).json({ message: "Failed to fetch grade" });
    }
  });

  app.post("/api/grades", isAuthenticated, async (req, res) => {
    try {
      const gradeData = insertGradeSchema.parse(req.body);
      const grade = await storage.createGrade(gradeData);
      res.status(201).json(grade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid grade data", errors: error.errors });
      }
      console.error("Error creating grade:", error);
      res.status(500).json({ message: "Failed to create grade" });
    }
  });

  app.put("/api/grades/:id", isAuthenticated, async (req, res) => {
    try {
      const gradeData = insertGradeSchema.partial().parse(req.body);
      const grade = await storage.updateGrade(req.params.id, gradeData);
      res.json(grade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid grade data", errors: error.errors });
      }
      console.error("Error updating grade:", error);
      res.status(500).json({ message: "Failed to update grade" });
    }
  });

  app.delete("/api/grades/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteGrade(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting grade:", error);
      res.status(500).json({ message: "Failed to delete grade" });
    }
  });

  // Enrollment routes
app.post("/api/enrollments", isAuthenticated, async (req, res) => {
  try {
    const { studentId, classId } = insertEnrollmentSchema.parse(req.body);

    // Check if student already enrolled
    const existingEnrollment = await storage.getStudentEnrollments(studentId);
    if (existingEnrollment.some((e) => e.classId === classId)) {
      return res.status(400).json({ message: "Student already enrolled in this class" });
    }

    const enrollment = await storage.enrollStudent({ studentId, classId });
    res.status(201).json(enrollment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid enrollment data", errors: error.errors });
    }
    console.error("Error creating enrollment:", error);
    res.status(500).json({ message: "Failed to enroll student" });
  }
});

app.delete(
  "/api/classes/:classId/students/:studentId",
  isAuthenticated,
  async (req, res) => {
    try {
      const { classId, studentId } = req.params;
      if (!studentId || !classId) {
        return res.status(400).json({ message: "studentId and classId are required" });
      }
      await storage.unenrollStudent(studentId, classId);
      res.status(204).send();
    } catch (error) {
      console.error("Error unenrolling student:", error);
      res.status(500).json({ message: "Failed to unenroll student" });
    }
  }
);


  app.get("/api/students/:id/enrollments", isAuthenticated, async (req, res) => {
    try {
      const enrollments = await storage.getStudentEnrollments(req.params.id);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching student enrollments:", error);
      res.status(500).json({ message: "Failed to fetch student enrollments" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
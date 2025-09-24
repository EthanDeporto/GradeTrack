import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import type { StudentWithGrades } from "@shared/schema";


// Example API call – adjust to your backend
async function fetchStudentDetails(id: string): Promise<StudentWithGrades> {
  const res = await fetch(`/api/students/${id}`);
  if (!res.ok) throw new Error("Failed to fetch student");
  return res.json();
}

// Convert percentage to GPA (example scale)
function percentageToGPA(percentage: number): number {
  if (percentage >= 90) return 4.0;
  if (percentage >= 80) return 3.0;
  if (percentage >= 70) return 2.0;
  if (percentage >= 60) return 1.0;
  return 0.0;
}

// Calculate GPA safely
function calculateGPA(grades: StudentWithGrades["grades"]): string | null {
  if (!grades || grades.length === 0) return null;

  const validGrades = grades.filter(
    (g) => g.percentage !== null && g.percentage !== undefined
  );
  if (validGrades.length === 0) return null;

  const totalGPA = validGrades.reduce((sum: number, grade) => {
    return sum + percentageToGPA(Number(grade.percentage));
  }, 0);

  return (totalGPA / validGrades.length).toFixed(2); // <-- always 2 decimals
}

export default function StudentDetails() {
  const { id } = useParams<{ id: string }>();

  const { data: student, isLoading, error } = useQuery({
    queryKey: ["student", id],
    queryFn: () => fetchStudentDetails(id),
  });

  if (isLoading) return <div className="p-6">Loading student details...</div>;
  if (error) return <div className="p-6 text-red-600">Error loading student.</div>;
  if (!student) return <div className="p-6">Student not found.</div>;

  const gpa = calculateGPA(student.grades);

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-100 text-green-800";
    if (percentage >= 80) return "bg-blue-100 text-blue-800";
    if (percentage >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Card: Student Info + GPA + Quick Stats + Classes */}
      <div className="border-b pb-2">
        <h1 className="text-3xl font-bold text-gray-800">Student Details</h1>
        <p className="text-gray-600">Overview of academic performance and classes</p>
      </div>

      <Card className="w-fit max-w-5xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-stretch w-full space-y-6 sm:space-y-0 sm:space-x-6">
            
            {/* Column 1: Avatar + Info */}
            <div className="flex flex-col items-center justify-center min-w-[250px]">
              <Avatar className="h-16 w-16">
                <AvatarImage src={student.profileImageUrl || undefined} />
                <AvatarFallback>
                  {student.firstName[0]}{student.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="mt-2 text-center">
                <CardTitle className="text-2xl">
                  {student.firstName} {student.lastName}
                </CardTitle>
                <p className="text-gray-600">ID: {student.studentId}</p>
                <p className="text-gray-600">Year: Sophomore</p>
                <p className="text-gray-600">Major: Computer Science</p>
              </div>
            </div>

            {/* Column 2: GPA */}
            <div className="flex flex-col justify-center items-center min-w-[100px] border-l-2 border-gray-400 px-6 self-center h-20">
              <p className="text-gray-800 font-semibold">GPA</p>
              <p className="text-3xl font-bold">{gpa !== null ? gpa : "N/A"}</p>
            </div>

            {/* Column 3: Quick Stats */}
            <div className="flex flex-col justify-center items-center min-w-[200px] border-l-2 border-gray-400 px-6 space-y-2 self-center h-20">
              <div className="text-center">
                <p className="text-lg font-bold">{student.enrollments.length}</p>
                <p className="text-gray-600 text-sm">Classes</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">--</p>
                <p className="text-gray-600 text-sm">Credits</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">--%</p>
                <p className="text-gray-600 text-sm">Attendance</p>
              </div>
            </div>

            {/* Column 4: Enrolled Classes */}
            <div className="flex flex-col justify-center min-w-[150px] border-l-2 border-gray-400 px-6 self-center h-20">
              <p className="text-gray-800 font-semibold mb-1 text-center">Classes</p>
              <div className="flex flex-wrap justify-center gap-2">
                {student.enrollments.length === 0 ? (
                  <p className="text-gray-500 text-center">No classes enrolled</p>
                ) : (
                  student.enrollments.map((enrollment) => (
                    <Badge key={enrollment.class.id}>{enrollment.class.name}</Badge>
                  ))
                )}
              </div>
            </div>

          </div>
        </CardHeader>
      </Card>

      {/* Grades Section: Two Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Left: Class Grades */}
        <Card>
          <CardHeader>
            <CardTitle>Class Grades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Average Score</TableHead>
                    <TableHead>Average Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.enrollments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                        No classes enrolled
                      </TableCell>
                    </TableRow>
                  ) : (
                    student.enrollments.map((enrollment) => {
                      const classGrades = student.grades.filter(
                        (g) => g.assignment.class.id === enrollment.class.id
                      );
                      const avgPercentage =
                        classGrades.length > 0
                          ? (
                              classGrades.reduce((sum, g) => sum + Number(g.percentage || 0), 0) /
                              classGrades.length
                            )
                          : null;
                      const avgLetter =
                        avgPercentage !== null
                          ? avgPercentage >= 90
                            ? "A"
                            : avgPercentage >= 80
                            ? "B"
                            : avgPercentage >= 70
                            ? "C"
                            : avgPercentage >= 60
                            ? "D"
                            : "F"
                          : "--";

                      return (
                        <TableRow key={enrollment.class.id} className="hover:bg-gray-50">
                          <TableCell className="text-sm text-gray-900">{enrollment.class.name}</TableCell>
                          <TableCell className="text-sm text-gray-900">
                            {avgPercentage !== null ? `${avgPercentage.toFixed(2)}%` : "--"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                avgPercentage !== null
                                  ? avgPercentage >= 90
                                    ? "bg-green-100 text-green-800"
                                    : avgPercentage >= 80
                                    ? "bg-blue-100 text-blue-800"
                                    : avgPercentage >= 70
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-600"
                              }
                            >
                              {avgLetter}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Right: Assignment Grades */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment Grades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Graded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.grades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No grades found
                      </TableCell>
                    </TableRow>
                  ) : (
                    student.grades.map((grade) => (
                      <TableRow key={grade.id} className="hover:bg-gray-50">
                        <TableCell className="text-sm text-gray-900">{grade.assignment.title}</TableCell>
                        <TableCell className="text-sm text-gray-500">{grade.assignment.class.name}</TableCell>
                        <TableCell className="text-sm text-gray-900">
                          {grade.pointsEarned}/{grade.assignment.totalPoints}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getGradeColor(Number(grade.percentage) || 0)}
                          >
                            {grade.letterGrade} ({grade.percentage}%)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {grade.gradedAt
                            ? formatDistanceToNow(new Date(grade.gradedAt), { addSuffix: true })
                            : "Unknown"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
      </div>
    </div>
  );
}

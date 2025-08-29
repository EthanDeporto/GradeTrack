import { useState } from "react";
import { Eye, Edit, Trash2, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StudentWithGrades } from "@shared/schema";

interface StudentTableProps {
  students: StudentWithGrades[];
  onViewStudent: (student: StudentWithGrades) => void;
  onEditStudent: (student: StudentWithGrades) => void;
  onDeleteStudent: (student: StudentWithGrades) => void;
  onExport: () => void;
}

type SortField = 'name' | 'studentId' | 'grade';
type SortDirection = 'asc' | 'desc';

export default function StudentTable({
  students,
  onViewStudent,
  onEditStudent,
  onDeleteStudent,
  onExport,
}: StudentTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedClass, setSelectedClass] = useState<string>("all");
  
  const itemsPerPage = 10;

  const getGradeColor = (percentage?: number) => {
    if (!percentage) return "bg-gray-100 text-gray-800";
    if (percentage >= 90) return "bg-green-100 text-green-800";
    if (percentage >= 80) return "bg-blue-100 text-blue-800";
    if (percentage >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedStudents = [...students].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'name':
        comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        break;
      case 'studentId':
        comparison = a.studentId.localeCompare(b.studentId);
        break;
      case 'grade':
        const aGrade = a.currentGrade?.percentage || 0;
        const bGrade = b.currentGrade?.percentage || 0;
        comparison = aGrade - bGrade;
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const filteredStudents = selectedClass === "all" 
    ? sortedStudents 
    : sortedStudents.filter(student => 
        student.enrollments.some(enrollment => enrollment.classId === selectedClass)
      );

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  const uniqueClasses = Array.from(new Set(
    students.flatMap(student => 
      student.enrollments.map(enrollment => enrollment.class)
    )
  ));

  const getLastActivity = (student: StudentWithGrades) => {
    if (student.grades.length === 0) return "No activity";
    const latestGrade = student.grades.reduce((latest, grade) => {
      const gradeDate = new Date(grade.gradedAt || 0);
      const latestDate = new Date(latest.gradedAt || 0);
      return gradeDate > latestDate ? grade : latest;
    });
    
    const timeDiff = Date.now() - new Date(latestGrade.gradedAt || 0).getTime();
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
    if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    return "Recently";
  };

  return (
    <Card data-testid="student-table">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Student Roster</CardTitle>
          <div className="flex items-center space-x-3">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[180px]" data-testid="class-filter">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {uniqueClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={onExport} variant="outline" size="sm" data-testid="export-button">
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                  data-testid="sort-name"
                >
                  <div className="flex items-center">
                    Name
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('studentId')}
                  data-testid="sort-student-id"
                >
                  <div className="flex items-center">
                    Student ID
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('grade')}
                  data-testid="sort-grade"
                >
                  <div className="flex items-center">
                    Current Grade
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500" data-testid="no-students">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStudents.map((student) => (
                  <TableRow key={student.id} className="hover:bg-gray-50" data-testid={`student-row-${student.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student.profileImageUrl || undefined} />
                          <AvatarFallback>
                            {student.firstName[0]}{student.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium text-gray-900" data-testid={`student-name-${student.id}`}>
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-sm text-gray-500" data-testid={`student-email-${student.id}`}>
                            {student.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-900" data-testid={`student-id-${student.id}`}>
                      {student.studentId}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getGradeColor(student.currentGrade?.percentage)}
                        data-testid={`student-grade-${student.id}`}
                      >
                        {student.currentGrade ? 
                          `${student.currentGrade.letterGrade} (${student.currentGrade.percentage}%)` :
                          "No grades"
                        }
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500" data-testid={`student-activity-${student.id}`}>
                      {getLastActivity(student)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center space-x-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewStudent(student)}
                          data-testid={`view-student-${student.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditStudent(student)}
                          data-testid={`edit-student-${student.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteStudent(student)}
                          className="text-red-600 hover:text-red-800"
                          data-testid={`delete-student-${student.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4" data-testid="pagination">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredStudents.length)} of {filteredStudents.length} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                data-testid="prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      data-testid={`page-${pageNum}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                data-testid="next-page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

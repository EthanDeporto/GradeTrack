import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import GradeModal from "@/components/GradeModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatDistanceToNow } from "date-fns";
import type { GradeWithDetails, StudentWithGrades, AssignmentWithDetails } from "@shared/schema";

export default function Grades() {
  const { isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<GradeWithDetails | undefined>();
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [selectedAssignment, setSelectedAssignment] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 10;

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch grades
  const { data: grades = [], isLoading: loadingGrades } = useQuery<GradeWithDetails[]>({
    queryKey: ["/api/grades"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch students for filter
  const { data: students = [] } = useQuery<StudentWithGrades[]>({
    queryKey: ["/api/students"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch assignments for filter
  const { data: assignments = [] } = useQuery<AssignmentWithDetails[]>({
    queryKey: ["/api/assignments"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Delete grade mutation
  const deleteGradeMutation = useMutation({
    mutationFn: async (gradeId: string) => {
      await apiRequest("DELETE", `/api/grades/${gradeId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grade has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/grades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete grade. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated || isLoading) {
    return null;
  }

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-100 text-green-800";
    if (percentage >= 80) return "bg-blue-100 text-blue-800";
    if (percentage >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  // Filter grades
  const filteredGrades = grades.filter(grade => {
    const matchesStudent = selectedStudent === "all" || grade.student.id === selectedStudent;
    const matchesAssignment = selectedAssignment === "all" || grade.assignment.id === selectedAssignment;
    const matchesSearch = searchQuery === "" || 
      `${grade.student.firstName} ${grade.student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grade.assignment.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStudent && matchesAssignment && matchesSearch;
  });

  const totalPages = Math.ceil(filteredGrades.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGrades = filteredGrades.slice(startIndex, startIndex + itemsPerPage);

  const handleAddGrade = () => {
    setSelectedGrade(undefined);
    setIsGradeModalOpen(true);
  };

  const handleEditGrade = (grade: GradeWithDetails) => {
    setSelectedGrade(grade);
    setIsGradeModalOpen(true);
  };

  const handleDeleteGrade = (grade: GradeWithDetails) => {
    if (window.confirm(`Are you sure you want to delete this grade for ${grade.student.firstName} ${grade.student.lastName}?`)) {
      deleteGradeMutation.mutate(grade.id);
    }
  };

  const handleCloseModal = () => {
    setIsGradeModalOpen(false);
    setSelectedGrade(undefined);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8" data-testid="grades-page">
        {/* Page Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="grades-title">
                Grades
              </h1>
              <p className="mt-1 text-sm text-gray-600" data-testid="grades-description">
                Manage student grades and track academic performance.
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Button onClick={handleAddGrade} data-testid="add-grade-button">
                <Plus className="h-4 w-4 mr-2" />
                Add Grade
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-4 sm:px-0">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      type="search"
                      placeholder="Search grades..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="search-grades-input"
                    />
                  </div>
                </form>
                
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger data-testid="student-filter">
                    <SelectValue placeholder="All Students" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.firstName} {student.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                  <SelectTrigger data-testid="assignment-filter">
                    <SelectValue placeholder="All Assignments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignments</SelectItem>
                    {assignments.map((assignment) => (
                      <SelectItem key={assignment.id} value={assignment.id}>
                        {assignment.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center text-sm text-gray-500">
                  {filteredGrades.length} grade{filteredGrades.length !== 1 ? 's' : ''} found
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grades Table */}
        <div className="px-4 py-6 sm:px-0">
          <Card data-testid="grades-table">
            <CardHeader>
              <CardTitle>Grade Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Graded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedGrades.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500" data-testid="no-grades">
                          No grades found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedGrades.map((grade) => (
                        <TableRow key={grade.id} className="hover:bg-gray-50" data-testid={`grade-row-${grade.id}`}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={grade.student.profileImageUrl || undefined} />
                                <AvatarFallback>
                                  {grade.student.firstName[0]}{grade.student.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-medium text-gray-900" data-testid={`student-name-${grade.id}`}>
                                  {grade.student.firstName} {grade.student.lastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {grade.student.studentId}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-900" data-testid={`assignment-title-${grade.id}`}>
                            {grade.assignment.title}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500" data-testid={`class-name-${grade.id}`}>
                            {grade.assignment.class.name}
                          </TableCell>
                          <TableCell className="text-sm text-gray-900" data-testid={`points-earned-${grade.id}`}>
                            {grade.pointsEarned}/{grade.assignment.totalPoints}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getGradeColor(Number(grade.percentage) || 0)}
                              data-testid={`grade-percentage-${grade.id}`}
                            >
                              {grade.letterGrade} ({grade.percentage}%)
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500" data-testid={`graded-date-${grade.id}`}>
                            {grade.gradedAt ? formatDistanceToNow(new Date(grade.gradedAt), { addSuffix: true }) : "Unknown"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center space-x-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditGrade(grade)}
                                data-testid={`edit-grade-${grade.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteGrade(grade)}
                                className="text-red-600 hover:text-red-800"
                                data-testid={`delete-grade-${grade.id}`}
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
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredGrades.length)} of {filteredGrades.length} results
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
        </div>

        {/* Grade Modal */}
        <GradeModal
          isOpen={isGradeModalOpen}
          onClose={handleCloseModal}
          grade={selectedGrade}
        />
      </main>
    </Layout>
  );
}

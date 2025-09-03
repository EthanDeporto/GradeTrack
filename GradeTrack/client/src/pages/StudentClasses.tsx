import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Badge } from "@/components/ui/badge";
import type { ClassWithDetails, GradeWithDetails } from "@shared/schema";

export default function StudentClasses() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // redirect if not logged in
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => window.location.href = "/api/login", 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch classes
  const { data: classes = [], isLoading: loadingClasses } = useQuery<ClassWithDetails[]>({
    queryKey: ["/api/classes"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch student grades
  const { data: grades = [], isLoading: loadingGrades } = useQuery<GradeWithDetails[]>({
    queryKey: ["/api/dashboard/student/grades"],
    retry: false,
    enabled: isAuthenticated,
  });

  if (!isAuthenticated || isLoading) return null;

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClasses = filteredClasses.slice(startIndex, startIndex + itemsPerPage);

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-100 text-green-800";
    if (percentage >= 80) return "bg-blue-100 text-blue-800";
    if (percentage >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getGradesForClass = (classId: string) =>
    grades.filter(g => g.assignment.class.id === classId);

  return (
    <Layout>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-600">View all available classes and your grades.</p>
        </div>

        {/* Search */}
        <div className="px-4 py-4 sm:px-0">
          <Card>
            <CardContent className="pt-6 flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search classes..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <div className="text-sm text-gray-500">
                {filteredClasses.length} class{filteredClasses.length !== 1 && "es"} found
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Classes Table */}
        <div className="px-4 py-6 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle>Class List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Grades</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClasses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-6">
                          No classes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedClasses.map((cls) => {
                        const classGrades = getGradesForClass(cls.id);
                        return (
                          <TableRow key={cls.id}>
                            <TableCell>{cls.name}</TableCell>
                            <TableCell>{cls.subject}</TableCell>
                            <TableCell>{cls.teacher?.firstName} {cls.teacher?.lastName}</TableCell>
                            <TableCell>
                              {cls.createdAt
                                ? formatDistanceToNow(
                                    toZonedTime(new Date(cls.createdAt), Intl.DateTimeFormat().resolvedOptions().timeZone),
                                    { addSuffix: true }
                                  )
                                : "Unknown"}
                            </TableCell>
                            <TableCell>
                              {classGrades.length === 0 ? (
                                <span className="text-gray-500 text-sm">No grades</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {classGrades.map((g) => (
                                    <Badge key={g.id} className={getGradeColor(Number(g.percentage) || 0)}>
                                      {g.assignment.title}: {g.letterGrade} ({g.percentage}%)
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredClasses.length)} of {filteredClasses.length}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-outline btn-sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    <button
                      className="btn-outline btn-sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </Layout>
  );
}

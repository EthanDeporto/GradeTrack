// src/pages/StudentGrades.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import type { GradeWithDetails } from "@shared/schema";

export default function StudentGrades() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

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
    }
  }, [isAuthenticated, isLoading, toast]);

const { data: grades = [], isLoading: loadingGrades } = useQuery<GradeWithDetails[]>({
  queryKey: ["/api/dashboard/student/grades"],
  queryFn: async () => {
    // apiRequest returns a Response, so we need to call .json()
    const res = await apiRequest("GET", "/api/dashboard/student/grades");
    const data = await res.json(); // now it's parsed
    return data as GradeWithDetails[]; // cast to the correct type
  },
  retry: false,
  enabled: isAuthenticated,
});




  if (!isAuthenticated || isLoading) return null;

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-100 text-green-800";
    if (percentage >= 80) return "bg-blue-100 text-blue-800";
    if (percentage >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const filteredGrades = grades.filter((grade) =>
    grade.assignment.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8" data-testid="student-grades-page">
        {/* Page Header */}
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="grades-title">
            My Grades
          </h1>
          <p className="mt-1 text-sm text-gray-600" data-testid="grades-description">
            View your grades for all assignments.
          </p>
        </div>

        {/* Search */}
        <div className="px-4 py-4 sm:px-0">
          <input
            type="search"
            placeholder="Search assignments..."
            className="w-full border rounded-md p-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="search-input"
          />
        </div>

        {/* Grades Table */}
        <div className="px-4 py-6 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle>Grade Records</CardTitle>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGrades.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No grades found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredGrades.map((grade) => (
                        <TableRow key={grade.id} className="hover:bg-gray-50">
                          <TableCell className="text-sm text-gray-900">{grade.assignment.title}</TableCell>
                          <TableCell className="text-sm text-gray-500">{grade.assignment.class.name}</TableCell>
                          <TableCell className="text-sm text-gray-900">
                            {grade.pointsEarned}/{grade.assignment.totalPoints}
                          </TableCell>
                          <TableCell>
                            <Badge className={getGradeColor(Number(grade.percentage) || 0)}>
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
      </main>
    </Layout>
  );
}

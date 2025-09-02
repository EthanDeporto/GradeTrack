import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import type { AssignmentWithDetails, ClassWithDetails } from "@shared/schema";

export default function StudentAssignments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch student assignments
  const { data: assignments = [] } = useQuery<AssignmentWithDetails[]>({
    queryKey: ["/api/student/assignments"],
    queryFn: () => apiRequest("GET", "/api/student/assignments").then(res => res.json()),
  });

  // Fetch classes for filter
  const { data: classes = [] } = useQuery<ClassWithDetails[]>({
    queryKey: ["/api/classes"],
    queryFn: () => apiRequest("GET", "/api/classes").then(res => res.json()),
  });

  const filteredAssignments = assignments.filter(assignment => {
    const matchesClass = selectedClass === "all" || assignment.class.id === selectedClass;
    const matchesSearch =
      assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.class.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAssignments = filteredAssignments.slice(startIndex, startIndex + itemsPerPage);

  const getDueDateStatus = (dueDate: Date | null) => {
    if (!dueDate) return { label: "No due date", color: "bg-gray-100 text-gray-800" };
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: "Overdue", color: "bg-red-100 text-red-800" };
    if (diffDays === 0) return { label: "Due today", color: "bg-yellow-100 text-yellow-800" };
    if (diffDays === 1) return { label: "Due tomorrow", color: "bg-orange-100 text-orange-800" };
    if (diffDays <= 7) return { label: `Due in ${diffDays} days`, color: "bg-blue-100 text-blue-800" };
    return { label: due.toLocaleDateString(), color: "bg-green-100 text-green-800" };
  };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Assignments</h1>
              <p className="mt-1 text-sm text-gray-600">
                View all your assignments and track due dates.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-4 sm:px-0">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    type="search"
                    placeholder="Search assignments..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                <Select value={selectedClass} onValueChange={(value) => { setSelectedClass(value); setCurrentPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center text-sm text-gray-500">
                  {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''} found
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments Table */}
        <div className="px-4 py-6 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle>Assignments List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No assignments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAssignments.map((assignment) => {
                        const dueDateInfo = getDueDateStatus(assignment.dueDate);
                        return (
                          <TableRow key={assignment.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{assignment.title}</div>
                                {assignment.description && (
                                  <div className="text-sm text-gray-500 truncate max-w-xs">{assignment.description}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-900">
                              {assignment.class.name}
                            </TableCell>
                            <TableCell className="text-sm text-gray-900">{assignment.totalPoints}</TableCell>
                            <TableCell>
                              <Badge className={dueDateInfo.color}>{dueDateInfo.label}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-900 flex items-center space-x-1">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span>{assignment.submissionCount}</span>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {assignment.createdAt ? formatDistanceToNow(new Date(assignment.createdAt), { addSuffix: true }) : "Unknown"}
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
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAssignments.length)} of {filteredAssignments.length} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-2 py-1 border rounded">
                      Previous
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`px-2 py-1 border rounded ${currentPage === pageNum ? "bg-gray-200" : ""}`}>
                          {pageNum}
                        </button>
                      );
                    })}
                    <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-2 py-1 border rounded">
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

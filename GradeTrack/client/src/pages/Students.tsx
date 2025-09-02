import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import StudentTable from "@/components/StudentTable";
import StudentModal from "@/components/StudentModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { StudentWithGrades } from "@shared/schema";

export default function Students() {
  const { isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithGrades | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

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

  // Fetch students
const { data: students = [] } = useQuery<StudentWithGrades[]>({
  queryKey: ["students", searchQuery],
  enabled: isAuthenticated,
  queryFn: async () => {
    const res = await apiRequest("GET", `/api/students?search=${searchQuery}`);
    return res.json();
  },
});

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      await apiRequest("DELETE", `/api/students/${studentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Student has been deleted successfully.",
      });
    queryClient.invalidateQueries({ queryKey: ["students"] });
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
        description: "Failed to delete student. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated || isLoading) {
    return null;
  }

  const handleAddStudent = () => {
    setSelectedStudent(undefined);
    setIsStudentModalOpen(true);
  };

  const handleViewStudent = (student: StudentWithGrades) => {
    // TODO: Navigate to student detail page or open detailed view
    console.log("View student:", student);
  };

  const handleEditStudent = (student: StudentWithGrades) => {
    setSelectedStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleDeleteStudent = (student: StudentWithGrades) => {
    if (window.confirm(`Are you sure you want to delete ${student.firstName} ${student.lastName}? WARNING: Deleting a student will also delete their associated ID.`)) {
      deleteStudentMutation.mutate(student.id);
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Export students data");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by the query key dependency
  };

  const handleCloseModal = () => {
    setIsStudentModalOpen(false);
    setSelectedStudent(undefined);
  };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8" data-testid="students-page">
        {/* Page Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="students-title">
                Students
              </h1>
              <p className="mt-1 text-sm text-gray-600" data-testid="students-description">
                Manage your student roster and track their academic progress.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <Button onClick={handleAddStudent} data-testid="add-student-button">
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-4 sm:px-0">
          <form onSubmit={handleSearch} className="max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="search"
                placeholder="Search students..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="search-students-input"
              />
            </div>
          </form>
        </div>

        {/* Students Table */}
        <div className="px-4 py-6 sm:px-0">
          <StudentTable
            students={students}
            onViewStudent={handleViewStudent}
            onEditStudent={handleEditStudent}
            onDeleteStudent={handleDeleteStudent}
            onExport={handleExport}
          />
        </div>

        {/* Student Modal */}
        <StudentModal
          isOpen={isStudentModalOpen}
          onClose={handleCloseModal}
          student={selectedStudent}
        />
      </main>
    </Layout>
  );
}

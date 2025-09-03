import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import TeacherTable from "@/components/TeacherTable";
import TeacherModal from "@/components/TeacherModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User } from "@shared/schema";


export default function Teachers() {
  const { isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
 
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<User | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => (window.location.href = "/api/login"), 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch teachers
  const { data: teachers = [] } = useQuery<User[]>({
    queryKey: ["teachers", searchQuery],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/teachers?search=${searchQuery}`);
      return res.json();
    },
  });

  // Delete teacher
 const deleteTeacherMutation = useMutation({
  mutationFn: async (id: string) => {
    await apiRequest("DELETE", `/api/teachers/${id}`);
  },
  onSuccess: () => {
    toast({ title: "Success", description: "Teacher deleted successfully." });
    queryClient.invalidateQueries({ queryKey: ["teachers"] });
  },
  onError: (error) => {
    if (isUnauthorizedError(error)) {
      toast({ title: "Unauthorized", description: "Logging in again...", variant: "destructive" });
      setTimeout(() => (window.location.href = "/api/login"), 500);
      return;
    }
    toast({ title: "Error", description: "Failed to delete teacher", variant: "destructive" });
  },
});
  if (!isAuthenticated || isLoading) return null;

  const handleAddTeacher = () => {
    setSelectedTeacher(undefined);
    setIsTeacherModalOpen(true);
  };

  const handleEditTeacher = (teacher: User) => {
    setSelectedTeacher(teacher);
    setIsTeacherModalOpen(true);
  };

  const handleDeleteTeacher = (teacher: User) => {
    if (window.confirm(`Are you sure you want to delete ${teacher.firstName} ${teacher.lastName}?`)) {
      deleteTeacherMutation.mutate(teacher.id);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleCloseModal = () => {
    setIsTeacherModalOpen(false);
    setSelectedTeacher(undefined);
  };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teachers</h1>
            <p className="text-sm text-gray-600">Manage your teachers and assign them to classes.</p>
          </div>
          <Button onClick={handleAddTeacher}>
            <Plus className="h-4 w-4 mr-2" /> Add Teacher
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 py-4 sm:px-0">
          <form onSubmit={handleSearch} className="max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search teachers..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div>

        {/* Teachers Table */}
        <div className="px-4 py-6 sm:px-0">
          <TeacherTable
            teachers={teachers}
            onEdit={handleEditTeacher}
            onDelete={handleDeleteTeacher}
          />
        </div>

        {/* Teacher Modal */}
        <TeacherModal
          isOpen={isTeacherModalOpen}
          onClose={handleCloseModal}
          teacher={selectedTeacher}
        />
      </main>
    </Layout>
  );
}

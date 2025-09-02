import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import DashboardStats from "@/components/DashboardStats";
import RecentActivity from "@/components/RecentActivity";
import StudentTable from "@/components/StudentTable";
import { apiRequest } from "@/lib/queryClient";

import type {
  StudentWithGrades,
  GradeWithDetails,
  AssignmentWithDetails,
} from "@shared/schema";

type DashboardStatsData = {
  totalStudents: number;
  averageGrade: string;
  assignmentsDue: number;
  activeClasses: number;
};

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect to login if not authenticated
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

  // Fetch dashboard stats
  const { data: stats } = useQuery<DashboardStatsData>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dashboard/stats");
      return res.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch recent grades
  const { data: recentGrades = [] } = useQuery<GradeWithDetails[]>({
    queryKey: ["/api/dashboard/recent-grades"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dashboard/recent-grades");
      return res.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch upcoming assignments
  const { data: upcomingAssignments = [] } = useQuery<AssignmentWithDetails[]>({
    queryKey: ["/api/dashboard/upcoming-assignments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dashboard/upcoming-assignments");
      return res.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch students for the table (same key as Students page!)
  const { data: students = [] } = useQuery<StudentWithGrades[]>({
    queryKey: ["students"], // important: same key everywhere
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/students");
      return res.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });

  if (!isAuthenticated || isLoading) return null;

  const handleViewStudent = (student: StudentWithGrades) => console.log("View student:", student);
  const handleEditStudent = (student: StudentWithGrades) => console.log("Edit student:", student);
  const handleDeleteStudent = (student: StudentWithGrades) => console.log("Delete student:", student);
  const handleExport = () => console.log("Export data");

  return (
    <Layout>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8" data-testid="dashboard-page">
        {/* Dashboard Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="dashboard-title">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600" data-testid="dashboard-welcome">
                Welcome back, {user?.firstName}. Here's what's happening with your classes.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-4 py-6 sm:px-0">
          <DashboardStats data={stats ?? undefined} />
        </div>

        {/* Recent Activity Section */}
        <div className="px-4 py-6 sm:px-0">
          <RecentActivity
            recentGrades={recentGrades}
            upcomingAssignments={upcomingAssignments}
          />
        </div>

        {/* Student Management Section */}
        <div className="px-4 py-6 sm:px-0">
          <StudentTable
            students={students}
            onViewStudent={handleViewStudent}
            onEditStudent={handleEditStudent}
            onDeleteStudent={handleDeleteStudent}
            onExport={handleExport}
          />
        </div>
      </main>
    </Layout>
  );
}

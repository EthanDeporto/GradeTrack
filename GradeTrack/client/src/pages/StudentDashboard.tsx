import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import RecentActivity from "@/components/RecentActivity";
import StudentDashboardStats from "@/components/StudentDashboardStats";

import type { GradeWithDetails, AssignmentWithDetails } from "@shared/schema";

type StudentDashboardStatsData = {
  totalAssignments: number;
  averageGrade: string;
  upcomingAssignments: number;
};

export default function StudentDashboard() {
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

  // Fetch student-specific stats
  const { data: stats, isLoading: loadingStats } = useQuery<StudentDashboardStatsData>({
    queryKey: ["/api/dashboard/student/stats"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch student's recent grades
  const { data: recentGrades = [], isLoading: loadingRecentGrades } = useQuery<GradeWithDetails[]>({
    queryKey: ["/api/dashboard/student/grades"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch student's upcoming assignments
  const { data: upcomingAssignments = [], isLoading: loadingUpcomingAssignments } = useQuery<AssignmentWithDetails[]>({
    queryKey: ["/api/dashboard/student/assignments"],
    retry: false,
    enabled: isAuthenticated,
  });

  if (!isAuthenticated || isLoading) return null;

  return (
    <Layout>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8" data-testid="student-dashboard-page">
        {/* Dashboard Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="dashboard-title">
                Student Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600" data-testid="dashboard-welcome">
                Welcome back, {user?.firstName}. Here are your grades and upcoming assignments.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-4 py-6 sm:px-0">
          <StudentDashboardStats data={stats ?? undefined} />
        </div>

        {/* Recent Activity Section */}
        <div className="px-4 py-6 sm:px-0">
          <RecentActivity
            recentGrades={recentGrades}
            upcomingAssignments={upcomingAssignments}
          />
        </div>
      </main>
    </Layout>
  );
}

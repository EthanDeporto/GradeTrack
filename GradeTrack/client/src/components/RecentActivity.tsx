import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { GradeWithDetails, AssignmentWithDetails } from "@shared/schema";

interface RecentActivityProps {
  recentGrades: GradeWithDetails[];
  upcomingAssignments: AssignmentWithDetails[];
}

export default function RecentActivity({ recentGrades, upcomingAssignments }: RecentActivityProps) {
  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-100 text-green-800";
    if (percentage >= 80) return "bg-blue-100 text-blue-800";
    if (percentage >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getAssignmentColor = (index: number) => {
    const colors = [
      "border-primary",
      "border-accent",
      "border-secondary",
      "border-purple-500",
    ];
    return colors[index % colors.length];
  };

  const formatDueDate = (dueDate: Date | null) => {
    if (!dueDate) return "No due date";
    const now = new Date();
    const due = new Date(dueDate);
    
    if (due < now) return "Overdue";
    
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    
    return due.toLocaleDateString();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="recent-activity">
      {/* Recent Grades */}
      <Card data-testid="recent-grades-card">
        <CardHeader>
          <CardTitle>Recent Grades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentGrades.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4" data-testid="no-recent-grades">
                No recent grades available
              </p>
            ) : (
              recentGrades.map((gradeData) => (
                <div
                  key={gradeData.id}
                  className="flex items-center justify-between"
                  data-testid={`recent-grade-${gradeData.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={gradeData.student.profileImageUrl || undefined} />
                      <AvatarFallback>
                        {gradeData.student.firstName[0]}{gradeData.student.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-gray-900" data-testid={`student-name-${gradeData.id}`}>
                        {gradeData.student.firstName} {gradeData.student.lastName}
                      </p>
                      <p className="text-sm text-gray-500" data-testid={`assignment-name-${gradeData.id}`}>
                        {gradeData.assignment.title}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={getGradeColor(Number(gradeData.percentage) || 0)}
                      data-testid={`grade-score-${gradeData.id}`}
                    >
                      {gradeData.letterGrade} ({gradeData.percentage}%)
                    </Badge>
                    <p className="text-xs text-gray-400 mt-1" data-testid={`grade-date-${gradeData.id}`}>
                      {gradeData.gradedAt ? formatDistanceToNow(new Date(gradeData.gradedAt), { addSuffix: true }) : "Recently"}
                    </p>
                  </div>
                </div>
              ))
            )}
            {recentGrades.length > 0 && (
              <div className="mt-4">
                <Link href="/grades">
                  <a className="text-primary text-sm font-medium hover:text-primary/80" data-testid="view-all-grades">
                    View all grades →
                  </a>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Assignments */}
      <Card data-testid="upcoming-assignments-card">
        <CardHeader>
          <CardTitle>Upcoming Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingAssignments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4" data-testid="no-upcoming-assignments">
                No upcoming assignments
              </p>
            ) : (
              upcomingAssignments.map((assignment, index) => (
                <div
                  key={assignment.id}
                  className={`border-l-4 pl-4 ${getAssignmentColor(index)}`}
                  data-testid={`upcoming-assignment-${assignment.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900" data-testid={`assignment-title-${assignment.id}`}>
                        {assignment.title}
                      </p>
                      <p className="text-sm text-gray-500" data-testid={`assignment-class-${assignment.id}`}>
                        {assignment.class.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900" data-testid={`assignment-due-${assignment.id}`}>
                        {formatDueDate(assignment.dueDate)}
                      </p>
                      <p className="text-xs text-gray-500" data-testid={`assignment-submissions-${assignment.id}`}>
                        {assignment.submissionCount} submitted
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            {upcomingAssignments.length > 0 && (
              <div className="mt-4">
                <Link href="/assignments">
                  <a className="text-primary text-sm font-medium hover:text-primary/80" data-testid="view-all-assignments">
                    View all assignments →
                  </a>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

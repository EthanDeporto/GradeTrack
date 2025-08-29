import { Users, TrendingUp, Clock, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface DashboardStatsProps {
  data?: {
    totalStudents: number;
    averageGrade: string;
    assignmentsDue: number;
    activeClasses: number;
  };
}

export default function DashboardStats({ data }: DashboardStatsProps) {
  const stats = [
    {
      name: "Total Students",
      value: data?.totalStudents || 0,
      icon: Users,
      color: "text-primary",
      testId: "stat-total-students",
    },
    {
      name: "Average Grade",
      value: data?.averageGrade || "N/A",
      icon: TrendingUp,
      color: "text-secondary",
      testId: "stat-average-grade",
    },
    {
      name: "Due This Week",
      value: data?.assignmentsDue || 0,
      icon: Clock,
      color: "text-accent",
      testId: "stat-assignments-due",
    },
    {
      name: "Active Classes",
      value: data?.activeClasses || 0,
      icon: BookOpen,
      color: "text-purple-600",
      testId: "stat-active-classes",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" data-testid="dashboard-stats">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.name} className="overflow-hidden" data-testid={stat.testId}>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900" data-testid={`${stat.testId}-value`}>
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

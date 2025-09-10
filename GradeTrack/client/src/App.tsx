import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import { Login } from "@/pages/Login";
import AdminDashboard from "@/pages/Dashboard";
import StudentDashboard from "@/pages/StudentDashboard";
import Students from "@/pages/Students";
import Grades from "@/pages/Grades";
import Classes from "@/pages/Classes"
import Assignments from "@/pages/Assignments";
import StudentGrades from "@/pages/StudentGrades"
import StudentAssignments from "@/pages/StudentAssignments";
import Teachers from "@/pages/Teachers"
import StudentClasses from "@/pages/StudentClasses";
import StudentsWithoutAddButton from "@/pages/StudentsWithoutAddButton"

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
const isLocalAuth = !import.meta.env.VITE_REPLIT_DOMAINS;
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Authenticated routes
  if (user?.role === "admin") {
    return (
      <Switch>
        <Route path="/" component={AdminDashboard} />
        <Route path="/teachers" component={Teachers} />
        <Route path="/students" component={Students} />
        <Route path="/classes" component={Classes} />
        <Route path="/assignments" component={Assignments} />
        <Route path="/grades" component={Grades} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  if (user?.role === "student") {
    return (
      <Switch>
        <Route path="/" component={StudentDashboard} />
        <Route path="/classes" component={StudentClasses} />
        <Route path="/assignments" component={StudentAssignments} />
        <Route path="/grades" component={StudentGrades} />
        <Route component={NotFound} />
      </Switch>
    );
  }
if (user?.role === "teacher") {
    return (
      <Switch>
        <Route path="/" component={AdminDashboard} />
        <Route path="/students" component={StudentsWithoutAddButton} />
        <Route path="/classes" component={StudentClasses} />
        <Route path="/assignments" component={Assignments} />
        <Route path="/grades" component={Grades} />
        <Route component={NotFound} />
      </Switch>
    );
  }
  
  return <NotFound />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;


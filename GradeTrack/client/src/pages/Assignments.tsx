import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Calendar, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatDistanceToNow } from "date-fns";
import type { AssignmentWithDetails, ClassWithDetails } from "@shared/schema";

const assignmentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  classId: z.string().min(1, "Class is required"),
  totalPoints: z.string().min(1, "Total points is required"),
  dueDate: z.string().optional(),
});

type AssignmentFormData = z.infer<typeof assignmentFormSchema>;

export default function Assignments() {
  const { isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithDetails | undefined>();
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 10;

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      title: "",
      description: "",
      classId: "",
      totalPoints: "",
      dueDate: "",
    },
  });

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

  // Update form when selected assignment changes
  useEffect(() => {
    if (selectedAssignment) {
      form.reset({
        title: selectedAssignment.title,
        description: selectedAssignment.description || "",
        classId: selectedAssignment.classId,
        totalPoints: selectedAssignment.totalPoints,
        dueDate: selectedAssignment.dueDate 
          ? new Date(selectedAssignment.dueDate).toISOString().slice(0, 16)
          : "",
      });
    } else {
      form.reset({
        title: "",
        description: "",
        classId: "",
        totalPoints: "",
        dueDate: "",
      });
    }
  }, [selectedAssignment, form]);

  // Fetch assignments
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery<AssignmentWithDetails[]>({
    queryKey: ["/api/assignments"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch classes for filter and form
  const { data: classes = [] } = useQuery<ClassWithDetails[]>({
    queryKey: ["/api/classes"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const response = await apiRequest("POST", "/api/assignments", {
        title: data.title,
        description: data.description || null,
        classId: data.classId,
        totalPoints: data.totalPoints,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Assignment has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      handleCloseModal();
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
        description: "Failed to create assignment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update assignment mutation
  const updateAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const response = await apiRequest("PUT", `/api/assignments/${selectedAssignment!.id}`, {
        title: data.title,
        description: data.description || null,
        classId: data.classId,
        totalPoints: data.totalPoints,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Assignment has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      handleCloseModal();
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
        description: "Failed to update assignment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      await apiRequest("DELETE", `/api/assignments/${assignmentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Assignment has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
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
        description: "Failed to delete assignment. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated || isLoading) {
    return null;
  }

  const getDueDateStatus = (dueDate: Date | null) => {
    if (!dueDate) return { status: "no-date", label: "No due date", color: "bg-gray-100 text-gray-800" };
    
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: "overdue", label: "Overdue", color: "bg-red-100 text-red-800" };
    if (diffDays === 0) return { status: "today", label: "Due today", color: "bg-yellow-100 text-yellow-800" };
    if (diffDays === 1) return { status: "tomorrow", label: "Due tomorrow", color: "bg-orange-100 text-orange-800" };
    if (diffDays <= 7) return { status: "week", label: `Due in ${diffDays} days`, color: "bg-blue-100 text-blue-800" };
    
    return { status: "future", label: due.toLocaleDateString(), color: "bg-green-100 text-green-800" };
  };

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    const matchesClass = selectedClass === "all" || assignment.class.id === selectedClass;
    const matchesSearch = searchQuery === "" || 
      assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.class.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesClass && matchesSearch;
  });

  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAssignments = filteredAssignments.slice(startIndex, startIndex + itemsPerPage);

  const handleAddAssignment = () => {
    setSelectedAssignment(undefined);
    setIsAssignmentModalOpen(true);
  };

  const handleEditAssignment = (assignment: AssignmentWithDetails) => {
    setSelectedAssignment(assignment);
    setIsAssignmentModalOpen(true);
  };

  const handleDeleteAssignment = (assignment: AssignmentWithDetails) => {
    if (window.confirm(`Are you sure you want to delete "${assignment.title}"?`)) {
      deleteAssignmentMutation.mutate(assignment.id);
    }
  };

  const handleCloseModal = () => {
    setIsAssignmentModalOpen(false);
    setSelectedAssignment(undefined);
    form.reset();
  };

  const onSubmit = (data: AssignmentFormData) => {
    if (selectedAssignment) {
      updateAssignmentMutation.mutate(data);
    } else {
      createAssignmentMutation.mutate(data);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const isSubmitting = createAssignmentMutation.isPending || updateAssignmentMutation.isPending;

  return (
    <Layout>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8" data-testid="assignments-page">
        {/* Page Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="assignments-title">
                Assignments
              </h1>
              <p className="mt-1 text-sm text-gray-600" data-testid="assignments-description">
                Create and manage assignments for your classes.
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Button onClick={handleAddAssignment} data-testid="add-assignment-button">
                <Plus className="h-4 w-4 mr-2" />
                Add Assignment
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-4 sm:px-0">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      type="search"
                      placeholder="Search assignments..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="search-assignments-input"
                    />
                  </div>
                </form>
                
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger data-testid="class-filter">
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
          <Card data-testid="assignments-table">
            <CardHeader>
              <CardTitle>Assignment List</CardTitle>
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500" data-testid="no-assignments">
                          No assignments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAssignments.map((assignment) => {
                        const dueDateInfo = getDueDateStatus(assignment.dueDate);
                        return (
                          <TableRow key={assignment.id} className="hover:bg-gray-50" data-testid={`assignment-row-${assignment.id}`}>
                            <TableCell>
                              <div>
                                <div className="text-sm font-medium text-gray-900" data-testid={`assignment-title-${assignment.id}`}>
                                  {assignment.title}
                                </div>
                                {assignment.description && (
                                  <div className="text-sm text-gray-500 truncate max-w-xs">
                                    {assignment.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-900" data-testid={`assignment-class-${assignment.id}`}>
                              {assignment.class.name}
                              <div className="text-xs text-gray-500">
                                {assignment.class.subject}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-900" data-testid={`assignment-points-${assignment.id}`}>
                              {assignment.totalPoints}
                            </TableCell>
                            <TableCell>
                              <Badge className={dueDateInfo.color} data-testid={`assignment-due-${assignment.id}`}>
                                {dueDateInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-900" data-testid={`assignment-submissions-${assignment.id}`}>
                              <div className="flex items-center space-x-1">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span>{assignment.submissionCount}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500" data-testid={`assignment-created-${assignment.id}`}>
                              {assignment.createdAt ? formatDistanceToNow(new Date(assignment.createdAt), { addSuffix: true }) : "Unknown"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center space-x-2 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditAssignment(assignment)}
                                  data-testid={`edit-assignment-${assignment.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteAssignment(assignment)}
                                  className="text-red-600 hover:text-red-800"
                                  data-testid={`delete-assignment-${assignment.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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
                <div className="flex items-center justify-between pt-4" data-testid="pagination">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAssignments.length)} of {filteredAssignments.length} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      data-testid="prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            data-testid={`page-${pageNum}`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Assignment Modal */}
        <Dialog open={isAssignmentModalOpen} onOpenChange={handleCloseModal}>
          <DialogContent className="sm:max-w-[425px]" data-testid="assignment-modal">
            <DialogHeader>
              <DialogTitle data-testid="assignment-modal-title">
                {selectedAssignment ? "Edit Assignment" : "Add New Assignment"}
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignment Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter assignment title"
                          {...field}
                          data-testid="assignment-title-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter assignment description"
                          className="resize-none"
                          {...field}
                          data-testid="assignment-description-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="assignment-class-select">
                            <SelectValue placeholder="Select a class..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name} - {cls.subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="totalPoints"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Points</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Enter total points"
                            {...field}
                            data-testid="assignment-points-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            data-testid="assignment-due-date-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    data-testid="cancel-button"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="save-assignment-button"
                  >
                    {isSubmitting ? "Saving..." : selectedAssignment ? "Update Assignment" : "Create Assignment"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </main>
    </Layout>
  );
}

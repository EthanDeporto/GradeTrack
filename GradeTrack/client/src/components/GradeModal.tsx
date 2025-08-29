import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { StudentWithGrades, AssignmentWithDetails, Grade } from "@shared/schema";

const gradeFormSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  assignmentId: z.string().min(1, "Assignment is required"),
  pointsEarned: z.string().min(1, "Points earned is required"),
  comments: z.string().optional(),
});

type GradeFormData = z.infer<typeof gradeFormSchema>;

interface GradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  grade?: Grade;
  preselectedStudentId?: string;
  preselectedAssignmentId?: string;
}

export default function GradeModal({
  isOpen,
  onClose,
  grade,
  preselectedStudentId,
  preselectedAssignmentId,
}: GradeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<GradeFormData>({
    resolver: zodResolver(gradeFormSchema),
    defaultValues: {
      studentId: preselectedStudentId || grade?.studentId || "",
      assignmentId: preselectedAssignmentId || grade?.assignmentId || "",
      pointsEarned: grade?.pointsEarned || "",
      comments: grade?.comments || "",
    },
  });

  // Fetch students
  const { data: students = [], isLoading: loadingStudents } = useQuery<StudentWithGrades[]>({
    queryKey: ["/api/students"],
    enabled: isOpen,
  });

  // Fetch assignments
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery<AssignmentWithDetails[]>({
    queryKey: ["/api/assignments"],
    enabled: isOpen,
  });

  const createGradeMutation = useMutation({
    mutationFn: async (data: GradeFormData) => {
      const response = await apiRequest("POST", "/api/grades", {
        studentId: data.studentId,
        assignmentId: data.assignmentId,
        pointsEarned: data.pointsEarned,
        comments: data.comments || null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grade has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/grades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      onClose();
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
        description: "Failed to save grade. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateGradeMutation = useMutation({
    mutationFn: async (data: GradeFormData) => {
      const response = await apiRequest("PUT", `/api/grades/${grade!.id}`, {
        studentId: data.studentId,
        assignmentId: data.assignmentId,
        pointsEarned: data.pointsEarned,
        comments: data.comments || null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grade has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/grades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      onClose();
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
        description: "Failed to update grade. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GradeFormData) => {
    if (grade) {
      updateGradeMutation.mutate(data);
    } else {
      createGradeMutation.mutate(data);
    }
  };

  const isLoading = createGradeMutation.isPending || updateGradeMutation.isPending;

  const selectedAssignment = assignments.find(a => a.id === form.watch("assignmentId"));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="grade-modal">
        <DialogHeader>
          <DialogTitle data-testid="grade-modal-title">
            {grade ? "Edit Grade" : "Add New Grade"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingStudents}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="student-select">
                        <SelectValue placeholder="Select a student..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.firstName} {student.lastName} ({student.studentId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignment</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingAssignments}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="assignment-select">
                        <SelectValue placeholder="Select an assignment..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assignments.map((assignment) => (
                        <SelectItem key={assignment.id} value={assignment.id}>
                          {assignment.title} - {assignment.class.name} ({assignment.totalPoints} pts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pointsEarned"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Points Earned
                    {selectedAssignment && (
                      <span className="text-sm text-gray-500 ml-2">
                        (out of {selectedAssignment.totalPoints})
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={selectedAssignment?.totalPoints || undefined}
                      placeholder="Enter points earned"
                      {...field}
                      data-testid="points-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add feedback or comments..."
                      className="resize-none"
                      {...field}
                      data-testid="comments-textarea"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                data-testid="cancel-button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                data-testid="save-grade-button"
              >
                {isLoading ? "Saving..." : grade ? "Update Grade" : "Save Grade"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

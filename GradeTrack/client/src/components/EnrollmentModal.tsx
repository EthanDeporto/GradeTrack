import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { StudentWithGrades } from "@shared/schema";
import { useEffect } from "react";
const enrollmentFormSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  classId: z.string().min(1, "Class is required"),
});

type EnrollmentFormData = z.infer<typeof enrollmentFormSchema>;

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string; // passed from Classes.tsx
}

export default function EnrollmentModal({
  isOpen,
  onClose,
  classId,
}: EnrollmentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentFormSchema),
    defaultValues: {
      studentId: "",
      classId: classId,
    },
  });

  // Update classId only when it changes
  useEffect(() => {
    form.setValue("classId", classId);
  }, [classId, form]);

  // Fetch all students
  const { data: students = [], isLoading: loadingStudents } = useQuery<StudentWithGrades[]>({
    queryKey: ["/api/students"],
    enabled: isOpen,
  });

  const enrollMutation = useMutation({
    mutationFn: async (data: EnrollmentFormData) => {
      const response = await apiRequest("POST", "/api/enrollments", {
        studentId: data.studentId,
        classId: data.classId,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Student has been enrolled successfully.",
      });
      // Invalidate roster so RosterModal shows updated students
     queryClient.invalidateQueries({ queryKey: ["/api/classes", classId, "students"] });
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
        description: "Failed to enroll student. Please try again.",
        variant: "destructive",
      });
    },
  });

const deleteEnrollment = useMutation({
  mutationFn: async (studentId: string) => {
    await apiRequest("DELETE", `/api/enrollments`, { body: { studentId, classId } });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["classStudents", classId] });
  },
});

  const onSubmit = (data: EnrollmentFormData) => {
    enrollMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="enrollment-modal">
        <DialogHeader>
          <DialogTitle data-testid="enrollment-modal-title">
            Enroll Student
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Student Select */}
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

            {/* Hidden classId field */}
            <input type="hidden" {...form.register("classId")} />

            {/* Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={enrollMutation.isPending}
                data-testid="cancel-button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={enrollMutation.isPending}
                data-testid="enroll-student-button"
              >
                {enrollMutation.isPending ? "Enrolling..." : "Enroll Student"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Student } from "@shared/schema";
import { useEffect } from "react";

const studentFormSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  profileImageUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(), 
});


type StudentFormData = z.infer<typeof studentFormSchema>;

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student;
}

export default function StudentModal({ isOpen, onClose, student }: StudentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
      defaultValues: {
      studentId: student?.studentId || "",
      firstName: student?.firstName || "",
      lastName: student?.lastName || "",
      email: student?.email || "",
      profileImageUrl: student?.profileImageUrl || "",
      password: "", // always blank on modal open (user fills if updating)
},

  });

  useEffect(() => {
    form.reset({
      studentId: student?.studentId || "",
      firstName: student?.firstName || "",
      lastName: student?.lastName || "",
      email: student?.email || "",
      profileImageUrl: student?.profileImageUrl || "",
      password: "", // keep password blank
    });
  }, [student, form]);
  
  const createStudentMutation = useMutation({
  mutationFn: async (data: StudentFormData) => {
    const payload = {
      studentId: data.studentId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      profileImageUrl: data.profileImageUrl || null,
      password: student ? data.password || undefined : data.password,
    };
    if (!student && !data.password) {
      toast({ title: "Password is required for new students" });
      return;
}
    const response = await apiRequest("POST", "/api/students", payload);
    return response.json();
  },
  onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["students"] });
  queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
  toast({ title: "Student created successfully" });
  onClose();
},
  onError: (err) => {
    if (isUnauthorizedError(err)) {
      toast({ title: "Unauthorized", description: "Please log in again." });
    } else {
      toast({ title: "Error creating student" });
    }
  },
});

  const updateStudentMutation = useMutation({
  mutationFn: async (data: StudentFormData) => {
  const payload: any = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email || null,
    studentId: data.studentId || null,
    profileImageUrl: data.profileImageUrl || null,
  };

  if (data.password && data.password.trim() !== "") {
    payload.password = data.password;
  }

  const response = await apiRequest(
    "PUT",
    `/api/students/${student?.id}`, 
    payload
  );
  return response.json();
},
 onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["students"] });
  toast({ title: "Student updated successfully" });
  onClose();
},
  onError: () => {
    toast({ title: "Error updating student" });
  },
});

  const onSubmit = (data: StudentFormData) => {
    if (student) {
      updateStudentMutation.mutate(data);
    } else {
      createStudentMutation.mutate(data);
    }
  };

  const isLoading = createStudentMutation.isPending || updateStudentMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="student-modal">
        <DialogHeader>
          <DialogTitle data-testid="student-modal-title">
            {student ? "Edit Student" : "Add New Student"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter student ID"
                      {...field}
                      data-testid="student-id-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter first name"
                        {...field}
                        data-testid="first-name-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter last name"
                        {...field}
                        data-testid="last-name-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      {...field}
                      data-testid="email-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
  control={form.control}
  name="password"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Password {student ? "" : ""}</FormLabel>
      <FormControl>
        <Input
          type="password"
          placeholder={student ? "Enter new password (optional)" : "Enter password"}
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>


            <FormField
              control={form.control}
              name="profileImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Image URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="Enter profile image URL"
                      {...field}
                      data-testid="profile-image-input"
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
                data-testid="save-student-button"
              >
                {isLoading ? "Saving..." : student ? "Update Student" : "Add Student"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

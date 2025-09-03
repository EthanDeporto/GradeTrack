import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User } from "@shared/schema";
import { useState, useEffect } from "react";
const teacherFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z
    .union([z.string().min(6, "Password must be at least 6 characters"), z.literal("")])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

type TeacherFormData = z.infer<typeof teacherFormSchema>;

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher?: User;
}

export default function TeacherModal({ isOpen, onClose, teacher }: TeacherModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TeacherFormData>({
  resolver: zodResolver(teacherFormSchema),
  defaultValues: {
    firstName: teacher?.firstName || "",
    lastName: teacher?.lastName || "",
    email: teacher?.email || "",
    password: teacher ? undefined : "",
  },
});

useEffect(() => {
  form.reset({
    firstName: teacher?.firstName || "",
    lastName: teacher?.lastName || "",
    email: teacher?.email || "",
    password: teacher ? undefined : "",
  });
}, [teacher, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const createTeacherMutation = useMutation({
    mutationFn: async (data: TeacherFormData) => {
      const payload = { ...data, role: "teacher" };
      const res = await apiRequest("POST", "/api/teachers", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Teacher created successfully." });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      onClose();
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Logging in again...", variant: "destructive" });
        setTimeout(() => (window.location.href = "/api/login"), 500);
        return;
      }
      toast({ title: "Error", description: "Failed to create teacher.", variant: "destructive" });
    },
  });

const updateTeacherMutation = useMutation({
  mutationFn: async (data: TeacherFormData) => {
    // drop password if not provided
    const { password, ...rest } = data;
    const payload = password ? data : rest;

    const res = await apiRequest("PUT", `/api/teachers/${teacher?.id}`, payload);
    // make sure apiRequest throws on !res.ok, or check here:
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message || "Failed to update teacher");
    }
    return res.json();
  },
  onSuccess: () => {
    toast({ title: "Success", description: "Teacher updated successfully." });
    queryClient.invalidateQueries({ queryKey: ["teachers"] });
    onClose();
    form.reset();
  },
  onError: (error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Failed to update teacher.";
    toast({ title: "Error", description: message, variant: "destructive" });
  },
});






const handleSubmit = form.handleSubmit((data) => {
  if (teacher?.id) {
    updateTeacherMutation.mutate(data);
  } else {
    // ensure password exists on create
    if (!data.password) {
      // react-hook-form should catch this, but belt & suspenders:
      form.setError("password", { type: "manual", message: "Password is required" });
      return;
    }
    createTeacherMutation.mutate(data);
  }
});

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{teacher ? "Edit Teacher" : "Add Teacher"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField name="firstName" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="lastName" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="email" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input {...field} type="email" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {!teacher && (
              <FormField name="password" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl><Input {...field} type="password" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <Button type="submit" className="w-full">{teacher ? "Update" : "Create"}</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatDistanceToNow } from "date-fns";
import type { ClassWithDetails } from "@shared/schema";

const classFormSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  subject: z.string().min(1, "Subject is required"),
  teacherId: z.string().optional(),
});

type ClassFormData = z.infer<typeof classFormSchema>;

export default function Classes() {
  const { isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassWithDetails | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: "",
      subject: "",
      teacherId: "",
    },
  });

  // redirect if not logged in
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

  // reset form when editing
  useEffect(() => {
    if (selectedClass) {
      form.reset({
        name: selectedClass.name,
        subject: selectedClass.subject,
        teacherId: selectedClass.teacherId || "",
      });
    } else {
      form.reset({
        name: "",
        subject: "",
        teacherId: "",
      });
    }
  }, [selectedClass, form]);

  // Fetch classes
  const { data: classes = [], isLoading: loadingClasses } = useQuery<ClassWithDetails[]>({
    queryKey: ["/api/classes"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Create class
  const createClassMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      const res = await apiRequest("POST", "/api/classes", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Class created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      handleCloseModal();
    },
    onError: (error) => handleAuthError(error, "create"),
  });

  // Update class
  const updateClassMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      const res = await apiRequest("PUT", `/api/classes/${selectedClass!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Class updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      handleCloseModal();
    },
    onError: (error) => handleAuthError(error, "update"),
  });

  // Delete class
  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/classes/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Class deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
    },
    onError: (error) => handleAuthError(error, "delete"),
  });

  const handleAuthError = (error: unknown, action: string) => {
    if (error instanceof Error && isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => (window.location.href = "/api/login"), 500);
      return;
    }
    toast({
      title: "Error",
      description: `Failed to ${action} class. Please try again.`,
      variant: "destructive",
    });
  };

  if (!isAuthenticated || isLoading) return null;

  // filter + paginate
  const filteredClasses = classes.filter((cls) =>
    cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClasses = filteredClasses.slice(startIndex, startIndex + itemsPerPage);

  // modal helpers
  const handleAddClass = () => {
    setSelectedClass(undefined);
    setIsClassModalOpen(true);
  };
  const handleEditClass = (cls: ClassWithDetails) => {
    setSelectedClass(cls);
    setIsClassModalOpen(true);
  };
  const handleDeleteClass = (cls: ClassWithDetails) => {
    if (window.confirm(`Delete class "${cls.name}"?`)) {
      deleteClassMutation.mutate(cls.id);
    }
  };
  const handleCloseModal = () => {
    setIsClassModalOpen(false);
    setSelectedClass(undefined);
    form.reset();
  };

  const onSubmit = (data: ClassFormData) => {
    if (selectedClass) updateClassMutation.mutate(data);
    else createClassMutation.mutate(data);
  };

  const isSubmitting = createClassMutation.isPending || updateClassMutation.isPending;

  return (
    <Layout>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
            <p className="text-sm text-gray-600">Manage your classes and subjects.</p>
          </div>
          <Button onClick={handleAddClass}>
            <Plus className="h-4 w-4 mr-2" /> Add Class
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 py-4 sm:px-0">
          <Card>
            <CardContent className="pt-6 flex gap-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCurrentPage(1);
                }}
                className="flex-1"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search classes..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
              <div className="text-sm text-gray-500">
                {filteredClasses.length} class{filteredClasses.length !== 1 && "es"} found
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <div className="px-4 py-6 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle>Class List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClasses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-6">
                          No classes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedClasses.map((cls) => (
                        <TableRow key={cls.id}>
                          <TableCell>{cls.name}</TableCell>
                          <TableCell>{cls.subject}</TableCell>
                          <TableCell>{cls.teacher?.firstName} {cls.teacher?.lastName}</TableCell>
                          <TableCell>{cls.createdAt ? formatDistanceToNow(new Date(cls.createdAt), { addSuffix: true }) : "Unknown"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEditClass(cls)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClass(cls)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredClasses.length)} of {filteredClasses.length}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal */}
        <Dialog open={isClassModalOpen} onOpenChange={handleCloseModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{selectedClass ? "Edit Class" : "Add New Class"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter class name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter subject" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="teacherId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teacher (ID optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter teacher ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCloseModal} type="button">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : selectedClass ? "Update Class" : "Create Class"}
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

import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import type { StudentWithGrades } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface RosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
}

export default function RosterModal({
  isOpen,
  onClose,
  classId,
}: RosterModalProps) {
  const queryClient = useQueryClient();

  // Fetch enrolled students for the class
  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ["/api/classes", classId, "students"],
  });

  // Mutation for unenrolling a student
// Mutation for unenrolling a student
const unenrollMutation = useMutation({
  mutationFn: async (studentId: string) => {
    await apiRequest("DELETE", `/api/classes/${classId}/students/${studentId}`);
  },
  onSuccess: () => {
    // Refresh roster after unenrolling
    queryClient.invalidateQueries({
      queryKey: ["/api/classes", classId, "students"],
    });
  },
});


return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Class Roster</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p>Loading students...</p>
        ) : students.length === 0 ? (
          <p>No students enrolled in this class.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      {student.firstName} {student.lastName}
                    </TableCell>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => unenrollMutation.mutate(student.id)}
                        disabled={unenrollMutation.isPending}
                      >
                        {unenrollMutation.isPending ? "Removing..." : "Unenroll"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

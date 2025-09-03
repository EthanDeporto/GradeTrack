import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import type { User } from "@shared/schema";

interface TeacherTableProps {
  teachers: User[];
  onEdit: (teacher: User) => void;
  onDelete: (teacher: User) => void;
}

export default function TeacherTable({ teachers, onEdit, onDelete }: TeacherTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teachers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-500 py-6">
                No teachers found
              </TableCell>
            </TableRow>
          ) : (
            teachers.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.firstName}</TableCell>
                <TableCell>{t.lastName}</TableCell>
                <TableCell>{t.email || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(t)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(t)} className="text-red-600">
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
  );
}

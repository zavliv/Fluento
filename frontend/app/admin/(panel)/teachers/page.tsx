import { TeachersList } from "@/components/admin/TeachersList";

export const instant = false;

export const metadata = { title: "Teachers" };

export default function TeachersPage() {
  return <TeachersList />;
}

import { TeacherEditor } from "@/components/admin/TeacherEditor";

export const metadata = { title: "Edit teacher · Admin" };
export const instant = false;

export default async function TeacherEditorPage({ params }: PageProps<"/admin/teachers/[id]">) {
  const { id } = await params;
  return <TeacherEditor teacherId={id} />;
}

import { UsersTable } from "@/components/admin/UsersTable";

export const instant = false;

export const metadata = { title: "Users · Admin" };

export default function UsersPage() {
  return <UsersTable />;
}

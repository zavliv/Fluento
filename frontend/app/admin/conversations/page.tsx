import { Suspense } from "react";
import { ConversationsTable } from "@/components/admin/ConversationsTable";

export const instant = false;

export const metadata = { title: "Conversations · Admin" };

export default function ConversationsPage() {
  return (
    <Suspense>
      <ConversationsTable />
    </Suspense>
  );
}

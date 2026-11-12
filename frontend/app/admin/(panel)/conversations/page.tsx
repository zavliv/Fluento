import { Suspense } from "react";
import { ConversationsTable } from "@/components/admin/ConversationsTable";

export const instant = false;

export const metadata = { title: "Conversations" };

export default function ConversationsPage() {
  return (
    <Suspense>
      <ConversationsTable />
    </Suspense>
  );
}

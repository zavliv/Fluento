import { ConversationView } from "@/components/admin/ConversationView";

export const metadata = { title: "Conversation · Admin" };
export const instant = false;

export default async function ConversationPage({ params }: PageProps<"/admin/conversations/[id]">) {
  const { id } = await params;
  return <ConversationView conversationId={id} />;
}

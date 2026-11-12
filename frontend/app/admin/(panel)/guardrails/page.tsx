import { GuardrailsSettings } from "@/components/admin/GuardrailsSettings";

export const metadata = { title: "Guardrails" };
export const instant = false;

export default function Page() {
  return <GuardrailsSettings />;
}

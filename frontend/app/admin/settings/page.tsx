import { SettingsForm } from "@/components/admin/SettingsForm";

export const instant = false;

export const metadata = { title: "Settings · Admin" };

export default function SettingsPage() {
  return <SettingsForm />;
}

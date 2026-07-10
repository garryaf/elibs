import { redirect } from "next/navigation";

export default function SystemSettingsRedirect() {
  redirect("/dashboard/settings/smtp");
}

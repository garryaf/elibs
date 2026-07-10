import { redirect } from "next/navigation";

export default function AdministrationPage() {
  redirect("/dashboard/administration/users");
}

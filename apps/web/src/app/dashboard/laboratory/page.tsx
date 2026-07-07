import { redirect } from "next/navigation";

/**
 * Laboratory landing page — redirects to the Queue tab by default.
 * The queue is the primary workflow entry point for lab staff.
 */
export default function LaboratoryPage() {
  redirect("/dashboard/laboratory/queue");
}

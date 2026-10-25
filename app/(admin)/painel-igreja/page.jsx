import { redirect } from "next/navigation";

/** Compatibility route for the main church administration dashboard. */
export default function AdminChurchDashboard() {
  redirect("/admin");
}

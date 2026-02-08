import { redirect } from "next/navigation";
import { OnboardingModal } from "@/components/OnboardingModal";

export default function Page() {
  redirect("/home");
}

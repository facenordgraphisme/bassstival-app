import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SurveyClient from "./survey-client";
import { FadeUp } from "@/components/FX";

export default async function SurveyPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params; // ✅ on attend l'objet params
  
  const session = await auth();
  const roles = session?.user?.roles ?? [];
  if (!roles.includes("polls")) redirect("/403");

  return (
    <FadeUp className="space-y-6">
      <SurveyClient surveyId={params.id} />
    </FadeUp>
  );
}

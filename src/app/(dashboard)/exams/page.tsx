import { ExamTemplatesList } from "@/components/exam-templates/exam-templates-list";

export const metadata = {
  title: "מבחנים ומטלות | מערכת ניהול",
};

export default function ExamsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <ExamTemplatesList />
    </div>
  );
}

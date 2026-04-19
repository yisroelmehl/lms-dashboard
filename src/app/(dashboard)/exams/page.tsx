import { ExamTemplatesList } from "@/components/exam-templates/exam-templates-list";

export const metadata = {
  title: "מבחנים ומטלות | מערכת ניהול",
};

export default function ExamsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">מאגר מבחנים ומטלות</h1>
        <p className="text-gray-600 mt-2">ניהול מבחנים, שיוך ליחידות לימוד ויצירה בעזרת AI</p>
      </div>
      
      <ExamTemplatesList />
    </div>
  );
}

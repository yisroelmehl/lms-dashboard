import { ExamWizard } from "@/components/exam-templates/exam-wizard";

export const metadata = {
  title: "יצירת מבחן - אשף חכם | מערכת ניהול",
};

export default function CreateExamPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">יצירת מבחן חדש</h1>
        <p className="text-gray-600 mt-2">אשף שלבים ליצירת מבחן ומחולל שאלות אוטומטי</p>
      </div>

      <ExamWizard />
    </div>
  );
}

import { StudyUnitsManager } from "@/components/study-units/study-units-manager";

export const metadata = {
  title: "יחידות לימוד | מערכת ניהול",
};

export default function StudyUnitsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">מאגר חומרי לימוד</h1>
        <p className="text-gray-600 mt-2">ניהול קבצי טקסט מחולקים ליחידות - בסיס לחוללן המבחנים</p>
      </div>
      
      <StudyUnitsManager />
    </div>
  );
}

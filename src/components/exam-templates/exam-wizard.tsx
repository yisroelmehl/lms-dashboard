"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function ExamWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Info
  const [courses, setCourses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructions: "",
    type: "exam",
    timeLimit: "",
    passingScore: "60",
    courseId: "",
  });

  // Step 2: Units
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [tagGroups, setTagGroups] = useState<any>({});

  // Step 3: AI Generate
  const [questionTypes, setQuestionTypes] = useState<string[]>(["multiple_choice", "open"]);
  const [countPerType, setCountPerType] = useState("5");
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/courses").then(r => r.json()).then(d => setCourses(d.courses || d || []));
  }, []);

  useEffect(() => {
    if (step === 2) {
      let url = "/api/study-units";
      if (formData.courseId) url += `?courseId=${formData.courseId}`;
      fetch(url)
        .then(r => r.json())
        .then(data => {
          setAvailableUnits(data.units || []);
          // Group by StudySubject → StudySemester, falling back to tag or "ללא נושא"
          const grouped: any = {};
          (data.units || []).forEach((u: any) => {
            let groupKey: string;
            if (u.studySemester?.studySubject?.name) {
              groupKey = `${u.studySemester.studySubject.name} — ${u.studySemester.name}`;
            } else if (u.tag?.name) {
              groupKey = u.tag.name;
            } else {
              groupKey = "ללא נושא";
            }
            if (!grouped[groupKey]) grouped[groupKey] = [];
            grouped[groupKey].push(u);
          });
          setTagGroups(grouped);
        });
    }
  }, [step, formData.courseId]);

  const toggleUnit = (id: string) => {
    if (selectedUnits.includes(id)) {
      setSelectedUnits(selectedUnits.filter(u => u !== id));
    } else {
      setSelectedUnits([...selectedUnits, id]);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Create Template
      const res = await fetch("/api/exam-templates", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          unitIds: selectedUnits
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const newId = data.template.id;

      // 2. Generate questions if requested
      if (questionTypes.length > 0 && selectedUnits.length > 0) {
        setAiGenerating(true);
        const aiRes = await fetch(`/api/exam-templates/${newId}/generate-ai`, {
          method: "POST",
          body: JSON.stringify({
            unitIds: selectedUnits,
            questionTypes,
            countPerType: parseInt(countPerType)
          })
        });
        const aiData = await aiRes.json();
        setAiGenerating(false);
        if (!aiRes.ok && aiData.error) {
          alert(`המבחן נוצר אבל יצירת השאלות האוטומטית נכשלה: ${aiData.error}`);
        }
      }

      router.push(`/exams/${newId}`);
    } catch (err: any) {
      setError(err.message || "שגיאה ביצירת המבחן");
      setLoading(false);
      setAiGenerating(false);
    }
  };

  const isStepValid = () => {
    if (step === 1) return formData.title.trim().length > 0;
    if (step === 2) return selectedUnits.length > 0;
    return true;
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-border overflow-hidden">
      {/* Header / Steps tracker */}
      <div className="flex bg-slate-50 border-b border-border">
        {[1, 2, 3].map((num) => (
          <div 
            key={num} 
            className={`flex-1 py-4 text-center font-medium border-b-2 flex items-center justify-center gap-2 ${
              step === num ? "border-blue-600 text-blue-700 bg-white" : 
              step > num ? "border-green-500 text-green-600" : "border-transparent text-gray-400"
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              step === num ? "bg-blue-100" : step > num ? "bg-green-100" : "bg-gray-100"
            }`}>
              {step > num ? "✓" : num}
            </span>
            {num === 1 ? "הגדרות" : num === 2 ? "בחירת יחידות" : "אוטומציה"}
          </div>
        ))}
      </div>

      <div className="p-8">
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{error}</div>}

        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
            <div>
              <label className="block text-sm font-medium mb-1">כותרת *</label>
              <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border rounded-md p-2" placeholder="למשל: מבחן מסכם במדעים" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">סוג</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full border rounded-md p-2 bg-white">
                  <option value="exam">מבחן</option>
                  <option value="assignment">מטלה</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">שיוך לקורס</label>
                <select value={formData.courseId} onChange={e => setFormData({...formData, courseId: e.target.value})} className="w-full border rounded-md p-2 bg-white">
                  <option value="">-- כללי --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.fullNameOverride || c.fullNameMoodle}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">הגבלת זמן (בדקות)</label>
                <input type="number" value={formData.timeLimit} onChange={e => setFormData({...formData, timeLimit: e.target.value})} className="w-full border rounded-md p-2" placeholder="למשל: 90" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ציון עובר</label>
                <input type="number" value={formData.passingScore} onChange={e => setFormData({...formData, passingScore: e.target.value})} className="w-full border rounded-md p-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">תיאור (לתלמיד)</label>
              <input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border rounded-md p-2" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">הוראות מיוחדות</label>
              <textarea value={formData.instructions} onChange={e => setFormData({...formData, instructions: e.target.value})} rows={3} className="w-full border rounded-md p-2" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-medium">בחירת חומר לימוד למבחן</h3>
            <p className="text-sm text-gray-500">
              השאלות (גם לחוללן) יתבססו על יחידות הלימוד שתסמן כאן. מוצגות רק יחידות רלוונטיות לקורס הנבחר.
            </p>

            {Object.keys(tagGroups).length === 0 ? (
              <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md text-sm text-center">
                לא נמצאו יחידות לימוד עבור קורס זה. תוכל להמשיך, אבל לא תוכל להשתמש בחוללן האוטומטי.
              </div>
            ) : (
              <div className="space-y-6 max-h-80 overflow-y-auto pr-2">
                {Object.keys(tagGroups).map(tag => (
                  <div key={tag} className="border rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 font-semibold text-sm border-b">{tag}</div>
                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {tagGroups[tag].map((unit: any) => (
                        <label key={unit.id} className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition ${selectedUnits.includes(unit.id) ? 'bg-blue-50 border-blue-300' : 'hover:bg-slate-50'}`}>
                          <input 
                            type="checkbox" 
                            checked={selectedUnits.includes(unit.id)} 
                            onChange={() => toggleUnit(unit.id)} 
                            className="mt-1" 
                          />
                          <div>
                            <div className="font-medium text-sm line-clamp-1">{unit.title}</div>
                            <div className="text-xs text-gray-500">יחידה {unit.unitNumber}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-medium">חוללן AI מבוסס יחידות לימוד</h3>
            {selectedUnits.length === 0 ? (
              <div className="bg-orange-50 text-orange-800 p-4 rounded-md">
                לא בחרת יחידות לימוד בשלב הקודם. המבחן ייווצר ריק ותוכל להוסיף שאלות ידנית.
              </div>
            ) : (
              <div className="space-y-5 bg-slate-50 p-6 rounded-lg border">
                <p className="text-sm">
                  חוללן ה-AI יסרוק את {selectedUnits.length} יחידות הלימוד שבחרת וייצר שאלות באופן אוטומטי.
                </p>

                <div>
                  <label className="block text-sm font-medium mb-2">סוגי שאלות מבוקשים:</label>
                  <div className="flex gap-4">
                    {["multiple_choice", "open", "true_false"].map(type => (
                      <label key={type} className="flex items-center gap-2 text-sm bg-white px-3 py-2 border rounded-md cursor-pointer hover:bg-slate-50">
                        <input 
                          type="checkbox" 
                          checked={questionTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) setQuestionTypes([...questionTypes, type]);
                            else setQuestionTypes(questionTypes.filter(t => t !== type));
                          }}
                        />
                        {type === "multiple_choice" ? "אמריקאיות" : type === "open" ? "פתוחות" : "נכון/לא נכון"}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">כמות יעד לכל סוג שאלה:</label>
                  <input type="number" min="1" max="20" value={countPerType} onChange={e => setCountPerType(e.target.value)} className="w-32 border rounded-md p-2 text-center bg-white" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-50 border-t flex justify-between">
        <button 
          onClick={() => setStep(step - 1)} 
          disabled={step === 1 || loading}
          className="px-6 py-2 border rounded-md text-slate-600 font-medium hover:bg-slate-100 disabled:opacity-50"
        >
          חזור
        </button>
        
        {step < 3 ? (
          <button 
            onClick={() => setStep(step + 1)} 
            disabled={!isStepValid()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            המשך לשלב הבא
          </button>
        ) : (
          <button 
            onClick={handleCreate} 
            disabled={loading || aiGenerating}
            className="px-8 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 flex items-center gap-2 min-w-40 justify-center disabled:opacity-50"
          >
            {aiGenerating ? "מייצר בעזרת AI..." : loading ? "שומר..." : "סיים וצור מבחן"}
          </button>
        )}
      </div>
    </div>
  );
}

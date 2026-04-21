"use client";

import { useState } from "react";

export function ExamQuestionEditor({ 
  templateId, 
  studyUnits = [], 
  existingQuestion, 
  onClose, 
  onSave 
}: any) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    questionText: existingQuestion?.questionText || "",
    questionType: existingQuestion?.questionType || "open",
    points: existingQuestion?.points || "10",
    studyUnitId: existingQuestion?.studyUnitId || "",
    correctAnswer: existingQuestion?.correctAnswer || "",
  });

  const [options, setOptions] = useState<any[]>(
    existingQuestion?.options || [
      { id: Date.now().toString(), text: "", isCorrect: true },
      { id: (Date.now()+1).toString(), text: "", isCorrect: false }
    ]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const url = existingQuestion 
        ? `/api/exam-templates/${templateId}/questions/${existingQuestion.id}` 
        : `/api/exam-templates/${templateId}/questions`;
      const method = existingQuestion ? "PUT" : "POST";

      const payload = {
        ...formData,
        options: formData.questionType === "multiple_choice" ? options : null,
        correctAnswer: formData.questionType === "multiple_choice" ? null : formData.correctAnswer
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        alert(data.error || "שגיאה בשמירה");
      }
    } catch {
      alert("שגיאת תקשורת");
    } finally {
      setLoading(false);
    }
  };

  const updateOptionText = (id: string, text: string) => {
    setOptions(options.map(o => o.id === id ? { ...o, text } : o));
  };

  const setCorrectOption = (id: string) => {
    setOptions(options.map(o => ({ ...o, isCorrect: o.id === id })));
  };

  const addOption = () => {
    setOptions([...options, { id: Date.now().toString(), text: "", isCorrect: false }]);
  };

  const removeOption = (id: string) => {
    setOptions(options.filter(o => o.id !== id));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold">{existingQuestion ? "עריכת שאלה" : "שאלה חדשה"}</h4>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">טקסט השאלה *</label>
        <textarea 
          required 
          value={formData.questionText} 
          onChange={e => setFormData({...formData, questionText: e.target.value})}
          className="w-full border rounded p-2 text-sm bg-white" 
          rows={3} 
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">סוג שאלה</label>
          <select 
            value={formData.questionType} 
            onChange={e => setFormData({...formData, questionType: e.target.value})}
            className="w-full border rounded p-2 text-sm bg-white"
          >
            <option value="open">תשובה פתוחה</option>
            <option value="multiple_choice">אמריקאית (רב-בחירה)</option>
            <option value="true_false">נכון / לא נכון</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">ניקוד</label>
          <input 
            type="number" 
            required 
            value={formData.points} 
            onChange={e => setFormData({...formData, points: e.target.value})}
            className="w-full border rounded p-2 text-sm bg-white" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">שיוך ליחידת לימוד (רשות)</label>
          <select 
            value={formData.studyUnitId} 
            onChange={e => setFormData({...formData, studyUnitId: e.target.value})}
            className="w-full border rounded p-2 text-sm bg-white"
          >
            <option value="">-- כללי --</option>
            {studyUnits.map((u: any) => (
              <option key={u.id} value={u.id}>יחידה {u.unitNumber}: {u.title}</option>
            ))}
          </select>
        </div>
      </div>

      {formData.questionType === "multiple_choice" && (
        <div className="bg-white p-4 border rounded-md">
          <label className="block text-sm font-medium mb-2">אפשרויות תשובה</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-2">
                <input 
                  type="radio" 
                  name="correctAnswerOption" 
                  checked={opt.isCorrect} 
                  onChange={() => setCorrectOption(opt.id)}
                  title="סמן כתשובה נכונה"
                />
                <input 
                  type="text" 
                  required
                  value={opt.text} 
                  onChange={e => updateOptionText(opt.id, e.target.value)}
                  placeholder={`אפשרות ${i + 1}`}
                  className="flex-1 border rounded p-1.5 text-sm"
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(opt.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">✕</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addOption} className="mt-3 text-sm text-blue-600 hover:underline">
            + הוסף אפשרות מסיח
          </button>
        </div>
      )}

      {(formData.questionType === "open" || formData.questionType === "true_false") && (
        <div>
          <label className="block text-sm font-medium mb-1">
             תשובה נכונה צפויה (לבדוק / להצגה)
          </label>
          <textarea 
            value={formData.correctAnswer} 
            onChange={e => setFormData({...formData, correctAnswer: e.target.value})}
            className="w-full border rounded p-2 text-sm bg-white" 
            rows={2} 
            placeholder={formData.questionType === "true_false" ? "נכון / לא נכון" : "נקודות שהתלמיד חייב לציין..."}
          />
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 border rounded text-sm hover:bg-gray-100">ביטול</button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">שמור שאלה</button>
      </div>
    </form>
  );
}

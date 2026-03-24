"use client";

import { useState } from "react";
import { SignaturePad } from "@/components/terms/signature-pad";

const TERMS_TEXT = `תקנון הצטרפות לקורס:

מרכז "למען ילמדו" מתחייב להכין ולהגיש את התלמיד לבחינות באמצעות שיעורים, מצגות וחוברות לימוד. כל תכני הקורס נקבעים ע"י הנהלת המכון בלבד, עם זאת המכון שומר לעצמו את הזכות לשינויים בתכני השיעור, זהות המרצים, וזמני השיעורים באם יהיו אילוצים.

התלמיד מודע לכך שהצלחה במבחנים תלויה בהשתתפות בשיעורים, חזרה על החומר בבית, ומילוי שאלות החזרה ומטלות הכיתה. התשלום עבור החודש הראשון לא יוחזר אף אם לא החל התלמיד את הקורס.

תלמיד המצטרף לקורס מתחייב על כל משך הקורס, לאחר הכניסה לקורס אין אפשרות לפרוש כלל. במקרים חריגים ובאישור ההנהלה בלבד נוהל הביטול יהיה שאחרי השתתפות בשיעור אחד יהיה אפשרות לפרוש בניכוי תשלום עבור החודש הראשון ובהחזרת כל החומר הלימודי עד השיעור שני. בביטול לאחר השיעור השני יוחזר רק חצי מסכום דמי הקורס, לאחר השיעור השלישי לא תהיה כלל אפשרות לקבלת החזר.

מכון 'למען ילמדו', מעביר לתלמידים חומר בכתב או במייל או בכל אמצעי מדיה אחר. הזכויות של חומרי הלימודים שייכות ל'למען ילמדו' ונתונה הרשות לתלמידים לשימוש אישי בלבד, חובת התלמיד לשמור על הזכויות ולא להעביר חומרי לימוד לאף אחד. כמו"כ התלמיד מודע לכך שחלק מן הבחינות נעשות באמצעות גורם חיצוני המעניק את הציון ואת התעודה. קבלת התעודה מטעם המכון מותנית באישור ועדת הבחינות של המכון ע"פ הקריטריונים שנקבעו ע"י ועדת ההסמכה בלבד, ולאחר סיום התשלום על הקורס.

תנאי שימוש באתר "למען ילמדו":

תקנון השימוש באתר הנ"ל נכתב בלשון זכר אך האמור בו מתייחס לנשים וגברים כאחד.

קדימון

אתר "למען ילמדו" הוא אתר המשתמש כאתר ייצוגי עבור מכללתנו. השימוש באתר זה על כל תכניו והשירותים המוצעים בו עשויים להשתנות מעת לעת.

הנהלת האתר שומרת לעצמה הזכות לעדכן את תנאי השימוש מעת לעת וללא התראה מיוחדת.

קניין רוחני

האתר וכל המידע שבו לרבות עיצוב האתר, קוד האתר, קבצי מדיה וכל חומר אחר שייכים במלואם לאתר ומהווים קניין רוחני בלעדי של "למען ילמדו" ואין לעשות בהם שימוש ללא אישור כתוב מראש.`;

interface TermsPublicFormProps {
  token: string;
  studentId: string;
  firstName: string;
  email: string;
  courseName: string;
}

export default function TermsPublicForm({
  token,
  studentId,
  firstName,
  email,
  courseName,
}: TermsPublicFormProps) {
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!signature) {
      setError("נא לחתום על הטופס");
      return;
    }

    if (!agreed) {
      setError("עליך להסכים לתקנון");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/terms-acceptances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          studentId,
          firstName,
          email,
          courseName: courseName || "לא צוין",
          signature,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "שגיאה בשמירת התקנון");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בלתי צפויה");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 text-center">
        <svg className="mx-auto h-16 w-16 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">התקנון אושר בהצלחה!</h2>
        <p className="text-gray-600 mb-4">
          תודה {firstName}, עותק חתום נשלח למייל {email}.
        </p>
        <p className="text-gray-400 text-sm">ניתן לסגור את העמוד.</p>
      </div>
    );
  }

  const dateStr = new Date().toLocaleDateString("he-IL");

  return (
    <form onSubmit={handleSubmit}>
      <div className="p-6">
        {/* Scrollable Terms */}
        <div className="mb-6 max-h-96 overflow-y-auto bg-gray-50 p-4 rounded border border-gray-200 text-right leading-relaxed">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
            {TERMS_TEXT}
          </pre>
          <p className="mt-4 text-sm text-gray-700 font-semibold">
            אני, {firstName}, מודה שקראתי את התקנון בעיון והסכמתי לכל תנאיו בתאריך: {dateStr}
          </p>
        </div>

        {/* Signature Pad */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            חתימתך
          </label>
          <p className="text-xs text-gray-500 mb-3">
            חתום בעזרת העכבר או בתוכו
          </p>
          <SignaturePad onSignatureChange={setSignature} />
        </div>

        {/* Agree Checkbox */}
        <div className="flex items-start gap-3 mb-6">
          <input
            type="checkbox"
            id="agree"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1"
          />
          <label htmlFor="agree" className="text-sm text-gray-700 flex-1">
            אני מסכים/ה לתנאים וההתחייבויות המפורטות בתקנון זה
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
        >
          {loading ? "שומר..." : "אישור וחתימה"}
        </button>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 p-4 text-sm text-gray-600 border-t text-center">
        <p>שם: <strong>{firstName}</strong> | אימייל: <strong>{email}</strong>{courseName ? ` | קורס: ${courseName}` : ""}</p>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";

interface StudentMessageActionsProps {
  studentName: string;
  phone: string | null;
  email: string | null;
}

const MESSAGE_TEMPLATES = [
  {
    id: "missed-class",
    label: "לא נכנס לשיעור",
    text: "שלום {name},\nראינו שלא נכנסת לשיעור האחרון. חשוב מאוד לא לצבור פערים כדי שתוכל להמשיך להתקדם בלימודים.\nנשמח לעזור אם יש קושי כלשהו. אפשר לפנות אלינו בכל שאלה.",
  },
  {
    id: "exam-reminder",
    label: "תזכורת מבחן",
    text: "שלום {name},\nרצינו להזכיר שמתקרב מבחן בקורס. חשוב להתכונן היטב ולעבור על החומר.\nבהצלחה!",
  },
  {
    id: "materials-sent",
    label: "חומרים נשלחו",
    text: "שלום {name},\nרצינו לעדכן שהחומרים שלך נשלחו. אם לא תקבל אותם תוך מספר ימים, נא ליצור קשר.",
  },
  {
    id: "welcome",
    label: "ברוך הבא",
    text: "שלום {name},\nברוך הבא ללימודים! אנחנו שמחים שהצטרפת אלינו.\nאם תצטרך עזרה בהתחברות למערכת או בכל נושא אחר, אל תהסס לפנות אלינו.",
  },
  {
    id: "inactive",
    label: "חוסר פעילות",
    text: "שלום {name},\nשמנו לב שלא היית פעיל במערכת הלימודים לאחרונה. האם הכל בסדר?\nנשמח לסייע אם יש דבר שמעכב את הלימודים.",
  },
  {
    id: "custom",
    label: "הודעה חופשית",
    text: "",
  },
];

function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "972" + cleaned.slice(1);
  }
  if (!cleaned.startsWith("+") && !cleaned.startsWith("972")) {
    cleaned = "972" + cleaned;
  }
  cleaned = cleaned.replace("+", "");
  return cleaned;
}

export function StudentMessageActions({
  studentName,
  phone,
  email,
}: StudentMessageActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendMethod, setSendMethod] = useState<"whatsapp" | "email">("whatsapp");

  const selectTemplate = (templateId: string) => {
    const template = MESSAGE_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setMessageText(template.text.replace(/\{name\}/g, studentName));
    }
  };

  const sendMessage = () => {
    if (!messageText.trim()) return;

    if (sendMethod === "whatsapp" && phone) {
      const formattedPhone = formatPhoneForWhatsApp(phone);
      const encoded = encodeURIComponent(messageText);
      window.open(
        `https://wa.me/${formattedPhone}?text=${encoded}`,
        "_blank"
      );
    } else if (sendMethod === "email" && email) {
      const subject = encodeURIComponent("הודעה מניהול לימודים");
      const body = encodeURIComponent(messageText);
      window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
      >
        💬 שליחת הודעה
      </button>
    );
  }

  return (
    <div className="rounded-lg border-2 border-green-200 bg-green-50/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-green-900">שליחת הודעה ל{studentName}</h3>
        <button
          onClick={() => {
            setIsOpen(false);
            setSelectedTemplate(null);
            setMessageText("");
          }}
          className="text-gray-400 hover:text-gray-600 text-lg"
        >
          ✕
        </button>
      </div>

      {/* Send method toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setSendMethod("whatsapp")}
          disabled={!phone}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            sendMethod === "whatsapp"
              ? "bg-green-600 text-white"
              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          } ${!phone ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          📱 וואצאפ
        </button>
        <button
          onClick={() => setSendMethod("email")}
          disabled={!email}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            sendMethod === "email"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          } ${!email ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          ✉️ מייל
        </button>
        <span className="text-xs text-muted-foreground self-center mr-2">
          {sendMethod === "whatsapp"
            ? phone
              ? `📱 ${phone}`
              : "אין מספר טלפון"
            : email
            ? `✉️ ${email}`
            : "אין כתובת מייל"}
        </span>
      </div>

      {/* Template selection */}
      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">תבנית הודעה:</p>
        <div className="flex flex-wrap gap-2">
          {MESSAGE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => selectTemplate(template.id)}
              className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                selectedTemplate === template.id
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50"
              }`}
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message editor */}
      <div>
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="כתוב הודעה או בחר תבנית..."
          rows={5}
          className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-green-400 focus:ring-1 focus:ring-green-400 resize-y"
          dir="rtl"
        />
      </div>

      {/* Send button */}
      <div className="flex justify-end">
        <button
          onClick={sendMessage}
          disabled={
            !messageText.trim() ||
            (sendMethod === "whatsapp" && !phone) ||
            (sendMethod === "email" && !email)
          }
          className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sendMethod === "whatsapp" ? "📱 שלח בוואצאפ" : "✉️ שלח במייל"}
        </button>
      </div>
    </div>
  );
}

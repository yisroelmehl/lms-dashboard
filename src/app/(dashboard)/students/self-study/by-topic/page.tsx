"use client";

import { useEffect, useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

interface StudentWithActivity {
  selfStudyEnrollmentId: string;
  studentId: string;
  studentName: string;
  topic: string;
  status: string;
  nextExamDate: string | null;
  nextContactDate: string | null;
  examUnits: string | null;
  lastActivityDate: string | null;
  lastActivityType: string | null;
  lastLogin: string | null;
  daysInactive: number;
  contactLogsCount: number;
  completionPercentage: number;
}

interface TopicGroup {
  topic: string;
  students: StudentWithActivity[];
  studentCount: number;
  activeCount: number;
}

export default function SelfStudyTopicsPage() {
  const [topics, setTopics] = useState<TopicGroup[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTopics() {
      try {
        const res = await fetch("/api/students/self-study/by-topic");
        if (!res.ok) throw new Error("Failed to fetch topics");
        const data = await res.json();
        setTopics(data);
        // Expand first topic by default
        if (data.length > 0) {
          setExpandedTopics(new Set([data[0].topic]));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchTopics();
  }, []);

  const toggleTopic = (topic: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topic)) {
      newExpanded.delete(topic);
    } else {
      newExpanded.add(topic);
    }
    setExpandedTopics(newExpanded);
  };

  const getStatusBadge = (student: StudentWithActivity) => {
    if (student.daysInactive < 0) {
      return { label: "ללא נתונים", color: "bg-gray-100 text-gray-700" };
    }
    if (student.daysInactive <= 3) {
      return { label: "פעיל", color: "bg-green-100 text-green-700" };
    }
    if (student.daysInactive <= 7) {
      return { label: "לא פעיל השבוע", color: "bg-yellow-100 text-yellow-700" };
    }
    if (student.daysInactive <= 30) {
      return { label: `לא פעיל ${student.daysInactive} ימים`, color: "bg-orange-100 text-orange-700" };
    }
    return { label: `לא פעיל ${Math.floor(student.daysInactive / 7)} שבועות`, color: "bg-red-100 text-red-700" };
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("he-IL");
  };

  const getDaysUntilExam = (examDate: string | null) => {
    if (!examDate) return null;
    const date = new Date(examDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const days = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">טוען...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">תלמידים עצמאיים</h1>
          <p className="text-gray-600 mt-2">ניהול ממרכז - מפולח לפי נושאים</p>
        </div>

        <div className="space-y-4">
          {topics.map((topic) => {
            const isExpanded = expandedTopics.has(topic.topic);
            return (
              <div key={topic.topic} className="bg-white rounded-lg shadow">
                {/* Topic Header */}
                <button
                  onClick={() => toggleTopic(topic.topic)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {isExpanded ? (
                      <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="text-right flex-1">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {topic.topic}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {topic.studentCount} תלמידים • {topic.activeCount} פעילים
                      </p>
                    </div>
                  </div>
                </button>

                {/* Students Table */}
                {isExpanded && topic.students.length > 0 && (
                  <div className="border-t overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            שם תלמיד
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            סטטוס
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            כניסה אחרונה למודל
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            בדיקה אחרונה
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            תאריך בחינה
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            יום הקשר הקרוב
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            פעילויות
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {topic.students.map((student) => {
                          const statusInfo = getStatusBadge(student);
                          const daysToExam = getDaysUntilExam(student.nextExamDate);
                          return (
                            <tr key={student.selfStudyEnrollmentId} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <UserIcon className="w-4 h-4 text-blue-600" />
                                  </div>
                                  {student.studentName}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                                >
                                  {statusInfo.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <ClockIcon className="w-4 h-4 text-gray-400" />
                                  {formatDate(student.lastLogin)}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {formatDate(student.lastActivityDate)}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                {student.nextExamDate ? (
                                  <div className="flex items-center gap-1">
                                    <CalendarIcon className="w-4 h-4 text-purple-400" />
                                    <span>
                                      {formatDate(student.nextExamDate)}
                                      {daysToExam !== null && (
                                        <span
                                          className={`mr-1 text-xs ${
                                            daysToExam <= 7 ? "text-red-600 font-semibold" : "text-gray-500"
                                          }`}
                                        >
                                          ({daysToExam} ימים)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="w-4 h-4 text-green-400" />
                                  {formatDate(student.nextContactDate)}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-center text-gray-600">
                                {student.contactLogsCount}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {isExpanded && topic.students.length === 0 && (
                  <div className="px-6 py-4 text-center text-gray-500">
                    אין תלמידים בקטגוריה זו
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {topics.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            אין תלמידים עצמאיים
          </div>
        )}
      </div>
    </div>
  );
}

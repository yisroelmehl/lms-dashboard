"use client";

import { useState } from "react";

type Agent = { id: string; firstName: string; lastName: string };
type Course = { id: string; fullNameOverride: string | null; fullNameMoodle: string | null };
type Link = {
  id: string;
  finalAmount: number;
  numPayments: number;
  salesAgentId: string;
  courseId: string | null;
  salesAgent: Agent;
  course: Course | null;
  courseName: string | null;
  currency: string;
};

interface Props {
  links: Link[];
  monthName: string;
}

export function MonthlySalesDashboard({ links, monthName }: Props) {
  const [viewMode, setViewMode] = useState<"agents" | "courses">("agents");

  // Calculate metrics
  const calculateMetrics = (items: Link[]) => {
    let deals = 0;
    let totalCommitmentILS = 0;
    let totalCommitmentUSD = 0;
    let expected12mILS = 0;
    let expected12mUSD = 0;
    let expected16mILS = 0;
    let expected16mUSD = 0;

    items.forEach((link) => {
      deals++;
      const monthly = link.finalAmount / (link.numPayments || 1);
      const m12 = monthly * Math.min(link.numPayments || 1, 12);
      const m16 = monthly * Math.min(link.numPayments || 1, 16);

      if (link.currency === "USD") {
        totalCommitmentUSD += link.finalAmount;
        expected12mUSD += m12;
        expected16mUSD += m16;
      } else {
        totalCommitmentILS += link.finalAmount;
        expected12mILS += m12;
        expected16mILS += m16;
      }
    });

    return {
      deals,
      totalCommitmentILS,
      totalCommitmentUSD,
      expected12mILS,
      expected12mUSD,
      expected16mILS,
      expected16mUSD,
    };
  };

  const totalMetrics = calculateMetrics(links);

  // Group by agent
  const agentsMap = new Map<string, { agent: Agent; links: Link[] }>();
  // Group by course
  const coursesMap = new Map<string, { name: string; links: Link[] }>();

  links.forEach((link) => {
    // Agents
    if (!agentsMap.has(link.salesAgentId)) {
      agentsMap.set(link.salesAgentId, { agent: link.salesAgent, links: [] });
    }
    agentsMap.get(link.salesAgentId)!.links.push(link);

    // Courses
    const courseId = link.courseId || link.courseName || "general";
    const courseName = link.course?.fullNameOverride || link.course?.fullNameMoodle || link.courseName || "רישום כללי";
    
    if (!coursesMap.has(courseId)) {
      coursesMap.set(courseId, { name: courseName, links: [] });
    }
    coursesMap.get(courseId)!.links.push(link);
  });

  const agentsList = Array.from(agentsMap.values())
    .map((a) => ({ agent: a.agent, metrics: calculateMetrics(a.links) }))
    .sort((a, b) => b.metrics.totalCommitmentILS - a.metrics.totalCommitmentILS);

  const coursesList = Array.from(coursesMap.values())
    .map((c) => ({ name: c.name, metrics: calculateMetrics(c.links) }))
    .sort((a, b) => b.metrics.totalCommitmentILS - a.metrics.totalCommitmentILS);

  const formatILS = (num: number) => `₪${Math.round(num).toLocaleString("he-IL")}`;
  const formatUSD = (num: number) => num > 0 ? ` + $${Math.round(num).toLocaleString("he-IL")}` : "";

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">ביצועי החודש ({monthName})</h2>
          <p className="text-sm text-slate-500">נתוני מכירות, התחייבויות וצפי גבייה</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-md">
          <button
            onClick={() => setViewMode("agents")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === "agents" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            לפי אנשי מכירות
          </button>
          <button
            onClick={() => setViewMode("courses")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === "courses" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            לפי נושאי לימוד
          </button>
        </div>
      </div>

      {/* Total Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-sm text-blue-800 font-medium">עסקאות שנסגרו</p>
          <p className="text-3xl font-bold text-blue-900">{totalMetrics.deals}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
          <p className="text-sm text-emerald-800 font-medium">סך התחייבות (כולל)</p>
          <p className="text-2xl font-bold text-emerald-900" dir="ltr">
            {formatILS(totalMetrics.totalCommitmentILS)}{formatUSD(totalMetrics.totalCommitmentUSD)}
          </p>
          <p className="text-xs text-emerald-600 mt-1">סך כל העסקאות באשראי</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
          <p className="text-sm text-indigo-800 font-medium">צפי גבייה 12 חודשים</p>
          <p className="text-2xl font-bold text-indigo-900" dir="ltr">
            {formatILS(totalMetrics.expected12mILS)}{formatUSD(totalMetrics.expected12mUSD)}
          </p>
          <p className="text-xs text-indigo-600 mt-1">סכום שיגבה בשנה הקרובה</p>
        </div>
        <div className="bg-violet-50 border border-violet-100 rounded-lg p-4">
          <p className="text-sm text-violet-800 font-medium">צפי גבייה 16 חודשים</p>
          <p className="text-2xl font-bold text-violet-900" dir="ltr">
            {formatILS(totalMetrics.expected16mILS)}{formatUSD(totalMetrics.expected16mUSD)}
          </p>
          <p className="text-xs text-violet-600 mt-1">סכום שיגבה ב-16 החודשים הקרובים</p>
        </div>
      </div>

      {/* Detail Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold">{viewMode === "agents" ? "איש מכירות" : "קורס"}</th>
              <th className="px-4 py-3 font-semibold">עסקאות</th>
              <th className="px-4 py-3 font-semibold text-emerald-700">סך התחייבות</th>
              <th className="px-4 py-3 font-semibold text-indigo-700">צפי 12 חודשים</th>
              <th className="px-4 py-3 font-semibold text-violet-700">צפי 16 חודשים</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {viewMode === "agents" && agentsList.map((item) => (
              <tr key={item.agent.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{item.agent.firstName} {item.agent.lastName}</td>
                <td className="px-4 py-3">{item.metrics.deals}</td>
                <td className="px-4 py-3 font-medium text-emerald-800" dir="ltr">
                  {formatILS(item.metrics.totalCommitmentILS)}{formatUSD(item.metrics.totalCommitmentUSD)}
                </td>
                <td className="px-4 py-3 text-indigo-800" dir="ltr">
                  {formatILS(item.metrics.expected12mILS)}{formatUSD(item.metrics.expected12mUSD)}
                </td>
                <td className="px-4 py-3 text-violet-800" dir="ltr">
                  {formatILS(item.metrics.expected16mILS)}{formatUSD(item.metrics.expected16mUSD)}
                </td>
              </tr>
            ))}
            {viewMode === "courses" && coursesList.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3">{item.metrics.deals}</td>
                <td className="px-4 py-3 font-medium text-emerald-800" dir="ltr">
                  {formatILS(item.metrics.totalCommitmentILS)}{formatUSD(item.metrics.totalCommitmentUSD)}
                </td>
                <td className="px-4 py-3 text-indigo-800" dir="ltr">
                  {formatILS(item.metrics.expected12mILS)}{formatUSD(item.metrics.expected12mUSD)}
                </td>
                <td className="px-4 py-3 text-violet-800" dir="ltr">
                  {formatILS(item.metrics.expected16mILS)}{formatUSD(item.metrics.expected16mUSD)}
                </td>
              </tr>
            ))}
            {(viewMode === "agents" && agentsList.length === 0) || (viewMode === "courses" && coursesList.length === 0) ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  אין נתוני מכירות החודש.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
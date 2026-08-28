"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const NAVY = "#0A2351";
const GOLD = "#FBB03B";
const COLORS = [NAVY, GOLD, "#123A6B", "#1A4F8A", "#94A3B8", "#F59E0B", "#0EA5E9", "#EF4444"];

export function DashboardCharts({
  byStatus,
  bySource,
  byService,
  monthly,
  wonLost,
  employee,
}: {
  byStatus: Array<{ Name: string; Total: number }>;
  bySource: Array<{ Name: string; Total: number }>;
  byService: Array<{ Name: string; Total: number }>;
  monthly: Array<{ MonthLabel: string; Total: number }>;
  wonLost: Array<{ Name: string; Total: number }>;
  employee: Array<{ Name: string; Total: number; Won: number }>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Leads by Status">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byStatus}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="Total" fill={NAVY} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Leads by Source">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={bySource} dataKey="Total" nameKey="Name" outerRadius={90} label>
              {bySource.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Leads by Service">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byService.slice(0, 8)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="Name" width={88} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="Total" fill={GOLD} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Monthly Leads">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="MonthLabel" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="Total" stroke={NAVY} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Won vs Lost">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={wonLost}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="Total" radius={[6, 6, 0, 0]}>
              {wonLost.map((row) => (
                <Cell key={row.Name} fill={row.Name === "Won" ? "#059669" : "#e11d48"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Employee Performance">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={employee}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Total" name="Assigned" fill={NAVY} />
            <Bar dataKey="Won" fill={GOLD} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <Link href="/reports" className="text-sm font-semibold text-ifra-navy dark:text-ifra-gold xl:col-span-2">
        Open full reports →
      </Link>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ifra-card min-w-0 overflow-x-auto p-3 sm:p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

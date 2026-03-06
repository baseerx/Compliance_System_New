// src/pages/Dashboard/Home.tsx
import { useEffect, useState, useCallback } from "react";
import Insights from "../../components/common/Insights";
import api from "../../api/axios";
import PieChartOne from "../../components/charts/pie/PieChartOne";
import BarChartOne from "../../components/charts/bar/BarChartOne";

interface Letter {
  id: number;
  ref_no: string;
  subject: string;
  sender_name?: string;
  receiver_name?: string;
  category: string;
  status: string;
  priority: string;
  due_date: string | null;
  next_due_date?: string | null;
  created_at?: string;
  recurrence_type?: string;
  recurrence_value?: number;
  user_id?: number;
  created_by?: string;
}

export default function LetterDashboard() {
  const [letters, setLetters]       = useState<Letter[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const loadLetters = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const userStr = localStorage.getItem("user");
      let userIsSuperAdmin = false;

      if (userStr) {
        const user = JSON.parse(userStr);
        userIsSuperAdmin =
          user.superadmin === 1 ||
          user.superadmin === true ||
          user.is_superuser === true;
        setIsSuperAdmin(userIsSuperAdmin);
      }

      const endpoint = userIsSuperAdmin ? "/letters/all/" : "/letters/";
      const res = await api.get(endpoint);
      setLetters(res.data);
      setError(null);
    } catch (err: any) {
      let errorMsg = "Failed to fetch tasks";
      if (err.response) {
        errorMsg =
          err.response.data?.error ||
          err.response.data?.detail ||
          `Server Error: ${err.response.status}`;
      } else if (err.request) {
        errorMsg = "Network Error: Unable to connect to server.";
      } else {
        errorMsg = err.message || "Unknown error occurred";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadLetters(); }, [loadLetters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-6 py-4 rounded-lg max-w-lg shadow-lg">
          <div className="flex items-center mb-2">
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="font-bold text-lg">Error Loading Dashboard</p>
          </div>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => loadLetters()}
            className="bg-red-600 text-white px-5 py-2 rounded-md hover:bg-red-700 transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const draft      = letters.filter(l => l.status === "draft").length;
  const inProgress = letters.filter(l => l.status === "in-progress").length;
  const forwarded  = letters.filter(l => l.status === "forwarded").length;
  const completed  = letters.filter(l => l.status === "completed").length;
  const hasChartData = draft + inProgress + forwarded + completed > 0;

  const monthlyData = Array(12).fill(0);
  letters.forEach(l => {
    const dateStr = l.created_at || l.due_date;
    if (dateStr) monthlyData[new Date(dateStr).getMonth()]++;
  });
  const hasMonthlyData = monthlyData.some(v => v > 0);

  const now = new Date();

  const activeLetters = letters.filter(
    l => l.status !== "pending" && l.status !== "draft"
  );

  const upcomingDue = activeLetters.filter(
    l => l.due_date && new Date(l.due_date) > now && l.status !== "completed"
  ).length;
  const overdue = activeLetters.filter(
    l => l.due_date && new Date(l.due_date) < now && l.status !== "completed"
  ).length;
  const recurring = activeLetters.filter(l => {
    const hasType =
      l.recurrence_type &&
      l.recurrence_type !== "" &&
      l.recurrence_type !== "none" &&
      l.recurrence_type.toLowerCase() !== "null";
    const hasValue =
      l.recurrence_value !== null &&
      l.recurrence_value !== undefined &&
      l.recurrence_value > 0;
    return hasType && hasValue;
  }).length;


  const EmptyChart = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
      <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              {isSuperAdmin ? "Admin Dashboard" : "My Tasks"}
            </h1>
            <p className="text-gray-600">
              {isSuperAdmin
                ? `Overview of all ${letters.length} tasks in the system`
                : `You have ${letters.length} task${letters.length !== 1 ? "s" : ""} assigned to you`}
            </p>
          </div>

          <button
            onClick={() => loadLetters(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold
                       rounded-lg shadow hover:bg-indigo-700 active:scale-95 transition-all
                       disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

    
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Insights title="Upcoming Due"  value={upcomingDue} color="bg-gradient-to-br from-purple-400 to-purple-600" filterType="upcoming"  />
          <Insights title="Overdue"       value={overdue}     color="bg-gradient-to-br from-red-500 to-pink-600"     filterType="overdue"   />
          <Insights title="Recurring"     value={recurring}   color="bg-gradient-to-br from-blue-500 to-blue-600"    filterType="recurring" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="w-2 h-8 bg-indigo-600 rounded-full mr-3" />
              <h3 className="text-lg font-semibold text-gray-800">Task Status Distribution</h3>
            </div>
            {hasChartData ? (
              <PieChartOne
                draft={draft}
                inProgress={inProgress}
                forwarded={forwarded}
                completed={completed}
              />
            ) : (
              <EmptyChart message="No task records found" />
            )}
          </div>

          <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="w-2 h-8 bg-indigo-600 rounded-full mr-3" />
              <h3 className="text-lg font-semibold text-gray-800">Tasks Created Per Month</h3>
            </div>
            {hasMonthlyData ? (
              <BarChartOne monthlyData={monthlyData} />
            ) : (
              <EmptyChart message="No monthly data available" />
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{draft}</p>
              <p className="text-sm text-gray-600">Draft</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{inProgress}</p>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{forwarded}</p>
              <p className="text-sm text-gray-600">Forwarded</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{completed}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>
        </div>

        {letters.length === 0 && (
          <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 text-blue-800 px-6 py-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="font-medium">
                {isSuperAdmin
                  ? "No tasks in the system. Users can start creating tasks!"
                  : "No tasks found. Create your first task to get started!"}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
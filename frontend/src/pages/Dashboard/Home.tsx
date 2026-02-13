// src/pages/Dashboard/Home.tsx
import { useEffect, useState } from "react";
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
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const loadLetters = async () => {
      try {
        
        const userStr = localStorage.getItem("user");
        let userIsSuperAdmin = false;
        let userId = null;
        
        if (userStr) {
          const user = JSON.parse(userStr);
          userIsSuperAdmin = user.superadmin === 1 || user.superadmin === true;
          userId = user.id || user.user_id;
          setIsSuperAdmin(userIsSuperAdmin);
        }
        
        const res = await api.get("/letters");
        
        if (res.data.length > 0) {
        }
        
        let filteredLetters = res.data;
        
        
        setLetters(filteredLetters);
        setError(null);
      } catch (err: any) {
        
        let errorMsg = "Failed to fetch tasks";
        
        if (err.response) {
          errorMsg = err.response.data?.error || err.response.data?.detail || `Server Error: ${err.response.status}`;
        } else if (err.request) {
          errorMsg = "Network Error: Unable to connect to server.";
        } else {
          errorMsg = err.message || "Unknown error occurred";
        }
        
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    loadLetters();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
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
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-5 py-2 rounded-md hover:bg-red-700 transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const draft = letters.filter(l => l.status === "draft").length;
  const inProgress = letters.filter(l => l.status === "in-progress").length;
  const forwarded = letters.filter(l => l.status === "forwarded").length;
  const completed = letters.filter(l => l.status === "completed").length;

  const monthlyData = Array(12).fill(0);
  letters.forEach(l => {
    if (l.created_at) {
      const month = new Date(l.created_at).getMonth();
      monthlyData[month]++;
    } else if (l.due_date) {
      const month = new Date(l.due_date).getMonth();
      monthlyData[month]++;
    }
  });

  const now = new Date();
  const upcomingDue = letters.filter(l => l.due_date && new Date(l.due_date) > now && l.status !== "completed").length;
  const overdue = letters.filter(l => l.due_date && new Date(l.due_date) < now && l.status !== "completed").length;
  
 // In Home.tsx - Update the recurring filter logic (around line 87)

const recurring = letters.filter(l => {
  console.log(`🔍 Checking letter ${l.ref_no}:`, {
    recurrence_type: l.recurrence_type,
    recurrence_value: l.recurrence_value
  });
  
  const hasRecurrenceType = 
    l.recurrence_type && 
    l.recurrence_type !== "" && 
    l.recurrence_type !== "none" &&
    l.recurrence_type.toLowerCase() !== "null";
  
  const hasRecurrenceValue = 
    l.recurrence_value !== null && 
    l.recurrence_value !== undefined && 
    l.recurrence_value > 0;
  
  return hasRecurrenceType && hasRecurrenceValue;
}).length;

console.log("📊 Total recurring letters:", recurring);


  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {isSuperAdmin ? "Admin Dashboard" : " My Tasks"}
          </h1>
          <p className="text-gray-600">
            {isSuperAdmin 
              ? "Overview of all Tasks in the system" :""}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Insights 
            title="Upcoming Due" 
            value={upcomingDue} 
            color="bg-gradient-to-br from-purple-400 to-purple-600" 
            filterType="upcoming" 
          />
          <Insights 
            title="Overdue" 
            value={overdue} 
            color="bg-gradient-to-br from-red-500 to-pink-600" 
            filterType="overdue" 
          />
          <Insights 
            title="Recurring" 
            value={recurring} 
            color="bg-gradient-to-br from-blue-500 to-blue-600" 
            filterType="recurring" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="w-2 h-8 bg-indigo-600 rounded-full mr-3"></div>
              <h3 className="text-lg font-semibold text-gray-800">Task Status Distribution</h3>
            </div>
            <PieChartOne
              draft={draft}
              inProgress={inProgress}
              forwarded={forwarded}
              completed={completed}
            />
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="w-2 h-8 bg-indigo-600 rounded-full mr-3"></div>
              <h3 className="text-lg font-semibold text-gray-800">Tasks Created Per Month</h3>
            </div>
            <BarChartOne monthlyData={monthlyData} />
          </div>
        </div>

        {/* Quick Stats */}
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
              <p className="font-medium">No tasks found. Create your first tasks to get started!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
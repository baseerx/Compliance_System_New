import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { Typography, Box, Avatar } from "@mui/material";
import EditNoteIcon from "@mui/icons-material/EditNote";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import swal from "sweetalert2";
import api from "../../api/axios";
import DatePicker from "../../components/form/date-picker";


interface RecurrenceMetadata {
  day?: number;
  weekday?: number;
}

interface TaskFormData {
  ref_no: string;
  subject: string;
  sender: string;
  receiver: string;
  category: string;
  recurrence_type: string;
  recurrence_value: number;
  recurrence_metadata: RecurrenceMetadata;
  due_date: string;
  priority: string;
  assigned_to: string;
  assigned_head: string;
  file: File | null;
  file_description: string;
  current_date: string;
}

interface FormErrors {
  [key: string]: string;
}

interface Department {
  id: number;
  name: string;
}

interface AppUser {
  id: number;
  username: string;
  is_superuser: boolean;
}

const RECURRENCE_OPTIONS = [
  { value: "",              label: "No Recurrence" },
  { value: "daily",         label: "Days" },
  { value: "weekly",        label: "Weeks" },
  { value: "monthly",       label: "Months" },
  { value: "yearly",        label: "Years" },
  { value: "monthly_day",   label: "Specific Day of Each Month" },
  { value: "first_weekday", label: "First [Weekday] of Every Month" },
  { value: "quarterly",     label: "Quarterly (Every 3 Months)" },
];

const INTERVAL_TYPES = ["daily", "weekly", "monthly", "yearly"];

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png"];
const MAX_FILE_SIZE_MB   = 5;

const RECURRENCE_LIMITS: Record<string, number> = {
  daily:   365,
  weekly:  52,
  monthly: 24,
  yearly:  10,
};

const intervalLabel: Record<string, string> = {
  daily: "Days", weekly: "Weeks", monthly: "Months", yearly: "Years",
};


export default function TaskForm() {
  const today = new Date().toISOString().split("T")[0];
  const { user } = useAuth();

  const emptyForm: TaskFormData = {
    ref_no: "", subject: "", sender: "", receiver: "",
    category: "", recurrence_type: "", recurrence_value: 1,
    recurrence_metadata: {}, due_date: "", priority: "",
    assigned_to: "", assigned_head: "",
    file: null, file_description: "", current_date: today,
  };

  const [formData, setFormData]       = useState<TaskFormData>(emptyForm);
  const [errors, setErrors]           = useState<FormErrors>({});
  const [loading, setLoading]         = useState(false);
  const [nextDueDate, setNextDueDate] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories]   = useState<any[]>([]);
  const [users, setUsers]             = useState<AppUser[]>([]);

  useEffect(() => {
    api.get("/letters/categories/").then(r => setCategories(r.data)).catch(console.error);
    api.get("/departments/").then(r => setDepartments(r.data)).catch(console.error);
    api.get("/users/get_auth_users/").then(r => setUsers(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    setNextDueDate(previewNextDueDate());
  }, [formData.due_date, formData.recurrence_type, formData.recurrence_value, formData.recurrence_metadata]);


  const previewNextDueDate = (): string => {
    const { due_date, recurrence_type, recurrence_value, recurrence_metadata } = formData;
    if (!due_date || !recurrence_type) return "";
    const base = new Date(due_date + "T00:00:00");

    switch (recurrence_type) {

      case "daily": {
        const d = new Date(base);
        d.setDate(d.getDate() + (recurrence_value || 1));
        return d.toLocaleDateString("en-CA");
      }

      case "weekly": {
        const d = new Date(base);
        d.setDate(d.getDate() + (recurrence_value || 1) * 7);
        return d.toLocaleDateString("en-CA");
      }

      case "monthly": {
        const d = new Date(base);
        d.setMonth(d.getMonth() + (recurrence_value || 1));
        return d.toLocaleDateString("en-CA");
      }

      case "yearly": {
        const d = new Date(base);
        d.setFullYear(d.getFullYear() + (recurrence_value || 1));
        return d.toLocaleDateString("en-CA");
      }


      case "monthly_day": {
        const day = recurrence_metadata?.day;
        if (!day) return "";
        const d = new Date(base);
        d.setMonth(d.getMonth() + 1, day);
        return d.toLocaleDateString("en-CA");
      }

      case "first_weekday": {
        const weekday = recurrence_metadata?.weekday;
        if (weekday === undefined || weekday === null) return "";
        const d = new Date(base);
        d.setMonth(d.getMonth() + 1, 1);
   
        const jsWeekday = (weekday + 1) % 7; 
        const diff = (jsWeekday - d.getDay() + 7) % 7;
        d.setDate(1 + diff);
        return d.toLocaleDateString("en-CA");
      }

      case "quarterly": {
        const d = new Date(base);
        d.setMonth(d.getMonth() + 3);
        return d.toLocaleDateString("en-CA");
      }

      default: return "";
    }
  };


  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "recurrence_type") {
      setFormData(prev => ({
        ...prev,
        recurrence_type: value,
        recurrence_metadata: {},
        recurrence_value: 1,
      }));
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
      return;
    }

    if (name === "subject") {
      const clean = value.replace(/[\u{10000}-\u{10FFFF}]/gu, "");
      setFormData(prev => ({ ...prev, subject: clean }));
      if (errors.subject) setErrors(prev => ({ ...prev, subject: "" }));
      return;
    }

    const val: any = name === "recurrence_value" ? Number(value) : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleRefNoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/[\u{10000}-\u{10FFFF}]/gu, "").slice(0, 50);
    setFormData(prev => ({ ...prev, ref_no: clean }));
    if (errors.ref_no) setErrors(prev => ({ ...prev, ref_no: "" }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setErrors(prev => ({
          ...prev,
          file: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
        }));
        e.target.value = "";
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          file: `File size exceeds ${MAX_FILE_SIZE_MB} MB limit.`,
        }));
        e.target.value = "";
        return;
      }
    }
    setFormData(prev => ({ ...prev, file }));
    if (errors.file) setErrors(prev => ({ ...prev, file: "" }));
  };


  const validate = (): boolean => {
    const err: FormErrors = {};

    if (!formData.subject.trim()) {
      err.subject = "Subject is required";
    } else if (formData.subject.trim().length > 150) {
      err.subject = "Subject must be 150 characters or fewer";
    } else if (/[\u{10000}-\u{10FFFF}]/u.test(formData.subject)) {
      err.subject = "Emojis are not allowed in the subject";
    }

    if (!formData.sender)        err.sender        = "Sender is required";
    if (!formData.receiver)      err.receiver      = "Receiver is required";
    if (!formData.category)      err.category      = "Category is required";
    if (!formData.priority)      err.priority      = "Priority is required";
    if (!formData.assigned_to)   err.assigned_to   = "Assigned user is required";
    if (!formData.assigned_head) err.assigned_head = "Assigned head is required";

    if (!formData.due_date) {
      err.due_date = "Due date is required";
    } else if (formData.due_date < today) {
      err.due_date = "Due date cannot be earlier than today";
    }

    const limit = RECURRENCE_LIMITS[formData.recurrence_type];
    if (limit && formData.recurrence_value > limit) {
      err.recurrence_value = `Cannot exceed ${limit} for ${formData.recurrence_type} recurrence`;
    }

    if (formData.recurrence_type === "monthly_day" && !formData.recurrence_metadata?.day) {
      err.recurrence_day = "Please enter a day of the month";
    }
    if (formData.recurrence_type === "first_weekday" &&
      (formData.recurrence_metadata?.weekday === undefined || formData.recurrence_metadata?.weekday === null)) {
      err.recurrence_weekday = "Please select a weekday";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const form = new FormData();

    const { file, recurrence_metadata, ...rest } = formData;
    Object.entries(rest).forEach(([k, v]) => {
      if (v !== null && v !== undefined) form.append(k, String(v));
    });

    if (Object.keys(recurrence_metadata).length > 0) {
      form.append("recurrence_metadata", JSON.stringify(recurrence_metadata));
    }

    if (file instanceof File) form.append("file", file);
    if (user?.username)       form.append("username", user.username);

    try {
      const res = await api.post("/letters/create/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.status === 200 || res.status === 201) {
        swal.fire({
          icon: "success",
          title: "Task Submitted!",
          text: "The letter has been sent to the head for approval.",
          confirmButtonColor: "#1a237e",
        });
        setFormData(emptyForm);
        setNextDueDate("");
        setErrors({});
        const fi = document.querySelector<HTMLInputElement>('input[type="file"]');
        if (fi) fi.value = "";
      }
    } catch (error: any) {
      const responseData = error.response?.data;
      if (responseData && typeof responseData === "object" && !responseData.error) {
        const fieldErrors: FormErrors = {};
        Object.entries(responseData).forEach(([field, messages]) => {
          fieldErrors[field] = Array.isArray(messages)
            ? (messages as string[]).join(" ")
            : String(messages);
        });
        setErrors(fieldErrors);
        swal.fire("Validation Error", "Please fix the highlighted fields.", "warning");
      } else {
        const message =
          responseData?.error || responseData?.detail || error.message || "Something went wrong";
        swal.fire("Error", message, "error");
      }
    } finally {
      setLoading(false);
    }
  };


  const regularUsers  = users.filter(u => !u.is_superuser);
  const headUsers     = users.filter(u => u.is_superuser);
  const showInterval  = INTERVAL_TYPES.includes(formData.recurrence_type);


  const ic = (field: string) =>
    `w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
      errors[field]
        ? "border-red-300 bg-red-50"
        : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
    }`;

  const lc = "block mb-2 text-sm font-semibold text-gray-700";

  const ErrMsg = ({ field }: { field: string }) =>
    errors[field] ? (
      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {errors[field]}
      </p>
    ) : null;

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <PageMeta title="Create Task" description="Create a new letter task" />

      <div className="max-w-7xl mx-auto">
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "#1a237e", width: 56, height: 56 }}>
              <EditNoteIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1a237e" }}>
                Create New Task
              </Typography>
            </Box>
          </Box>
        </Box>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">

            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <div>
                <label className={lc}>Reference Number</label>
                <input
                  name="ref_no" type="text" className={ic("ref_no")}
                  value={formData.ref_no} onChange={handleRefNoChange}
                  placeholder="e.g. REF-2025/001" maxLength={50}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Optional · Max 50 characters · letters, numbers & symbols (- / . _ # ) allowed
                  {formData.ref_no ? ` · ${formData.ref_no.length}/50` : ""}
                </p>
                <ErrMsg field="ref_no" />
              </div>

              <div>
                <label className={lc}>Subject <span className="text-red-500">*</span></label>
                <input
                  name="subject" type="text" className={ic("subject")}
                  value={formData.subject} onChange={handleChange}
                  placeholder="Enter task subject" maxLength={150}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {formData.subject.length}/150 · commas & symbols allowed · no emojis
                </p>
                <ErrMsg field="subject" />
              </div>

              <div>
                <label className={lc}>Sender Department <span className="text-red-500">*</span></label>
                <select name="sender" value={formData.sender} onChange={handleChange} className={ic("sender")}>
                  <option value="">Select Sender Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <ErrMsg field="sender" />
              </div>

              <div>
                <label className={lc}>Receiver Department <span className="text-red-500">*</span></label>
                <select name="receiver" value={formData.receiver} onChange={handleChange} className={ic("receiver")}>
                  <option value="">Select Receiver Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <ErrMsg field="receiver" />
              </div>

              <div>
                <label className={lc}>Category <span className="text-red-500">*</span></label>
                <select name="category" className={ic("category")} value={formData.category} onChange={handleChange}>
                  <option value="">Select Category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <ErrMsg field="category" />
              </div>

              <div>
                <label className={lc}>Priority <span className="text-red-500">*</span></label>
                <select name="priority" className={ic("priority")} value={formData.priority} onChange={handleChange}>
                  <option value="">Select Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <ErrMsg field="priority" />
              </div>

              <div>
                <label className={lc}>Created By</label>
                <input
                  type="text" value={user?.username || ""} readOnly
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 cursor-not-allowed text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">Automatically set to your username</p>
              </div>

              <div>
                <label className={lc}>Current Date</label>
                <DatePicker
                  id="current_date" defaultDate={formData.current_date}
                  onChange={(dates) => setFormData(prev => ({
                    ...prev,
                    current_date: dates[0] ? dates[0].toLocaleDateString("en-CA") : prev.current_date,
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className={lc}>Assign To <span className="text-red-500">*</span></label>
                <select name="assigned_to" value={formData.assigned_to} onChange={handleChange} className={ic("assigned_to")}>
                  <option value="">Select User</option>
                  {regularUsers.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
                <ErrMsg field="assigned_to" />
                <p className="text-xs text-gray-400 mt-1">Staff member responsible for this letter</p>
              </div>

              <div>
                <label className={lc}>Assigned Head <span className="text-red-500">*</span></label>
                <select name="assigned_head" value={formData.assigned_head} onChange={handleChange} className={ic("assigned_head")}>
                  <option value="">Select Head</option>
                  {headUsers.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
                <ErrMsg field="assigned_head" />
                <p className="text-xs text-gray-400 mt-1">Head who will approve or reject this letter</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <div>
                <label className={lc}>Due Date <span className="text-red-500">*</span></label>
                <DatePicker
                  id="due_date" defaultDate={formData.due_date}
                  onChange={(dates) => {
                    const selected = dates[0] ? dates[0].toLocaleDateString("en-CA") : "";
                    setFormData(prev => ({ ...prev, due_date: selected }));
                    if (selected >= today && errors.due_date) {
                      setErrors(prev => ({ ...prev, due_date: "" }));
                    }
                  }}
                />
                <ErrMsg field="due_date" />
              </div>

              <div>
                <label className={lc}>Recurrence Pattern</label>
                <select
                  name="recurrence_type" className={ic("recurrence_type")}
                  value={formData.recurrence_type} onChange={handleChange}
                >
                  {RECURRENCE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {showInterval && (
                <div>
                  <label className={lc}>
                    Recurrence will happen after ({intervalLabel[formData.recurrence_type]})
                  </label>
                  <input
                    type="number" min="1"
                    max={RECURRENCE_LIMITS[formData.recurrence_type]}
                    name="recurrence_value"
                    className={ic("recurrence_value")}
                    value={formData.recurrence_value || ""}
                    placeholder="1"
                    onChange={(e) => {
                      const val = e.target.value === "" ? 1 : Math.max(1, Number(e.target.value));
                      setFormData(prev => ({ ...prev, recurrence_value: val }));
                      if (errors.recurrence_value) setErrors(prev => ({ ...prev, recurrence_value: "" }));
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Max {RECURRENCE_LIMITS[formData.recurrence_type]} {intervalLabel[formData.recurrence_type].toLowerCase()}
                  </p>
                  <ErrMsg field="recurrence_value" />
                </div>
              )}

             
              {formData.recurrence_type === "monthly_day" && (
                <div>
                  <label className={lc}>Day of Month <span className="text-red-500">*</span></label>
                  <input
                    type="number" min="1" max="28"
                    className={ic("recurrence_day")}
                    placeholder="e.g. 15"
                    value={formData.recurrence_metadata?.day || ""}
                    onChange={(e) => {
                      const val = Math.min(28, Math.max(1, Number(e.target.value)));
                      setFormData(prev => ({
                        ...prev,
                        recurrence_metadata: { ...prev.recurrence_metadata, day: val },
                      }));
                      if (errors.recurrence_day) setErrors(prev => ({ ...prev, recurrence_day: "" }));
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    1–28 only — safe for all months including February
                  </p>
                  <ErrMsg field="recurrence_day" />
                </div>
              )}

              {formData.recurrence_type === "first_weekday" && (
                <div>
                  <label className={lc}>Select Weekday <span className="text-red-500">*</span></label>
                  <select
                    className={ic("recurrence_weekday")}
                    value={formData.recurrence_metadata?.weekday ?? ""}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        recurrence_metadata: {
                          ...prev.recurrence_metadata,
                          weekday: Number(e.target.value),
                        },
                      }));
                      if (errors.recurrence_weekday) setErrors(prev => ({ ...prev, recurrence_weekday: "" }));
                    }}
                  >
                    <option value="">Select day</option>
                    <option value="0">Monday</option>
                    <option value="1">Tuesday</option>
                    <option value="2">Wednesday</option>
                    <option value="3">Thursday</option>
                    <option value="4">Friday</option>
                    <option value="5">Saturday</option>
                    <option value="6">Sunday</option>
                  </select>
                  <ErrMsg field="recurrence_weekday" />
                </div>
              )}

              
              {nextDueDate && (
                <div className="lg:col-span-2">
                  <label className={lc}>Next Due Date (Preview)</label>
                  <div className="relative">
                    <input
                      type="date" readOnly value={nextDueDate}
                      className="w-full px-4 py-3 border-2 border-green-300 rounded-xl bg-green-50 text-green-800 font-medium"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-1">Auto-calculated from your recurrence pattern</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className={lc}>Attach File</label>
                <input
                  type="file" name="file" onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                  className={`w-full px-4 py-3 border-2 border-dashed rounded-xl transition-colors cursor-pointer
                    file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100
                    ${errors.file ? "border-red-300 bg-red-50" : "border-gray-300 hover:border-blue-400"}`}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Allowed: PDF, DOCX, DOC, JPG, PNG · Max {MAX_FILE_SIZE_MB} MB
                </p>
                {formData.file && (
                  <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {formData.file.name}
                  </p>
                )}
                <ErrMsg field="file" />
              </div>

              <div>
                <label className={lc}>File Description</label>
                <textarea
                  name="file_description" rows={4} className={ic("file_description")}
                  value={formData.file_description} onChange={handleChange}
                  placeholder="Describe the uploaded file or task purpose... (optional)"
                />
                <ErrMsg field="file_description" />
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-amber-700">
                This letter will be submitted as <strong>Pending</strong> and sent to the assigned head for approval.
                It will only become active after the head approves it.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-[#1a237e] hover:bg-[#0d1642] text-white font-semibold rounded-xl
                  disabled:bg-gray-400 disabled:cursor-not-allowed
                  transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting…
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Submit for Approval
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
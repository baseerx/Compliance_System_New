import { useEffect, useState, ChangeEvent } from "react";
import { Typography, Box, Avatar, CircularProgress } from "@mui/material";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import Swal from "sweetalert2";
import DatePicker from "../../components/form/date-picker";

interface Department { id: number; name: string; }

interface AppUser {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  is_superuser: boolean;
}

interface LetterDetail {
  id: number;
  ref_no: string;
  subject: string;
  category: string;
  priority: string;
  due_date: string;
  status: string;
  department: number | string;
  assigned_to: number | null;
  assigned_head: number | null;
  recurrence_type: string | null;
  recurrence_value: number | null;
  recurrence_metadata: Record<string, any> | null;
  file: string | null;
  file_description: string | null;
}

interface FormErrors { [key: string]: string; }


const EDITABLE_STATUSES = ["pending", "rejected", "draft"];

const STATUS_LABELS: Record<string, { label: string; banner: "warn" | "info" | "draft" }> = {
  pending:  { label: "Pending Approval", banner: "info"  },
  rejected: { label: "Rejected",         banner: "warn"  },
  draft:    { label: "Draft",            banner: "draft" },
};

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

const RECURRENCE_LIMITS: Record<string, number> = {
  daily: 365, weekly: 52, monthly: 24, yearly: 10,
};

const intervalLabel: Record<string, string> = {
  daily: "Days", weekly: "Weeks", monthly: "Months", yearly: "Years",
};

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png"];
const MAX_FILE_SIZE_MB = 5;

const userName = (u: AppUser) =>
  u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username;


export default function UpdateTasks() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const today    = new Date().toISOString().split("T")[0];

  const [letter,      setLetter]      = useState<LetterDetail | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories,  setCategories]  = useState<any[]>([]);
  const [users,       setUsers]       = useState<AppUser[]>([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [fetchErr,    setFetchErr]    = useState("");
  const [errors,      setErrors]      = useState<FormErrors>({});
  const [nextDueDate, setNextDueDate] = useState("");

  const [refNo,        setRefNo]        = useState("");
  const [subject,      setSubject]      = useState("");
  const [department,   setDepartment]   = useState("");
  const [category,     setCategory]     = useState("");
  const [priority,     setPriority]     = useState("");
  const [dueDate,      setDueDate]      = useState("");
  const [assignedTo,   setAssignedTo]   = useState("");
  const [assignedHead, setAssignedHead] = useState("");
  const [recType,      setRecType]      = useState("");
  const [recValue,     setRecValue]     = useState(1);
  const [recDay,       setRecDay]       = useState(1);
  const [recWeekday,   setRecWeekday]   = useState<number | "">("");
  const [fileDesc,     setFileDesc]     = useState("");
  const [newFile,      setNewFile]      = useState<File | null>(null);


  useEffect(() => {
    const load = async () => {
      try {
        setPageLoading(true);
        setFetchErr("");

        const [letterRes, deptRes, catRes, usersRes] = await Promise.all([
          api.get(`/letters/${id}/`),
          api.get("/departments/"),
          api.get("/letters/categories/"),
          api.get("/users/get_auth_users/"),
        ]);

        const l: LetterDetail = letterRes.data;
        const status = (l.status || "").replace(/\s+/g, "-").toLowerCase();

        if (!EDITABLE_STATUSES.includes(status)) {
          await Swal.fire({
            icon: "warning",
            title: "Not Editable",
            text: `Tasks with status "${status}" cannot be edited.`,
          });
          navigate(-1);
          return;
        }

        setDepartments(deptRes.data);
        setCategories(catRes.data);
        setUsers(usersRes.data);
        setLetter({ ...l, status });

        
        setRefNo(l.ref_no              ?? "");
        setSubject(l.subject           ?? "");
        setDepartment(String(l.department ?? ""));
        setCategory(l.category         ?? "");
        setPriority(l.priority         ?? "");
        setDueDate(l.due_date          ?? "");
        setAssignedTo(l.assigned_to    != null ? String(l.assigned_to)   : "");
        setAssignedHead(l.assigned_head!= null ? String(l.assigned_head) : "");
        setRecType(l.recurrence_type   ?? "");
        setRecValue(l.recurrence_value ?? 1);
        setRecDay((l.recurrence_metadata as any)?.day     ?? 1);
        setRecWeekday((l.recurrence_metadata as any)?.weekday ?? "");
        setFileDesc(l.file_description ?? "");
      } catch (err: any) {
        setFetchErr(err.response?.data?.error || "Could not load task details.");
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!dueDate || !recType) { setNextDueDate(""); return; }
    const base = new Date(dueDate + "T00:00:00");

    const result = (() => {
      switch (recType) {
        case "daily": {
          const d = new Date(base); d.setDate(d.getDate() + recValue); return d.toLocaleDateString("en-CA");
        }
        case "weekly": {
          const d = new Date(base); d.setDate(d.getDate() + recValue * 7); return d.toLocaleDateString("en-CA");
        }
        case "monthly": {
          const d = new Date(base); d.setMonth(d.getMonth() + recValue); return d.toLocaleDateString("en-CA");
        }
        case "yearly": {
          const d = new Date(base); d.setFullYear(d.getFullYear() + recValue); return d.toLocaleDateString("en-CA");
        }
        case "monthly_day": {
          if (!recDay) return "";
          const d = new Date(base); d.setMonth(d.getMonth() + 1, recDay); return d.toLocaleDateString("en-CA");
        }
        case "first_weekday": {
          if (recWeekday === "") return "";
          const d = new Date(base); d.setMonth(d.getMonth() + 1, 1);
          const jsWd = (Number(recWeekday) + 1) % 7;
          d.setDate(1 + (jsWd - d.getDay() + 7) % 7);
          return d.toLocaleDateString("en-CA");
        }
        case "quarterly": {
          const d = new Date(base); d.setMonth(d.getMonth() + 3); return d.toLocaleDateString("en-CA");
        }
        default: return "";
      }
    })();

    setNextDueDate(result);
  }, [dueDate, recType, recValue, recDay, recWeekday]);


  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setErrors(p => ({ ...p, file: `Not allowed. Use: ${ALLOWED_EXTENSIONS.join(", ")}` }));
        e.target.value = "";
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setErrors(p => ({ ...p, file: `File exceeds ${MAX_FILE_SIZE_MB} MB.` }));
        e.target.value = "";
        return;
      }
    }
    setNewFile(file);
    setErrors(p => ({ ...p, file: "" }));
  };

  const validate = (): boolean => {
    const err: FormErrors = {};

    if (!subject.trim())          err.subject      = "Subject is required";
    else if (subject.trim().length > 150) err.subject = "Max 150 characters";
    else if (/[\u{10000}-\u{10FFFF}]/u.test(subject)) err.subject = "Emojis are not allowed";

    if (!department)              err.department   = "Department is required";
    if (!category)                err.category     = "Category is required";
    if (!priority)                err.priority     = "Priority is required";
    if (!assignedTo)              err.assignedTo   = "Assigned To is required";
    if (!assignedHead)            err.assignedHead = "Assigned Head is required";

    if (!dueDate)                 err.dueDate      = "Due date is required";
    else if (dueDate < today)     err.dueDate      = "Due date cannot be in the past";

    const limit = RECURRENCE_LIMITS[recType];
    if (limit && recValue > limit) err.recValue    = `Max ${limit} for ${recType}`;
    if (recType === "monthly_day" && !recDay) err.recDay = "Day of month is required";
    if (recType === "first_weekday" && recWeekday === "") err.recWeekday = "Weekday is required";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    let recMeta: Record<string, any> = {};
    if (recType === "monthly_day")   recMeta = { day: recDay };
    if (recType === "first_weekday") recMeta = { weekday: Number(recWeekday) };

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("ref_no",        refNo.trim());
      fd.append("subject",       subject.trim());
      fd.append("department",    department);
      fd.append("category",      category);
      fd.append("priority",      priority);
      fd.append("due_date",      dueDate);
      fd.append("assigned_to",   assignedTo);
      fd.append("assigned_head", assignedHead);

      if (recType) {
        fd.append("recurrence_type",     recType);
        fd.append("recurrence_value",    String(recValue));
        fd.append("recurrence_metadata", JSON.stringify(recMeta));
      } else {
        fd.append("recurrence_type",     "");
        fd.append("recurrence_metadata", "{}");
      }

      if (fileDesc.trim()) fd.append("file_description", fileDesc.trim());
      if (newFile)         fd.append("file", newFile);

      await api.patch(`/letters/${id}/update/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await Swal.fire({
        icon: "success",
        title: "Task Updated!",
        text: "Your changes have been saved and re-submitted for approval.",
        timer: 2200,
        showConfirmButton: false,
      });
      navigate("/task_view");
    } catch (err: any) {
      const errData = err.response?.data;
      if (errData && typeof errData === "object" && !errData.error) {
        const fieldErrors: FormErrors = {};
        Object.entries(errData).forEach(([field, messages]) => {
          fieldErrors[field] = Array.isArray(messages)
            ? (messages as string[]).join(" ")
            : String(messages);
        });
        setErrors(fieldErrors);
        Swal.fire("Validation Error", "Please fix the highlighted fields.", "warning");
      } else {
        Swal.fire("Error", errData?.error || "Could not save changes.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const regularUsers = users.filter(u => !u.is_superuser);
  const headUsers    = users.filter(u => u.is_superuser);
  const showInterval = INTERVAL_TYPES.includes(recType);

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


  if (pageLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <CircularProgress size={48} sx={{ color: "#1a237e" }} />
      </div>
    );
  }

  if (fetchErr || !letter) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4">
          {fetchErr || "Task not found."}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          ← Go Back
        </button>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[letter.status] ?? STATUS_LABELS["draft"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">

        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "#1a237e", width: 56, height: 56 }}>
              <EditNoteIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1a237e" }}>
                Update Task
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {letter.ref_no && <>{letter.ref_no} &middot; </>}
                <span className="font-medium capitalize">{statusInfo.label}</span>
              </Typography>
            </Box>
          </Box>
        </Box>

        {statusInfo.banner === "warn" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-6">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-amber-700">
              This task was <strong>rejected</strong>. Update the details below — saving will
              re-submit it for your head's approval.
            </p>
          </div>
        )}
        {statusInfo.banner === "info" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 mb-6">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-blue-700">
              This task is <strong>pending approval</strong>. You can update it before it is reviewed.
            </p>
          </div>
        )}
        {statusInfo.banner === "draft" && (
          <div className="bg-gray-50 border border-gray-300 rounded-xl p-4 flex items-start gap-3 mb-6">
            <svg className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            <p className="text-sm text-gray-600">
              This is a <strong>draft</strong>. Update any fields and save to submit for approval.
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-8">

          <div>
            <hr className="mb-5" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <div>
                <label className={lc}>Reference Number</label>
                <input
                  type="text"
                  className={ic("ref_no")}
                  value={refNo}
                  onChange={e => setRefNo(e.target.value.replace(/[\u{10000}-\u{10FFFF}]/gu, "").slice(0, 50))}
                  placeholder="e.g. REF-2025/001"
                  maxLength={50}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Optional · {refNo.length}/50
                </p>
              </div>

              <div>
                <label className={lc}>Subject <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={ic("subject")}
                  value={subject}
                  onChange={e => {
                    setSubject(e.target.value.replace(/[\u{10000}-\u{10FFFF}]/gu, ""));
                    setErrors(p => ({ ...p, subject: "" }));
                  }}
                  placeholder="Enter task subject"
                  maxLength={150}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {subject.length}/150 · commas & symbols allowed · no emojis
                </p>
                <ErrMsg field="subject" />
              </div>

              <div>
                <label className={lc}>Department <span className="text-red-500">*</span></label>
                <select
                  value={department}
                  onChange={e => { setDepartment(e.target.value); setErrors(p => ({ ...p, department: "" })); }}
                  className={ic("department")}
                >
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={String(d.id)}>{d.name}</option>
                  ))}
                </select>
                <ErrMsg field="department" />
              </div>

              <div>
                <label className={lc}>Category <span className="text-red-500">*</span></label>
                <select
                  value={category}
                  onChange={e => { setCategory(e.target.value); setErrors(p => ({ ...p, category: "" })); }}
                  className={ic("category")}
                >
                  <option value="">Select Category</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <ErrMsg field="category" />
              </div>

              <div>
                <label className={lc}>Priority <span className="text-red-500">*</span></label>
                <select
                  value={priority}
                  onChange={e => { setPriority(e.target.value); setErrors(p => ({ ...p, priority: "" })); }}
                  className={ic("priority")}
                >
                  <option value="">Select Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <ErrMsg field="priority" />
              </div>

            </div>
          </div>

          <div>
            <hr className="mb-5" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <div>
                <label className={lc}>Assign To <span className="text-red-500">*</span></label>
                <select
                  value={assignedTo}
                  onChange={e => { setAssignedTo(e.target.value); setErrors(p => ({ ...p, assignedTo: "" })); }}
                  className={ic("assignedTo")}
                >
                  <option value="">Select User</option>
                  {regularUsers.map(u => (
                    <option key={u.id} value={String(u.id)}>{userName(u)}</option>
                  ))}
                </select>
                <ErrMsg field="assignedTo" />
                <p className="text-xs text-gray-400 mt-1">Staff member responsible for this letter</p>
              </div>

              <div>
                <label className={lc}>Assigned Head <span className="text-red-500">*</span></label>
                <select
                  value={assignedHead}
                  onChange={e => { setAssignedHead(e.target.value); setErrors(p => ({ ...p, assignedHead: "" })); }}
                  className={ic("assignedHead")}
                >
                  <option value="">Select Head</option>
                  {headUsers.map(u => (
                    <option key={u.id} value={String(u.id)}>{userName(u)}</option>
                  ))}
                </select>
                <ErrMsg field="assignedHead" />
                <p className="text-xs text-gray-400 mt-1">Head who will approve or reject this letter</p>
              </div>

            </div>
          </div>

          <div>
            <hr className="mb-5" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <div>
                <label className={lc}>Due Date <span className="text-red-500">*</span></label>
                <DatePicker
                  id="due_date"
                  defaultDate={dueDate}
                  onChange={(dates) => {
                    const selected = dates[0] ? dates[0].toLocaleDateString("en-CA") : "";
                    setDueDate(selected);
                    if (selected >= today) setErrors(p => ({ ...p, dueDate: "" }));
                  }}
                />
                <ErrMsg field="dueDate" />
              </div>

              <div>
                <label className={lc}>Recurrence Pattern</label>
                <select
                  value={recType}
                  onChange={e => {
                    setRecType(e.target.value);
                    setRecValue(1);
                    setRecDay(1);
                    setRecWeekday("");
                  }}
                  className={ic("recType")}
                >
                  {RECURRENCE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {showInterval && (
                <div>
                  <label className={lc}>
                    Recurrence will happen after ({intervalLabel[recType]})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={RECURRENCE_LIMITS[recType]}
                    value={recValue || ""}
                    placeholder="1"
                    className={ic("recValue")}
                    onChange={e => {
                      const val = e.target.value === "" ? 1 : Math.max(1, Number(e.target.value));
                      setRecValue(val);
                      setErrors(p => ({ ...p, recValue: "" }));
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Max {RECURRENCE_LIMITS[recType]} {intervalLabel[recType].toLowerCase()}
                  </p>
                  <ErrMsg field="recValue" />
                </div>
              )}

              {recType === "monthly_day" && (
                <div>
                  <label className={lc}>Day of Month <span className="text-red-500">*</span></label>
                  <input
                    type="number" min={1} max={28}
                    value={recDay || ""}
                    placeholder="e.g. 15"
                    className={ic("recDay")}
                    onChange={e => {
                      setRecDay(Math.min(28, Math.max(1, Number(e.target.value))));
                      setErrors(p => ({ ...p, recDay: "" }));
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1">1–28 only — safe for all months including February</p>
                  <ErrMsg field="recDay" />
                </div>
              )}

              {recType === "first_weekday" && (
                <div>
                  <label className={lc}>Select Weekday <span className="text-red-500">*</span></label>
                  <select
                    value={recWeekday}
                    onChange={e => { setRecWeekday(Number(e.target.value)); setErrors(p => ({ ...p, recWeekday: "" })); }}
                    className={ic("recWeekday")}
                  >
                    <option value="">Select day</option>
                    {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((w, i) => (
                      <option key={i} value={i}>{w}</option>
                    ))}
                  </select>
                  <ErrMsg field="recWeekday" />
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
          </div>

          <div>

            <hr className="mb-5" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <div>
                {letter.file && !newFile && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
                    <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-blue-800">{letter.file.split("/").pop()}</p>
                      <p className="text-xs text-blue-500">Current attachment</p>
                    </div>
                  </div>
                )}

                <label className={lc}>{letter.file ? "Replace File" : "Attach File"}</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className={`w-full px-4 py-3 border-2 border-dashed rounded-xl transition-colors cursor-pointer
                    file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100
                    ${errors.file ? "border-red-300 bg-red-50" : "border-gray-300 hover:border-blue-400"}`}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Allowed: PDF, DOCX, DOC, JPG, PNG · Max {MAX_FILE_SIZE_MB} MB
                </p>
                {newFile && (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {newFile.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => setNewFile(null)}
                      className="text-xs text-red-500 hover:underline ml-3"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <ErrMsg field="file" />
              </div>

              <div>
                <label className={lc}>File Description</label>
                <textarea
                  rows={4}
                  value={fileDesc}
                  onChange={e => setFileDesc(e.target.value)}
                  placeholder="Describe the uploaded file or task purpose… (optional)"
                  maxLength={255}
                  className={ic("fileDesc")}
                />
                <p className="text-xs text-gray-400 mt-1">{fileDesc.length}/255</p>
              </div>

            </div>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-amber-700">
              Saving will submit this task as <strong>Pending</strong> and send it to the assigned
              head for approval. It will only become active after the head approves it.
            </p>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-200 flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={saving}
              className="px-6 py-3 border-2 border-gray-300 text-gray-600 font-semibold rounded-xl
                hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              ← Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-8 py-3 bg-[#1a237e] hover:bg-[#0d1642] text-white font-semibold rounded-xl
                disabled:bg-gray-400 disabled:cursor-not-allowed
                transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save & Re-submit
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { Typography, Box, Avatar } from "@mui/material";
import EditNoteIcon from '@mui/icons-material/EditNote';
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import swal from "sweetalert2";
import api from "../../api/axios";
import DatePicker from "../../components/form/date-picker";

interface DocumentFormData {
  ref_no: string;
  subject: string;
  sender: string;
  receiver: string;
  category: string;
  recurrence_type: string;
  recurrence_value: number;
  due_date: string;
  status: string;
  priority: string;
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
  description?: string;
}

export default function DocumentForm() {
  const today = new Date().toISOString().split("T")[0];
  const { user } = useAuth();

  const [formData, setFormData] = useState<DocumentFormData>({
    ref_no: "",
    subject: "",
    sender: "",
    receiver: "",
    category: "",
    recurrence_type: "",
    recurrence_value: 1,
    due_date: "",
    status: "",
    priority: "",
    file: null,
    file_description: "",
    current_date: today,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [nextDueDate, setNextDueDate] = useState<string>("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api
      .get("/letters/categories/")
      .then((res) => setCategories(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    api
      .get("/departments/")
      .then((res) => {
        setDepartments(res.data);
      })
      .catch((err) => {
        console.error("Failed to load departments:", err);
        swal.fire("Error", "Failed to load departments", "error");
      });
  }, []);

  useEffect(() => {
    setNextDueDate(calculateNextDueDate());
  }, [formData.due_date, formData.recurrence_type, formData.recurrence_value]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    let val: any = value;
    if (name === "sender" || name === "receiver" || name === "recurrence_value") {
      val = Number(value);
    }

    if (name === "recurrence_type") {
      setFormData({
        ...formData,
        recurrence_type: value,
        recurrence_value: formData.recurrence_value || 1,
      });

      if (errors[name]) setErrors({ ...errors, [name]: "" });
      return;
    }

    setFormData({
      ...formData,
      [name]: val,
    });

    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData({ ...formData, file });

    if (errors.file) {
      setErrors({ ...errors, file: "" });
    }
  };

  const validate = (): boolean => {
    const err: FormErrors = {};

    if (!formData.ref_no.trim()) err.ref_no = "Reference number is required";
    if (!formData.subject.trim()) err.subject = "Subject is required";
    if (!formData.sender) err.sender = "Sender is required";
    if (!formData.receiver) err.receiver = "Receiver is required";
    if (!formData.category) err.category = "Category is required";
    if (!formData.status) err.status = "Status is required";
    if (!formData.priority) err.priority = "Priority is required";
    if (!formData.due_date) err.due_date = "Due date is required";
    if (!formData.file_description.trim())
      err.file_description = "File description is required";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const calculateNextDueDate = (): string => {
    if (
      !formData.due_date ||
      !formData.recurrence_value ||
      !formData.recurrence_type
    ) {
      return "";
    }

    const date = new Date(formData.due_date);
    const value = Number(formData.recurrence_value);

    switch (formData.recurrence_type) {
      case "days":
        date.setDate(date.getDate() + value);
        break;
      case "weeks":
        date.setDate(date.getDate() + value * 7);
        break;
      case "months":
        date.setMonth(date.getMonth() + value);
        break;
      case "years":
        date.setFullYear(date.getFullYear() + value);
        break;
    }

    return date.toLocaleDateString("en-CA");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const form = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (key === "file" && value instanceof File) {
        form.append(key, value);
      } else if (value !== null && value !== undefined) {
        form.append(key, String(value));
      }
    });

    if (user?.username) {
      form.append("username", user.username);
    }

    try {
      const createRes = await api.post("/letters/create/", form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (createRes.status === 200 || createRes.status === 201) {
        swal.fire("Success", "Task created successfully!", "success");

        setFormData({
          ref_no: "",
          subject: "",
          sender: "",
          receiver: "",
          category: "",
          recurrence_type: "",
          recurrence_value: 1,
          due_date: "",
          status: "",
          priority: "",
          file: null,
          file_description: "",
          current_date: today,
        });

        setNextDueDate("");
        setErrors({});

        const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
        if (fileInput) fileInput.value = "";
      }
    } catch (error: any) {
      console.error("Error creating task:", error);
      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        "Something went wrong";
      swal.fire("Error", message, "error");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (fieldName: string) =>
    `w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
      errors[fieldName]
        ? "border-red-300 bg-red-50"
        : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
    }`;

  const labelClass = "block mb-2 text-sm font-semibold text-gray-700";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <PageMeta
        title="Create Task"
        description="this page will let us create task for sending"
      />

      <div className="max-w-7xl mx-auto">
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "#1a237e", width: 56, height: 56 }}>
              <EditNoteIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1a237e" }}>
                Create New Tasks
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>
                  Reference Number <span className="text-red-500">*</span>
                </label>
                <input
                  name="ref_no"
                  type="text"
                  className={inputClass("ref_no")}
                  value={formData.ref_no}
                  onChange={handleChange}
                  placeholder="Enter reference number"
                />
                {errors.ref_no && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.ref_no}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  name="subject"
                  type="text"
                  className={inputClass("subject")}
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Enter task subject"
                />
                {errors.subject && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.subject}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  Sender Department <span className="text-red-500">*</span>
                </label>
                <select
                  name="sender"
                  value={formData.sender}
                  onChange={handleChange}
                  className={inputClass("sender")}
                >
                  <option value="">Select Sender Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {errors.sender && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.sender}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  Receiver Department <span className="text-red-500">*</span>
                </label>
                <select
                  name="receiver"
                  value={formData.receiver}
                  onChange={handleChange}
                  className={inputClass("receiver")}
                >
                  <option value="">Select Receiver Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {errors.receiver && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.receiver}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  className={inputClass("category")}
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.category}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Created By</label>
                <div className="relative">
                  <input
                    type="text"
                    value={user?.username || ""}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 cursor-not-allowed"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Automatically set to your username
                </p>
              </div>

              <div>
                <label className={labelClass}>
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  className={inputClass("status")}
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="">Select Status</option>
                  <option value="draft">📝 Draft</option>
                  <option value="in-progress">⏳ In Progress</option>
                  <option value="forwarded">📤 Forwarded</option>
                  <option value="completed">✅ Completed</option>
                </select>
                {errors.status && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.status}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  name="priority"
                  className={inputClass("priority")}
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="">Select Priority</option>
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
                {errors.priority && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.priority}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Current Date</label>
                <DatePicker
                  id="current_date"
                  defaultDate={formData.current_date}
                  onChange={(selectedDates) =>
                    setFormData({
                      ...formData,
                      current_date: selectedDates[0]
                        ? selectedDates[0].toLocaleDateString("en-CA")
                        : formData.current_date,
                    })
                  }
                />
              </div>

              <div>
                <label className={labelClass}>
                  Due Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  id="due_date"
                  defaultDate={formData.due_date}
                  onChange={(selectedDates) => {
                    setFormData({
                      ...formData,
                      due_date: selectedDates[0]
                        ? selectedDates[0].toLocaleDateString("en-CA")
                        : formData.due_date,
                    });
                  }}
                />
                {errors.due_date && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.due_date}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Recurrence Type</label>
                <select
                  name="recurrence_type"
                  className={inputClass("recurrence_type")}
                  value={formData.recurrence_type}
                  onChange={handleChange}
                >
                  <option value=""> No Recurrence</option>
                  <option value="days"> Days</option>
                  <option value="weeks"> Weeks</option>
                  <option value="months"> Months</option>
                  <option value="years">Years</option>
                </select>
              </div>

              {formData.recurrence_type && formData.recurrence_type !== "none" && (
                <div>
                  <label className={labelClass}>Recurrence Value</label>
                  <input
                    type="number"
                    min="1"
                    name="recurrence_value"
                    className={inputClass("recurrence_value")}
                    value={formData.recurrence_value}
                    onChange={handleChange}
                    placeholder={`Every ${formData.recurrence_type}`}
                  />
                </div>
              )}

              {nextDueDate && (
                <div className="lg:col-span-2">
                  <label className={labelClass}>
                    Next Due Date (Auto-calculated)
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="next_due_date"
                      className="w-full px-4 py-3 border-2 border-green-300 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50"
                      value={nextDueDate}
                      readOnly
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>Attach File</label>
                <div className="relative">
                  <input
                    type="file"
                    name="file"
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    onChange={handleFileChange}
                  />
                  {formData.file && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      File selected: {formData.file.name}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  File Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="file_description"
                  className={inputClass("file_description")}
                  rows={4}
                  value={formData.file_description}
                  onChange={handleChange}
                  placeholder="Describe the uploaded file or task purpose..."
                />
                {errors.file_description && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.file_description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating Task...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Create Task
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
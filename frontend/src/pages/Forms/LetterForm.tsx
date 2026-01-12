import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import swal from "sweetalert2";
import api from "../../api/axios";
import DatePicker from "../../components/form/date-picker";

/* -------------------- Types -------------------- */

interface LetterFormData {
  ref_no: string;
  subject: string;
  sender: string;
  receiver: string;
  username?: string;
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

/* -------------------- Component -------------------- */

export default function LetterForm() {
  const today = new Date().toISOString().split("T")[0];
  const { user } = useAuth();

  const [formData, setFormData] = useState<LetterFormData>({
    ref_no: "",
    subject: "",
    sender: "",
    receiver: "",
    username: user?.username,
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

  /* -------------------- Effects -------------------- */

  useEffect(() => {
    setNextDueDate(calculateNextDueDate());
  }, [formData.due_date, formData.recurrence_type, formData.recurrence_value]);

  /* -------------------- Handlers -------------------- */

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "recurrence_type") {
      setFormData({
        ...formData,
        recurrence_type: value,
        recurrence_value: formData.recurrence_value || 1,
      });

      if (errors[name]) {
        setErrors({ ...errors, [name]: "" });
      }
      return;
    }

    setFormData({
      ...formData,
      [name]: name === "recurrence_value" ? Number(value) : value,
    });

    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData({ ...formData, file });

    if (errors.file) {
      setErrors({ ...errors, file: "" });
    }
  };

  /* -------------------- Validation -------------------- */

  const validate = (): boolean => {
    const err: FormErrors = {};

    if (!formData.ref_no.trim()) err.ref_no = "Reference number is required";
    if (!formData.subject.trim()) err.subject = "Subject is required";
    if (!formData.sender.trim()) err.sender = "Sender is required";
    if (!formData.receiver.trim()) err.receiver = "Receiver is required";
    if (!formData.category) err.category = "Category is required";
    if (!formData.status) err.status = "Status is required";
    if (!formData.priority) err.priority = "Priority is required";
    if (!formData.file_description.trim())
      err.file_description = "File description is required";

    setErrors(err);
    return Object.keys(err).length === 0;
  };


    
  /* -------------------- Recurrence -------------------- */

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

  /* -------------------- Submit -------------------- */

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const form = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (key === "file" && value instanceof File) {
        form.append(key, value);
      } else {
        form.append(key, String(value ?? ""));
      }
    });

    form.append(
      "recurrence_metadata",
      JSON.stringify({ next_due_date: nextDueDate })
    );

    try {
      const createRes = await api.post("/letters/create/", form);

      if (createRes.status !== 200 && createRes.status !== 201) {
        swal.fire("Error", "Failed to create letter", "error");
        return;
      }

      swal.fire("Success", "Letter created successfully!", "success");

      setFormData({
        ref_no: "",
        subject: "",
        sender: "",
        receiver: "",
        username: user?.username,
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

      const fileInput =
        document.querySelector<HTMLInputElement>('input[type="file"]');
      if (fileInput) fileInput.value = "";
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      swal.fire("Error", message, "error");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- JSX -------------------- */

  return (
    <div>
      <PageMeta
        title="Create Letter"
        description="this page will let us create Letter for sending"
      />
      <PageBreadcrumb pageTitle="Create New Letter" />

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 xl:grid-cols-2 mt-6"
      >
        {/* Left Column */}
        <div className="space-y-6">
          <div>
            <label className="block mb-1 ">Reference Number</label>
            <input
              name="ref_no"
              type="text"
              className="w-full p-3 border rounded-lg"
              value={formData.ref_no}
              onChange={handleChange}
            />
            {errors.ref_no && <p className="text-red-500">{errors.ref_no}</p>}
          </div>

          <div>
            <label className="block mb-1">Subject</label>
            <input
              name="subject"
              type="text"
              className="w-full p-3 border rounded-lg"
              value={formData.subject}
              onChange={handleChange}
            />
            {errors.subject && <p className="text-red-500">{errors.subject}</p>}
          </div>

          <div>
            <label className="block mb-1 ">Sender</label>
            <input
              name="sender"
              type="text"
              className="w-full p-3 border rounded-lg"
              value={formData.sender}
              onChange={handleChange}
            />
            {errors.sender && <p className="text-red-500">{errors.sender}</p>}
          </div>

          <div>
            <label className="block mb-1 ">Receiver</label>
            <input
              name="receiver"
              type="text"
              className="w-full p-3 border rounded-lg"
              value={formData.receiver}
              onChange={handleChange}
            />
            {errors.receiver && (
              <p className="text-red-500">{errors.receiver}</p>
            )}
          </div>

          <div>
            <label className="block mb-1 ">Category</label>
            <select
              name="category"
              className="w-full p-3 border rounded-lg"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="">Select Category</option>
              <option value="Notice">Notice</option>
              <option value="Memo">Memo</option>
              <option value="Circular">Circular</option>
              <option value="Letter">Letter</option>
            </select>
            {errors.category && (
              <p className="text-red-500">{errors.category}</p>
            )}
          </div>

          <div>
            <label className="block mb-1 ">Status</label>
            <select
              name="status"
              className="w-full p-3 border rounded-lg"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="">Select Status</option>
              <option value="draft">Draft</option>
              <option value="in-progress">In Progress</option>
              <option value="forwarded">Forwarded</option>
              <option value="completed">Completed</option>
            </select>
            {errors.status && <p className="text-red-500">{errors.status}</p>}
          </div>

          <div>
            <label className="block mb-1 ">Priority</label>
            <select
              name="priority"
              className="w-full p-3 border rounded-lg"
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="">Select Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            {errors.priority && (
              <p className="text-red-500">{errors.priority}</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block mb-1">Current Date</label>
            <DatePicker
              id="current_date"
              defaultDate={formData.current_date}
              onChange={(selectedDates) =>
                setFormData({
                  ...formData,
                  current_date:
                    selectedDates[0]?selectedDates[0].toLocaleDateString("en-CA") :
                    formData.current_date,
                })
              }
            />
          </div>

          <div>
            <label className="block mb-1 ">Due Date</label>
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
          </div>

          <div>
            <label className="block mb-1 ">Recurrence Type</label>
            <select
              name="recurrence_type"
              className="w-full p-3 border rounded-lg"
              value={formData.recurrence_type}
              onChange={handleChange}
            >
              <option value="">No Recurrence</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>

          {formData.recurrence_type && formData.recurrence_type !== "none" && (
            <div>
              <label className="block mb-1 ">Recurrence Value</label>
              <input
                type="number"
                min="1"
                name="recurrence_value"
                className="w-full p-3 border rounded-lg"
                value={formData.recurrence_value}
                onChange={handleChange}
                placeholder={`Every ${formData.recurrence_type}`}
              />
            </div>
          )}

          <div>
            <label className="block mb-1 ">Next Due Date</label>
            <input
              type="date"
              name="next_due_date"
              className="w-full p-3 border rounded-lg bg-green-100"
              value={nextDueDate}
              readOnly
            />
          </div>

          <div>
            <label className="block mb-1 ">File Upload</label>
            <input
              type="file"
              name="file"
              className="w-full p-3 border rounded-lg"
              onChange={handleFileChange}
            />
          </div>

          <div>
            <label className="block mb-1 ">File Description</label>
            <textarea
              name="file_description"
              className="w-full p-3 border rounded-lg"
              value={formData.file_description}
              onChange={handleChange}
            />
            {errors.file_description && (
              <p className="text-red-500">{errors.file_description}</p>
            )}
          </div>
        </div>

        <div className="col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {loading ? "Creating..." : "Create Letter"}
          </button>
        </div>
      </form>
    </div>
  );
}

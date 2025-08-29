import { useState, useEffect } from "react";
import moment from "moment";
import { ToastContainer, toast } from "react-toastify";
import { ColumnDef } from "@tanstack/react-table";

import axios from "../../api/axios";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import EnhancedDataTable from "../../components/tables/DataTables/DataTableOne";
import DatePicker from "../../components/form/date-picker";
import SearchableDropdown from "../../components/form/input/SearchableDropDown";
import TimePicker from "../../components/form/input/TimePicker";
import Button from "../../components/ui/button/Button";

// --- Types ---
type AttendanceFormData = {
  employeeId: number | null;
  date: string;
  checkInTime: string;
  checkOutTime: string;
};

type AttendanceRow = {
  id: number;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
};

const INITIAL_FORM: AttendanceFormData = {
  employeeId: null,
  date: moment().format("YYYY-MM-DD"),
  checkInTime: "",
  checkOutTime: "",
};

export default function NccUpdateAttendance() {
  const [formData, setFormData] = useState<AttendanceFormData>(INITIAL_FORM);
  const [attendanceData, setAttendanceData] = useState<AttendanceRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [employeeOptions, setEmployeeOptions] = useState<
    { value: number; label: string }[]
  >([]);

  // Table columns
  const columns: ColumnDef<AttendanceRow>[] = [
    { accessorKey: "employeeName", header: "Employee" },
    { accessorKey: "date", header: "Date" },
    { accessorKey: "checkIn", header: "Check-In" },
    { accessorKey: "checkOut", header: "Check-Out" },
  ];

  // --- Handlers ---
  const handleChange = (
    field: keyof AttendanceFormData,
    value: string | number | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = (): Record<string, string> => {
    const fieldErrors: Record<string, string> = {};
    if (!formData.employeeId) fieldErrors.employeeId = "Employee is required";
    if (!formData.date) fieldErrors.date = "Date is required";
    if (!formData.checkInTime)
      fieldErrors.checkInTime = "Check-in time is required";
    if (!formData.checkOutTime)
      fieldErrors.checkOutTime = "Check-out time is required";
    return fieldErrors;
  };

  const fetchAttendanceData = async () => {
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      toast.error("Please fix the errors in the form.");
      return;
    }

    try {
      const payload = {
        employeeId: formData.employeeId,
        date: formData.date,
        checkIn: formData.checkInTime,
        checkOut: formData.checkOutTime,
      };
     console.log(payload);
    //   await axios.post("/attendance/update/", payload);
    //   toast.success("Attendance updated successfully");

    //   // Refresh table
    //   const res = await axios.get("/attendance/history/");
    //   setAttendanceData(res.data);

    //   setFormData(INITIAL_FORM);
      setErrors({});
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong";
      toast.error(`Failed to update attendance: ${message}`);
    }
  };

  useEffect(() => {
    // Fetch employees & existing attendance
    const loadData = async () => {
      try {
          const response = await axios.get("users/ncc_employees/");
        //   axios.get("/attendance/history/");

        // Remove duplicates by hris_id, keep only the first occurrence
        const seen = new Set();
        const uniqueEmployees = response.data.matched.filter((emp: any) => {
          if (seen.has(emp.hris_id)) return false;
          seen.add(emp.hris_id);
          return true;
        });
        setEmployeeOptions(
          uniqueEmployees.map((emp: any) => ({
            value: emp.hris_id,
            label: emp.empname,
          }))
        );
      } catch (error) {
        toast.error("Failed to load data");
      }
    };
    loadData();
  }, []);

  // --- UI ---
  return (
    <>
      <PageMeta
        title="ISMO - Attendance History"
        description="ISMO Admin Dashboard - Attendance History"
      />
      <PageBreadcrumb pageTitle="Attendance History" />

      <div className="space-y-6">
        <ComponentCard title="Update Attendance for NCC">
          <ToastContainer position="bottom-right" />

          <div className="grid grid-cols-1 sm:grid-cols-2 mb-4 gap-4">
            <SearchableDropdown
              options={employeeOptions}
              placeholder="Select a user"
              label="Employees"
              id="employee-dropdown"
              value={
                employeeOptions.find(
                  (opt) => opt.value === formData.employeeId
                )?.value || ""
              }
              onChange={(value) => handleChange("employeeId", value ? Number(value) : null)}
              error={!!errors.employeeId}
              hint={errors.employeeId}
            />

            <DatePicker
              id="date-picker"
              defaultDate={formData.date}
              label="Date"
              placeholder="Select a date"
              onChange={(_, currentDateString) =>
                handleChange("date", currentDateString)
              }


            />

            <TimePicker
              id="checkin-picker"
              defaultDate={formData.checkInTime}
              label="Check-in time"
              placeholder="Select time"
              onChange={(_, currentTimeString) =>
                handleChange("checkInTime", currentTimeString)
              }
   
            />

            <TimePicker
              id="checkout-picker"
              defaultDate={formData.checkOutTime}
              label="Check-out time"
              placeholder="Select time"
              onChange={(_, currentTimeString) =>
                handleChange("checkOutTime", currentTimeString)
              }
            />

      

            <div className="flex justify-center items-center sm:col-span-2">
              <Button
                size="sm"
                className="w-1/3 mt-7"
                variant="primary"
                onClick={fetchAttendanceData}
              >
                Add
              </Button>
            </div>
          </div>

          <EnhancedDataTable<AttendanceRow>
            data={attendanceData}
            columns={columns}
            fromdate={formData.date}
            todate={formData.date}
          />
        </ComponentCard>
      </div>
    </>
  );
}

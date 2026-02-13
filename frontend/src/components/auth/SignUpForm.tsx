import { useState } from "react";
import { Link, useNavigate } from "react-router";
import moment from "moment";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import DatePicker from "../form/date-picker";
import { toast, ToastContainer } from "react-toastify";
import axios from "../../api/axios";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const [data, setData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    verify_password: "",
    username: "",
    erpid: "",
    date_joined: moment().format("YYYY-MM-DD"),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string | boolean) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors: Record<string, string> = {};

    if (!data.username) fieldErrors.username = "Username is required";
    if (!data.first_name) fieldErrors.first_name = "First name is required";
    if (!data.last_name) fieldErrors.last_name = "Last name is required";
    if (!data.email) fieldErrors.email = "Email is required";
    if (!data.password) fieldErrors.password = "Password is required";
    if (!data.verify_password)
      fieldErrors.verify_password = "Confirm your password";
    if (data.password !== data.verify_password)
      fieldErrors.verify_password = "Passwords do not match";
    if (!data.erpid) fieldErrors.erpid = "ERP ID is required";

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      toast.error("Please fix the errors in the form.");
      return;
    }

    try {
      const payload = {
        ...data,
        is_superuser: false,
      };
      await axios.post("/users/signup_user/", payload);
      toast.success("User registered successfully");

      setData({
        first_name: "",
        last_name: "",
        email: "",
        username: "",
        password: "",
        verify_password: "",
        erpid: "",
        date_joined: moment().format("YYYY-MM-DD"),
      });
      navigate("/dashboard");
      setErrors({});
    } catch (error: any) {
      toast.error(
        "Registration failed: " +
          (error?.response?.data?.error ||
            error?.response?.data?.message ||
            error.message)
      );
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen overflow-y-auto bg-gray-50">
      <ToastContainer position="bottom-right" />
      
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <div className="inline-block px-6 py-3 mb-6 bg-white rounded-lg shadow-md">
              <img
                src="/images/logo/ismo_logo.png"
                width={180}
                height={45}
                alt="Ismo Logo"
              />
            </div>
            
            <div className="space-y-2 text-left">
              <h1 className="text-3xl font-bold text-gray-900">
                Sign Up
              </h1>
              <p className="text-sm text-gray-600">
                Fill in the form to create your account
              </p>
            </div>
          </div>

          <div className="p-8 bg-white shadow-lg rounded-xl">
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="block text-sm font-semibold text-gray-700">
                    Username <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="Enter username"
                    value={data.username}
                    onChange={(e) => handleChange("username", e.target.value)}
                    error={!!errors.username}
                    hint={errors.username}
                    className="w-full px-4 py-3 text-gray-900 transition-all duration-200 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a237e] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="block text-sm font-semibold text-gray-700">
                      First Name <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      type="text"
                      value={data.first_name}
                      onChange={(e) => handleChange("first_name", e.target.value)}
                      error={!!errors.first_name}
                      hint={errors.first_name}
                      placeholder="Enter your first name"
                      className="w-full px-4 py-3 text-gray-900 transition-all duration-200 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a237e] focus:border-transparent"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="block text-sm font-semibold text-gray-700">
                      Last Name <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      type="text"
                      value={data.last_name}
                      onChange={(e) => handleChange("last_name", e.target.value)}
                      error={!!errors.last_name}
                      hint={errors.last_name}
                      placeholder="Enter your last name"
                      className="w-full px-4 py-3 text-gray-900 transition-all duration-200 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a237e] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="block text-sm font-semibold text-gray-700">
                    Email Address <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={data.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    error={!!errors.email}
                    hint={errors.email}
                    className="w-full px-4 py-3 text-gray-900 transition-all duration-200 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a237e] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="block text-sm font-semibold text-gray-700">
                      Password <span className="text-red-600">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Enter your password"
                        type={showPassword ? "text" : "password"}
                        value={data.password}
                        onChange={(e) => handleChange("password", e.target.value)}
                        error={!!errors.password}
                        hint={errors.password}
                        className="w-full px-4 py-3 pr-12 text-gray-900 transition-all duration-200 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a237e] focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute p-2 transition-colors -translate-y-1/2 rounded-md cursor-pointer right-3 top-1/2 hover:bg-gray-100"
                      >
                        {showPassword ? (
                          <EyeIcon className="w-5 h-5 fill-gray-500" />
                        ) : (
                          <EyeCloseIcon className="w-5 h-5 fill-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="block text-sm font-semibold text-gray-700">
                      Confirm Password <span className="text-red-600">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        value={data.verify_password}
                        onChange={(e) => handleChange("verify_password", e.target.value)}
                        error={!!errors.verify_password}
                        hint={errors.verify_password}
                        className="w-full px-4 py-3 pr-12 text-gray-900 transition-all duration-200 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a237e] focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute p-2 transition-colors -translate-y-1/2 rounded-md cursor-pointer right-3 top-1/2 hover:bg-gray-100"
                      >
                        {showConfirmPassword ? (
                          <EyeIcon className="w-5 h-5 fill-gray-500" />
                        ) : (
                          <EyeCloseIcon className="w-5 h-5 fill-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="block text-sm font-semibold text-gray-700">
                      ERP ID <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter ERP ID"
                      value={data.erpid}
                      onChange={(e) => handleChange("erpid", e.target.value)}
                      error={!!errors.erpid}
                      hint={errors.erpid}
                      className="w-full px-4 py-3 text-gray-900 transition-all duration-200 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a237e] focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="block text-sm font-semibold text-gray-700">
                      Date Joined
                    </Label>
                    <DatePicker
                      id="date-joined"
                      defaultDate={data.date_joined}
                      onChange={(dates, currentDateString) => {
                        handleChange("date_joined", currentDateString);
                      }}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full px-4 py-3 text-base font-semibold text-white transition-all duration-200 rounded-lg bg-[#1a237e] hover:bg-[#0d1642] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a237e] shadow-md"
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            </form>

            <div className="pt-6 mt-6 text-center border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/"
                  className="font-semibold text-[#1a237e] hover:text-[#0d1642] transition-colors"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
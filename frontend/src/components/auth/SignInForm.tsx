import { useState } from "react";
import { useNavigate } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import { ToastContainer, toast } from "react-toastify";
import axios from '../../api/axios';
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";

export default function SignInForm() {
    const [isChecked, setIsChecked] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const [user, setUser] = useState<{email: string, password: string}>({
        email: "",
        password: ""
    });
    const navigate = useNavigate();
    
    const handleSignIn = async(e: any) => {
        e.preventDefault();
        if (!user.email || !user.password) {
            toast.error("Please fill in all fields");
            return;
        }
        
        try {
            const response = await axios.post("/users/login/", user);
            if (response.status === 200) {
                const userData = response.data;
                toast.loading("Logging in...");
                login(userData);
                toast.success("Login successful");
                toast.dismiss();
                navigate("/dashboard");
            }
        }
        catch (error) {
          toast.error("Login failed. Please check your credentials.");
        }
    }

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-gray-50">
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
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
                Sign In
              </h1>
              <p className="text-sm text-gray-600">
                Enter your email and password to sign in
              </p>
            </div>
          </div>

          <div className="p-8 bg-white shadow-lg rounded-xl">
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-2">
                <Label className="block text-sm font-semibold text-gray-700">
                  Email <span className="text-red-600">*</span>
                </Label>
                <Input
                  type="email"
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  placeholder="info@gmail.com"
                  className="w-full px-4 py-3 text-gray-900 transition-all duration-200 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a237e] focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <Label className="block text-sm font-semibold text-gray-700">
                  Password <span className="text-red-600">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    onChange={(e) => setUser({ ...user, password: e.target.value })}
                    placeholder="Enter your password"
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

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={isChecked} 
                    onChange={setIsChecked}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Keep me logged in
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full px-4 py-3 text-base font-semibold text-white transition-all duration-200 rounded-lg bg-[#1a237e] hover:bg-[#0d1642] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a237e] shadow-md"
                >
                  Sign in
                </button>
              </div>
            </form>

            <div className="pt-6 mt-6 text-center border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="font-semibold text-[#1a237e] hover:text-[#0d1642] transition-colors"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </div>

        </div>
      </div>

      <ToastContainer position="bottom-right" />
    </div>
  );
}
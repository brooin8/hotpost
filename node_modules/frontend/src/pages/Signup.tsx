import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import useAuthStore from '../stores/authStore';

export default function Signup() {
  const navigate = useNavigate();
  const { signup, googleSignIn, ebaySignIn, isLoading } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogleSignUp = async () => {
    try {
      await googleSignIn();
      toast.success('Welcome to CrossList Pro! 🎉');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Google Sign-Up error:', error);
      // Check if user cancelled the sign-in
      if (error.message && (error.message.includes('cancelled') || error.message.includes('dismissed'))) {
        // Don't show error toast for cancelled sign-ins
        return;
      }
      toast.error(error.message || 'Failed to sign up with Google');
    }
  };

  const handleEbaySignUp = async () => {
    try {
      await ebaySignIn();
      // Note: The redirect will happen automatically, so we won't reach here
    } catch (error: any) {
      console.error('eBay Sign-Up error:', error);
      toast.error(error.message || 'Failed to sign up with eBay');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await signup(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName
      );
      toast.success('Welcome to CrossList Pro! 🎉');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create account');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg py-8 px-4 sm:px-6 lg:px-8 fallback-container">
      <div className="w-full max-w-md fallback-card">
        {/* Header */}
        <div className="text-center mb-6 animate-slide-in">
          <Link to="/login" className="inline-block mb-4">
            <h1 className="text-2xl font-bold gradient-text hover-lift">
              CrossList Pro
            </h1>
            <div className="h-1 w-16 bg-gradient-to-r from-primary-200 via-primary-300 to-primary-400 rounded-full mx-auto mt-1"></div>
          </Link>
          <h2 className="text-xl font-bold text-primary-700">
            Create Your Account
          </h2>
          <p className="mt-1 text-primary-500 text-sm">
            Start cross-listing like a pro in minutes
          </p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-glow-lg p-6 animate-scale-in">
          {/* Social Sign Up Buttons */}
          <div className="space-y-3 mb-6">
            {/* Google Sign Up */}
            <button
              onClick={handleGoogleSignUp}
              className="w-full flex items-center justify-center px-4 py-3 border border-primary-200 rounded-xl shadow-soft-shadow text-sm font-medium text-primary-600 bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-glow-sm transition-all duration-200 hover-lift group"
            >
              <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24">
                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </button>

            {/* eBay Sign Up */}
            <button
              onClick={handleEbaySignUp}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-primary-200 rounded-xl shadow-soft-shadow text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-glow-sm transition-all duration-200 hover-lift group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Sign up with eBay
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-primary-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gradient-to-r from-primary-50 to-white text-primary-500 rounded-full">
                or sign up with email
              </span>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-primary-700 mb-2">
                  First Name *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  className={`input-glow w-full px-4 py-3 border rounded-xl bg-white/60 backdrop-blur-sm text-primary-700 placeholder-primary-400 focus:outline-none transition-all duration-200 ${
                    errors.firstName ? 'border-red-300 ring-2 ring-red-200' : 'border-primary-200 focus:border-primary-300'
                  }`}
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => {
                    setFormData({ ...formData, firstName: e.target.value });
                    if (errors.firstName) setErrors(prev => ({ ...prev, firstName: '' }));
                  }}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600 animate-slide-in">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-primary-700 mb-2">
                  Last Name *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  className={`input-glow w-full px-4 py-3 border rounded-xl bg-white/60 backdrop-blur-sm text-primary-700 placeholder-primary-400 focus:outline-none transition-all duration-200 ${
                    errors.lastName ? 'border-red-300 ring-2 ring-red-200' : 'border-primary-200 focus:border-primary-300'
                  }`}
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => {
                    setFormData({ ...formData, lastName: e.target.value });
                    if (errors.lastName) setErrors(prev => ({ ...prev, lastName: '' }));
                  }}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600 animate-slide-in">{errors.lastName}</p>
                )}
              </div>
            </div>
            
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary-700 mb-2">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`input-glow w-full px-4 py-3 border rounded-xl bg-white/60 backdrop-blur-sm text-primary-700 placeholder-primary-400 focus:outline-none transition-all duration-200 ${
                  errors.email ? 'border-red-300 ring-2 ring-red-200' : 'border-primary-200 focus:border-primary-300'
                }`}
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 animate-slide-in">{errors.email}</p>
              )}
            </div>
            
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className={`input-glow w-full px-4 py-3 pr-12 border rounded-xl bg-white/60 backdrop-blur-sm text-primary-700 placeholder-primary-400 focus:outline-none transition-all duration-200 ${
                    errors.password ? 'border-red-300 ring-2 ring-red-200' : 'border-primary-200 focus:border-primary-300'
                  }`}
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                  }}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary-400 hover:text-primary-600 transition-colors duration-200"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 animate-slide-in">{errors.password}</p>
              )}
            </div>
            
            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary-700 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className={`input-glow w-full px-4 py-3 pr-12 border rounded-xl bg-white/60 backdrop-blur-sm text-primary-700 placeholder-primary-400 focus:outline-none transition-all duration-200 ${
                    errors.confirmPassword ? 'border-red-300 ring-2 ring-red-200' : 'border-primary-200 focus:border-primary-300'
                  }`}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary-400 hover:text-primary-600 transition-colors duration-200"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 animate-slide-in">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-primary-400 focus:ring-primary-300 border-primary-300 rounded transition-colors duration-200"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="terms" className="text-primary-600">
                  I agree to the{' '}
                  <a href="#" className="font-medium text-primary-700 hover:text-primary-800 underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="font-medium text-primary-700 hover:text-primary-800 underline">
                    Privacy Policy
                  </a>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="glow-button group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white shadow-lg hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Creating your account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>
          
          {/* Sign in link */}
          <div className="text-center pt-6">
            <p className="text-sm text-primary-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-200 hover-lift"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

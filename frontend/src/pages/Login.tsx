import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import useAuthStore from '../stores/authStore';

export default function Login() {
  const navigate = useNavigate();
  const { login, googleSignIn, ebaySignIn, isLoading } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');


  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleGoogleSignIn = async () => {
    try {
      await googleSignIn();
      toast.success('Welcome back! 🎉');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      // Check if user cancelled the sign-in
      if (error.message && (error.message.includes('cancelled') || error.message.includes('dismissed'))) {
        // Don't show error toast for cancelled sign-ins
        return;
      }
      toast.error(error.message || 'Failed to sign in with Google');
    }
  };

  const handleEbaySignIn = async () => {
    try {
      await ebaySignIn();
      // Note: The redirect will happen automatically, so we won't reach here
    } catch (error: any) {
      console.error('eBay Sign-In error:', error);
      toast.error(error.message || 'Failed to sign in with eBay');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isEmailValid = validateEmail(formData.email);
    const isPasswordValid = validatePassword(formData.password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      await login(formData.email, formData.password);
      if (formData.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
      toast.success('Welcome back! 🎉');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex gradient-bg">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
        <div className="max-w-lg text-center animate-slide-in">
          <div className="mb-8">
            <div className="relative inline-block">
              <div className="text-6xl font-bold gradient-text mb-4 animate-float">
                CrossList Pro
              </div>
              <div className="absolute -inset-4 bg-gradient-to-r from-primary-200/20 via-primary-300/20 to-primary-400/20 blur-xl rounded-full animate-pulse"></div>
            </div>
          </div>
          <h2 className="text-3xl font-semibold text-primary-600 mb-6">
            Streamline Your Marketplace Listings
          </h2>
          <p className="text-lg text-primary-500 mb-8 leading-relaxed">
            Manage your products across eBay, Etsy, and Whatnot with our powerful cross-listing platform. 
            Save time and boost your sales effortlessly.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-12">
            <div className="text-center p-4 rounded-2xl bg-white/30 backdrop-blur-sm border border-primary-200">
              <div className="text-2xl font-bold text-primary-600">3+</div>
              <div className="text-sm text-primary-500">Marketplaces</div>
            </div>
            <div className="text-center p-4 rounded-2xl bg-white/30 backdrop-blur-sm border border-primary-200">
              <div className="text-2xl font-bold text-primary-600">50%</div>
              <div className="text-sm text-primary-500">Time Saved</div>
            </div>
            <div className="text-center p-4 rounded-2xl bg-white/30 backdrop-blur-sm border border-primary-200">
              <div className="text-2xl font-bold text-primary-600">∞</div>
              <div className="text-sm text-primary-500">Listings</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
        <div className="max-w-sm w-full space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold gradient-text mb-2">
              CrossList Pro
            </h1>
            <div className="h-0.5 w-16 bg-gradient-to-r from-primary-200 to-primary-400 rounded-full mx-auto"></div>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-primary-700 lg:text-3xl">
              Welcome Back!
            </h2>
            <p className="mt-2 text-primary-500">
              Sign in to continue to your dashboard
            </p>
          </div>

          {/* Social Sign In Buttons */}
          <div className="space-y-3">
            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center px-4 py-3 border border-primary-200 rounded-xl shadow-soft-shadow text-sm font-medium text-primary-600 bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-glow-sm transition-all duration-200 hover-lift group"
            >
              <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24">
                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* eBay Sign In Button */}
            <button
              onClick={handleEbaySignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-primary-200 rounded-xl shadow-soft-shadow text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-glow-sm transition-all duration-200 hover-lift group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Continue with eBay
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-primary-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gradient-to-r from-primary-50 to-white text-primary-500 rounded-full">
                or continue with email
              </span>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`input-glow w-full px-4 py-3 border rounded-xl bg-white/60 backdrop-blur-sm text-primary-700 placeholder-primary-400 focus:outline-none transition-all duration-200 ${
                  emailError 
                    ? 'border-red-300 ring-2 ring-red-200' 
                    : 'border-primary-200 focus:border-primary-300'
                }`}
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (emailError) setEmailError('');
                }}
                onBlur={() => validateEmail(formData.email)}
              />
              {emailError && (
                <p className="mt-2 text-sm text-red-600 animate-slide-in">{emailError}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={`input-glow w-full px-4 py-3 pr-12 border rounded-xl bg-white/60 backdrop-blur-sm text-primary-700 placeholder-primary-400 focus:outline-none transition-all duration-200 ${
                    passwordError 
                      ? 'border-red-300 ring-2 ring-red-200' 
                      : 'border-primary-200 focus:border-primary-300'
                  }`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (passwordError) setPasswordError('');
                  }}
                  onBlur={() => validatePassword(formData.password)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary-400 hover:text-primary-600 transition-colors duration-200"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="mt-2 text-sm text-red-600 animate-slide-in">{passwordError}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-400 focus:ring-primary-300 border-primary-300 rounded transition-colors duration-200"
                  checked={formData.rememberMe}
                  onChange={(e) =>
                    setFormData({ ...formData, rememberMe: e.target.checked })
                  }
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-primary-600">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-primary-600 hover:text-primary-700 transition-colors duration-200 hover-lift"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.success('Password reset coming soon! 🔄');
                  }}
                >
                  Forgot your password?
                </a>
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
                    Signing you in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Sign up link */}
          <div className="text-center pt-6">
            <p className="text-sm text-primary-500">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-200 hover-lift"
              >
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


// @ts-nocheck
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setUser } from '@/store/slices/userSlice';
import { message } from 'antd';
import { POST } from '../../../Components/common/api';
import { RootState } from '@/store';
import login from "../../../assets/login.jpeg"
import logo from "../../../assets/logo.png"
const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.user);

  // Handle navigation after successful login
  useEffect(() => {
    console.log('useEffect triggered - isAuthenticated:', isAuthenticated, 'user:', user);
    if (isAuthenticated && user) {
      console.log('User authenticated, navigating...', user);
      const redirectPath = user.role === 'admin' ? '/dashboard' : '/paper';
      console.log('Redirecting to:', redirectPath);
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      const msg = 'Please enter username and password';
      message.error(msg);
      return;
    }

    try {
      setLoading(true);
      

      const response = await POST('/login', {
        username: username.trim(),
        password: password.trim()
      });

      // Check if status is 200 before proceeding
      if (response.status === 200) {
        // Extract user data from API response
        const userData = response.data.user;
        
        console.log('Login successful, user data:', userData);
        
        // Store user data in Redux
        dispatch(setUser(userData));
        
        message.success('Login successful!');
        
        // Navigation will be handled by useEffect when Redux state updates
      } else {
        throw new Error('Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error?.message || 'Login failed. Please try again.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // No social login handlers in this simplified flow

  const lightPrimaryColor = '#f8f9fa';

  return (
    <div
      className="pb-4 pl-4 pr-4 pt-7 flex items-center justify-center"
      style={{
        backgroundColor: lightPrimaryColor,
        minHeight: '100dvh',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl px-[70px] py-[40px] w-full max-w-5xl mx-auto">
        {/* Header removed as per request */}

        {/* Content: Image (left) + Form (right) */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
          {/* Image column */}
          <div className="w-full md:w-6/12 lg:w-6/12 flex flex-col justify-between h-56 md:h-72 lg:h-80">
            {/* Top-left brand: logo + text */}
            <div className="flex items-center gap-2">
              <img src={logo} alt="logo" className="h-6 w-6 md:h-7 md:w-7 object-contain" />
              <span className="text-sm md:text-base font-local2 font-bold text-gray-600">CHILD CRAFT</span>
            </div>
            {/* Bottom-aligned main image */}
            <div className="w-full flex justify-center items-end flex-1">
              <img
                src={login}
                alt="login"
                className="max-h-48 md:max-h-64 lg:max-h-72 w-auto object-contain"
              />
            </div>
          </div>

          {/* Form column */}
          <div className="w-full md:w-6/12 lg:w-6/12 md:min-h-[22rem]  flex items-center">
            <div className="w-full mx-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="-mb-2 text-center">
                <p className="text-base md:text-lg font-semibold font-local2 text-primary">Welcome back!</p>
              </div>
              {/* Username */}
              <div>
                <label
                  className="block text-sm font-medium mb-2 font-local2"
                  style={{ color: '#666666' }}
                >
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-3 py-2 border border-gray-300 font-local2 rounded-md focus:outline-none "
                  style={{ height: '44px' }}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  className="block text-sm font-medium mb-2 font-local2"
                  style={{ color: '#666666' }}
                >
                  Password
                </label>
                <div className="flex">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="flex-1 px-3 py-2 border border-gray-300 font-local2 rounded-l-md focus:outline-none "
                    style={{ height: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-3 py-2 border border-gray-300 rounded-r-md bg-gray-50 flex items-center justify-center"
                    style={{ borderLeft: 'none', height: '44px' }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 3C5 3 1.73 7.11 1 10c.73 2.89 4 7 9 7s8.27-4.11 9-7c-.73-2.89-4-7-9-7zm0 12a5 5 0 110-10 5 5 0 010 10z" />
                        <path d="M10 7a3 3 0 100 6 3 3 0 000-6z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.584 10.587A2 2 0 0112 10a2 2 0 012 2c0 .364-.097.704-.266.997M9.88 9.88A3 3 0 0012 9c1.657 0 3 1.343 3 3 0 .513-.129.997-.356 1.417m2.518 2.518C15.928 17.67 14.054 18.5 12 18.5 7 18.5 3.73 14.39 3 11.5c.219-.86.7-1.86 1.39-2.87m3.07-3.07C8.83 4.84 9.89 4.5 11 4.5c5 0 8.27 4.11 9 7-.26 1.02-.79 2.2-1.56 3.34" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className=" bg-gradient-to-br from-[#007575] to-[#339999] w-full h-11 rounded-md font-medium font-local2 text-white border-none shadow-md hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-gray-500 focus:outline-none focus:ring-0 focus:ring-offset-0 active:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </div>

            </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
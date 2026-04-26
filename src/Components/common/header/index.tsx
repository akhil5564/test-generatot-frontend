import React from "react";
import logo from "../../../assets/logo.png"
interface AdminHeaderProps {
  currentTime: Date;
  onMenuClick: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  onMenuClick,
}) => {
  return (
    <header className="bg-white shadow-lg border-b border-gray-100">
      <div className="flex items-center justify-between h-20 px-4 sm:px-6">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-500 hover:text-gray-700 mr-4"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>

        {/* Centered Logo and Text */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src={logo} 
              alt="Logo" 
              className="h-8 w-auto sm:h-10 md:h-12"
            />
            <div className="text-center">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-local2 text-gray-800">
                CHILD CRAFT
              </h1>
              <p className="text-xs sm:text-sm md:text-base font-local2 text-gray-600 -mt-1">
                HALLMARK PUBLISHERS (P) LTD
              </p>
            </div>
          </div>
        </div>

        {/* Spacer for mobile menu button alignment */}
        <div className="lg:hidden w-10"></div>
      </div>
    </header>
  );
};

export default AdminHeader;

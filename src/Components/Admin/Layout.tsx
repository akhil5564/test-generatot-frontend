// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { menuData } from "@/data/menuData";
import { logout } from "@/store/slices/userSlice";
import { RootState } from "@/store";
import AdminHeader from "../common/header";

import { MdSchool } from "react-icons/md";
import { MdLogout } from "react-icons/md";


const X = ({ className, style }: any) => (
  <span className={className} style={style}>
    ✗
  </span>
);

interface AdminLayoutProps {
  onLogout: () => void;
}

const AdminLayout = ({ onLogout }: AdminLayoutProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("Create Paper");
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.user);

  const primaryColor = "#007575";

  // Get menu items based on role
  const menuItems = user?.role ? menuData[user.role] : [];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update active menu based on current location
  React.useEffect(() => {
    
    const currentMenuItem = menuItems.find(
      (item) => item.path === location.pathname
    );
    if (currentMenuItem) {
      setActiveMenu(currentMenuItem.id);
    }
  }, [location.pathname]);

  const handleMenuClick = (item: any) => {
    setActiveMenu(item.id);
    setSidebarOpen(false);
    navigate(item.path);
  };

  const handleLogout = () => {
    dispatch(logout());
    onLogout();
    // Navigate to root path after logout
    navigate('/', { replace: true });
  };

  // Group menu items by sections
  const getMenuSections = () => {
    if (user?.role === 'admin') {
      return [
        {
          title: "Overview",
          items: menuItems.filter(item => ['dashboard'].includes(item.id))
        },  
        {
          title: "Question Management",
          items: menuItems.filter(item => ['Books', 'courses', 'Chapters', 'questions','Chapters',"listquestions","subjects"].includes(item.id))
        },  
        {
          title: "EXAMS",
          items: menuItems.filter(item => ['Create Paper', 'My Papers'].includes(item.id))
        },
        {
          title: "School Management",
          items: menuItems.filter(item => ['users'].includes(item.id))
        },
      ];
    } else if (user?.role === 'school') {
      return [
        {
          title: "EXAMS",
          items: menuItems.filter(item => ['Create Paper', 'My Papers'].includes(item.id))
        },
      ];
    }
    return [];
  };

  const menuSections = getMenuSections();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition duration-200 ease-in-out lg:static lg:inset-0 z-30`}
      >
        <div className="flex flex-col w-64 bg-white shadow-2xl h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-6 flex-shrink-0 border-b border-gray-200">
            <div className="flex items-center">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <MdSchool color="white" size={20} />
              </div>
              <div className="ml-3 flex flex-col">
                <span
                  className={`${user?.role === 'school' ? 'text-base' : 'text-lg'} font-bold font-local2 leading-tight`}
                  style={{ color: primaryColor }}
                  title={user?.role === 'admin' ? undefined : (user?.displayName || '')}
                >
                  {user?.role === 'admin'
                    ? 'ADMIN'
                    : (user?.displayName
                        ? (user.displayName.length > 30
                            ? `${user.displayName.slice(0,30)}...`
                            : user.displayName)
                        : '')}
                </span>
                {user?.role === 'admin' && (
                  <span
                    className="text-xs font-local2 leading-tight"
                    style={{ color: primaryColor }}
                  >
                    Dashboard
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Scrollable Menu Area */}
          <div 
            className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#e8eeff transparent'
            }}
          >
            <nav className="space-y-6">
              {menuSections.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  {/* Section Heading */}
                  <div className="px-3 mb-2">
                    <h3 className="text-[12px] text-gray-600 uppercase tracking-wider font-bold">
                      {section.title}
                    </h3>
                  </div>
                  
                  {/* Section Menu Items */}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeMenu === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleMenuClick(item)}
                          className={`flex items-center w-full px-4 py-3 text-left rounded-lg transition duration-200 text-sm ${
                            isActive ? "text-white" : "text-gray-500"
                          }`}
                          style={{
                            backgroundColor: isActive ? primaryColor : "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive)
                              e.currentTarget.style.backgroundColor = "#e8eeff";
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive)
                              e.currentTarget.style.backgroundColor = "transparent";
                          }}
                        >
                          <Icon className={`w-5 h-5 mr-3 flex-shrink-0 text-[#007575] ${
                            isActive ? "text-white" : "text-[#007575]"
                          }`} />
                  
                          <span className="truncate font-local2 ">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Fixed Logout Button */}
          <div className=" flex justify-center items-center p-3 border-t border-gray-200 flex-shrink-0">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 w-full px-4 py-3 text-gray-700 hover:bg-red-50 rounded-lg transition duration-200 text-sm"
            >
              {/* <LogOut className="w-5 h-5 mr-3 flex-shrink-0" /> */}
              <MdLogout size={20} color="red" />
              <span className="truncate text-red-500 font-local2 font-bold">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        <AdminHeader
          currentTime={currentTime}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Main Content Area */}
        <main className={`flex-1 overflow-auto px-3 py-2 bg-white `}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
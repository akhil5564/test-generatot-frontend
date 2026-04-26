# Views Folder Structure

This document explains the folder structure and how to add new pages to the application.

## Current Structure

```
src/Views/
├── Admin/
│   ├── Pre_Login/
│   │   ├── Adminlogin.tsx          # Login page
│   │   └── otp.tsx                 # OTP verification page
│   └── Post_Login/
│       ├── Dashboard/
│       │   ├── index.tsx           # Role-based dashboard router
│       │   ├── AdminDashboard.tsx  # Admin-specific dashboard
│       │   └── UserDashboard.tsx   # User-specific dashboard
│       ├── Paper/
│       │   └── index.tsx           # Paper creation page
│       ├── Profile/
│       │   └── index.tsx           # Profile completion page
│       └── Subscription/
│           └── index.tsx           # Subscription management page
```

## How to Add New Pages

### Step 1: Create the Page Component

Create a new folder in `src/Views/Admin/Post_Login/` for your page:

```
src/Views/Admin/Post_Login/YourPageName/
└── index.tsx
```

Example:
```typescript
import React from 'react';

const YourPageName = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-center" style={{ color: '#06014f' }}>
                Your Page Title
            </h1>
            <p className="text-center text-gray-600">
                Your page description.
            </p>
            {/* Your page content */}
        </div>
    );
};

export default YourPageName;
```

### Step 2: Add Route to MainRouter.tsx

1. Import your component:
```typescript
import YourPageName from "../Views/Admin/Post_Login/YourPageName";
```

2. Add the route inside the authenticated section:
```typescript
<Route path="/your-page" element={<YourPageName />} />
```

### Step 3: Add Menu Item to menuData.ts

Add your page to the appropriate role in `src/data/menuData.ts`:

```typescript
// For admin role
{ id: 'your-page', icon: YourIcon, label: 'Your Page', path: '/your-page' },

// For user role (if needed)
{ id: 'your-page', icon: YourIcon, label: 'Your Page', path: '/your-page' },
```

## Role-Based Access

- **Admin Role**: Has access to all features including "Create Subscription"
- **User Role**: Has limited access to basic features

## Layout Integration

All pages in `Post_Login` automatically get the AdminLayout with:
- Sidebar navigation
- Role-based menu items
- Header with logout functionality
- Responsive design

## Best Practices

1. **Naming**: Use PascalCase for component names and folder names
2. **Structure**: Always create a folder with `index.tsx` inside
3. **Styling**: Use the primary color `#06014f` for headings
4. **Responsive**: Use Tailwind CSS classes for responsive design
5. **Role-based**: Consider which role should have access to your page

## Example: Adding a New "Settings" Page

1. Create `src/Views/Admin/Post_Login/Settings/index.tsx`
2. Add route to `MainRouter.tsx`
3. Add menu item to `menuData.ts`
4. The page will automatically appear in the sidebar for the appropriate role

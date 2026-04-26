// import React from 'react';
// import { useNavigate } from 'react-router-dom';

// interface PageHeaderProps {
//   title: string;
//   backButton?: boolean;
//   goBack?: string | number;
//   children?: React.ReactNode;
// }

// const PageHeader: React.FC<PageHeaderProps> = ({ title, backButton = false, goBack = -1, children }) => {
//   const navigation = useNavigate();

//   const handleBackClick = () => {
//     if (typeof goBack === 'number') {
//       navigation(goBack);
//     } else {
//       navigation(goBack);
//     }
//   };

//   return (
//     <>
//       <div className="w-full flex flex-col gap-3 border-b p-4 sm:p-0 sm:h-[50px] sm:flex-row sm:items-center sm:justify-between sm:pr-6 sm:gap-0">
//         <div className="flex gap-4 items-start sm:items-center">
//           {backButton && (
//             <div
//               onClick={handleBackClick}
//               className='h-min w-min p-2 border border-gray-200'
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
//                 <path fill-rule="evenodd" d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z" clip-rule="evenodd" />
//               </svg>


//             </div>
//           )}
//             <div>
//             <div className='font-semibold font-local2'>{title}</div>
//             <div className='text-[13px] font-local2'>Dashboard / {title}</div>
//             </div>
          


//         </div>

//            <div className='flex items-center gap-4 flex-wrap sm:flex-nowrap'>
//             {children}
//            </div>
//       </div>
//     </>
//   );
// };

// export default PageHeader;
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  backButton?: boolean;
  goBack?: string | number;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, backButton = false, goBack = -1, children }) => {
  const navigation = useNavigate();

  const handleBackClick = () => {
    if (typeof goBack === 'number') {
      navigation(goBack);
    } else {
      navigation(goBack);
    }
  };

  // Check if there are many children
  const childrenArray = React.Children.toArray(children);
  const hasMultipleChildren = childrenArray.length > 5;

  return (
    <>
      <div className="w-full border-b">
        {/* Main header section */}
        <div className="flex flex-col gap-3 p-4 sm:p-0 sm:h-[50px] sm:flex-row sm:items-center sm:justify-between sm:pr-6 sm:gap-0">
          <div className="flex gap-4 items-start sm:items-center">
            {backButton && (
              <div
                onClick={handleBackClick}
                className='h-min w-min p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 rounded'
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                  <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <div>
              <div className='font-semibold font-local2'>{title}</div>
              <div className='text-[13px] font-local2'>Dashboard / {title}</div>
            </div>
          </div>

          {/* Children container - responsive handling */}
          {children && !hasMultipleChildren && (
            <div className='flex items-center gap-4 flex-wrap sm:flex-nowrap'>
              {children}
            </div>
          )}
        </div>

        {/* Separate row for multiple children on large screens */}
        {children && hasMultipleChildren && (
          <div className="px-4 pb-4 sm:px-6 sm:pb-3">
            <div className='flex items-center gap-3 flex-wrap justify-start lg:justify-end'>
              {children}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PageHeader;

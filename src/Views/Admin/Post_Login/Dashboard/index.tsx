// @ts-nocheck
import { useNavigate } from "react-router-dom";
import { Card } from "antd";
import teachers from "../../../../assets/My institute.png"
import myquestions from "../../../../assets/myquestions.png"
import evaluate from "../../../../assets/Evaluate.png"
import blueprint from "../../../../assets/Blueprints.png"
import createschool from "../../../../assets/Teachers.png"
const examBoxes = [
  {
    title: "Create School",
    color: "bg-gradient-to-br from-teal-600/60 to-teal-700/60",
    image: createschool,
    path: "/schools/new",
  },
  
  {
    title: "Schools",
    color: "bg-gradient-to-br from-[#e6c9a8]/60 to-[#c49a6c]/60",
    image: teachers,
    path: "/schools",
  },
  {
    title: "Add Questions",
    color: "bg-gradient-to-br from-yellow-400/60 to-yellow-500/60",
    image: myquestions,
    path: "/questionform/new",
  },
  {
    title: "Create Paper",
    color: "bg-gradient-to-br from-red-400/60 to-red-500/60",
    image: evaluate,
    path: "/paper",
  },
  {
    title: "My Papers",
    color: "bg-gradient-to-br from-violet-300/60 to-purple-400/60",
    image: blueprint,
    path: "/mypapers",
  },
  
];

const UserDashboard = () => {
  const navigate = useNavigate();

  const handleBoxClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="h-min p-3 pt-4  ">
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="text-gray-700">
          <h2 className="text-xl font-semibold mb-2 font-local2">
            Hello, Admin👋
          </h2>
        </div>
        <p className="text-sm font-semibold text-gray-600 font-local2">
          Welcome back to Admin Dashboard
        </p>
      </div>

      {/* Actions Card */}
      <Card
        title="Actions"
        headStyle={{ backgroundColor: "#fafafa", color: "#000" }}
        className="mb-8 shadow-lg border-0 font-local2"
        bodyStyle={{ padding: "2rem" }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
          {examBoxes.map((exam, index) => (
            <div key={index} className="flex flex-col items-center mb-4">
              <div
                onClick={() => handleBoxClick(exam.path)}
                className={`${exam.color} rounded-xl p-3 cursor-pointer hover:scale-105 transform transition-all duration-200 shadow-md hover:shadow-lg w-28 h-28 flex items-center justify-center mb-2`}
              >
                <img
                  src={exam.image}
                  alt={exam.title}
                  className="w-20 h-20 object-contain"
                  draggable="false"
                  onContextMenu={(e) => e.preventDefault()}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                />
              </div>
              <h3 className="text-gray-700 font-bold text-base text-center leading-tight font-local2 mt-2">
                {exam.title}
              </h3>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const Dashboard = () => {
  return <UserDashboard />;
};

export default Dashboard;

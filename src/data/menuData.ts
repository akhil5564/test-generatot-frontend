import {BiHome } from "react-icons/bi";
import { FiFilePlus } from "react-icons/fi";
import { LuSchool } from "react-icons/lu";
import { AiOutlineProfile, AiOutlineRead, AiOutlineFileText } from "react-icons/ai";
import { VscGitPullRequestGoToChanges } from "react-icons/vsc";
import { IoIosList } from "react-icons/io";
import { LuBook } from "react-icons/lu";
export const menuData = {  admin: [
  { id: "dashboard", icon: BiHome, label: "Dashboard", path: "/dashboard" },
    { id: "users", icon: LuSchool, label: "Schools", path: "/schools" },
    { id: "subjects", icon: LuBook, label: "Subjects", path: "/subjects" },
    {
      id: "Books",
      icon: AiOutlineProfile,
      label: "Books",
      path: "/books",
    },
    {
      id: "Chapters",
      icon: AiOutlineRead,
      label: "Chapters",
      path: "/chapters",
    },
    {
      id: "questions",
      icon: VscGitPullRequestGoToChanges,
      label: "Add Question",
      path: "/questionform/new",
    },
    {
      id: "listquestions",
      icon: IoIosList,
      label: "List Questions",
      path: "/questions",
    },
    
    {
      id: "Create Paper",
      icon: FiFilePlus,
      label: "Create Paper",
      path: "/paper",
    },
    {
      id: "My Papers",
      icon: AiOutlineFileText,
      label: "My Papers",
      path: "/mypapers",
    },
   
  ],
  school: [
    {
      id: "Create Paper",
      icon: FiFilePlus,
      label: "Create Paper",
      path: "/paper",
    },
    {
      id: "My Papers",
      icon: AiOutlineFileText,
      label: "My Papers",
      path: "/mypapers",
    },
  ],
};

import React from "react";
import { Link } from "react-router-dom";

type Buttonprops = {
  children: React.ReactNode;
  classname: string;
  onclick?: () => void;
  Type?: "submit" | "button";
  to?: string;
};
const Button: React.FC<Buttonprops> = ({
  children,
  classname,
  onclick,
  Type,
  to,
}) => {
  return (
    <>
      {to ? (
        <Link to={to}>
          <button className={classname} onClick={onclick} type={Type}>
            {children}
          </button>
        </Link>
      ) : (
        <button className={classname} onClick={onclick} type={Type}>
          {children}
        </button>
      )}
    </>
  );
};

export default Button;

import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useCurrentPmsEmployee } from "../hooks/auth";

export default function SelfEvaluationRedirect() {
  const navigate = useNavigate();
  const { data: currentEmployee } = useCurrentPmsEmployee();

  useEffect(() => {
    if (currentEmployee) {
      localStorage.setItem(
        "SelectedEmployee",
        JSON.stringify({
          id: currentEmployee.employee_code,
          name: currentEmployee.full_name,
        })
      );

      localStorage.setItem("CameFromView", "1");
      navigate("/self-evaluation-history", { replace: true });
    }
  }, [currentEmployee]);

  return <div>Loading...</div>;
}

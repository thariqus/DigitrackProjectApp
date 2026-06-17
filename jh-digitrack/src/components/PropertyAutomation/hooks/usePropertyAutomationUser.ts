import { useEffect, useState } from "react";

type LoggedInPropertyUser = {
  roles?: string[];
  is_cfo?: boolean;
  is_md?: boolean;
  is_approver_1?: boolean;
  is_approver_2?: boolean;
  is_approver_3?: boolean;
  has_gl_team_role?: boolean;
};
 

type LoggedInPropertyUserResponse = {
  message?: LoggedInPropertyUser;
};

export const usePropertyAutomationUser = () => {
  const [data, setData] = useState<LoggedInPropertyUserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch(
          "/api/method/jh_digitrack.api.property_management.get_logged_in_property_user",
          { credentials: "include" }
        );

        const result: LoggedInPropertyUserResponse = await res.json();
        setData(result);
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, []);

  return { data, loading, error };
};
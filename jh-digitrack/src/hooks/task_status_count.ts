export async function getTaskStatusCounts(jh_user_name: string) {
  const res = await fetch(
    `/api/method/jh_digitrack.api.tasks.get_task_status_counts?jh_user_name=${jh_user_name}`,
    {
      credentials: "include",
    }
  );
  const result = await res.json();
  return result.message || {};
}


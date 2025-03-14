import { Task } from "./tasks";

export interface TeamMember {
  id: string;
  full_name: string;
  tasks: Task[];
  reportees: TeamMember[];
  reportee_count?: number;
}

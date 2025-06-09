export type SeatchResults = SeatchResult[];

export interface SeatchResult {
  id: string;
  type: string;
  name: string;
  created_by: string;
  created_date: string;
  status: string;
  tasks?: Task[];
}

export interface Task {
  id: string;
  name: string;
  created_by: string;
  created_date: string;
  status: string;
  type: string;
}

export interface SearchRowProps {
  result: SeatchResult;
  index: number;
  onRowClick: (taskId: string, type: string) => void;
}

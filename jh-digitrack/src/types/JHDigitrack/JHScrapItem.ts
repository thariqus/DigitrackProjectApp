export interface JHScrapItem {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: 0 | 1 | 2;
  idx?: number;

  item_name: string;
  date: string;
  modified_date: string;
  employee_id: string;
  employee_name: string;
  contact_details?: string;
  status: "Available" | "Sold" | "On Hold" | string;
  quantity: number;
  location?: string;
  description?: string;

  image1?: string | null;
  image2?: string | null;
  image3?: string | null;

}

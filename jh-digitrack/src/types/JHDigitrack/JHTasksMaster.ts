export interface JHTasksMaster {
  name: string;
  creation: string;
  modified: string;
  deleted_at: string;
  owner: string;
  modified_by: string;
  docstatus: 0 | 1 | 2;
  parent?: string;
  parentfield?: string;
  parenttype?: string;
  idx?: number;
  /**	Task Name : Data	*/
  task_name?: string;
  /**	Description : Text	*/
  description?: string;
  /**	Assigned To : Link - JH User Master	*/
  assigned_to?: string;
  assigned_to_id?: string;
  /**	Created By : Link - JH User Master	*/
  created_by?: string;
  created_by_id?: string;
  /**	Status : Select	*/
  status?: "Open" | "In Progress" | "Canceled" | "Completed" | "Closed";
  /**	Due Date : Date	*/
  due_date?: string;
  /**	Revised Due Date : Date	*/
  revised_due_date?: string;
  /**	Effort (In Hrs) : Data	*/
  effort?: string;
  /**	Completion Date : Date	*/
  completion_date?: string;
  /**	Source Doctype : Link - DocType	*/
  source_doctype?: string;
  /**	Source : Dynamic Link	*/
  source?: string;
  /**	Business ID : Link - JH Business Master	*/
  business_id?: string;
  /**	Division ID : Link - JH Division Master	*/
  division_id?: string;
  /**	Serial Number : Data	*/
  serial_number?: string;
  /**	Start After Serial Number : Data	*/
  start_after?: string;
  /**	Private? : Check	*/
  private?: 0 | 1;
  /**	Task Pic By Creator : Attach Image	*/
  task_pic_by_creator?: string;
  /**	Task Pic By Assignee : Attach Image	*/
  task_pic_by_assignee?: string;
  /** Name of Assigned User: will return in assigned_to key*/
  "assigned_to.full_name as assigned_to": string;
  "assigned_to.name as assigned_to_id": string;
  "created_by.full_name as created_by": string;
  "created_by.name as created_by_id": string;
  changelog?: {
    comment: string;
    creator: string;
    type: string;
    creation: string;
    remark: string;
  }[];
}

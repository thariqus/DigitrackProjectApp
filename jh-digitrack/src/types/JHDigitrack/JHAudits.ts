export interface JHAudits {
  name: string;
  creation: string;
  modified: string;
  owner: string;
  modified_by: string;
  docstatus: 0 | 1 | 2;
  parent?: string;
  parentfield?: string;
  parenttype?: string;
  idx?: number;
  /**	Audit Name : Data	*/
  audit_name: string;
  /**	Audit Description : Long Text	*/
  audit_description?: string;
  /**	Additional Comments : Long Text	*/
  additional_comments?: string;
  /**	Status : Select	*/
  status: "Open" | "Completed";
  /**	Created By : Link - JH User Master	*/
  created_by: string;
  created_by_id?: string;

  /**	Start Date : Datetime	*/
  start_date: string;
  /**	Completion Date : Datetime	*/
  completion_date?: string;
  /**	Folder Name : Data	*/
  folder_name?: string;
  /**	File Name : Data	*/
  file_name?: string;
  /**	Business : Link - JH Business Master	*/
  business?: string;
  /**	Division : Link - JH Division Master	*/
  division?: string;
  /**	Remarks : Long Text	*/
  remarks?: string;

  "created_by.full_name as created_by"?: string;
  "created_by.name as created_by_id"?: string;
}

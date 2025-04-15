import { JHChangeLog } from './JHChangeLog'

export interface JHTaskMaster{
	name: string
	creation: string
	modified: string
	owner: string
	modified_by: string
	docstatus: 0 | 1 | 2
	parent?: string
	parentfield?: string
	parenttype?: string
	idx?: number
	/**	Task Name : Data	*/
	task_name: string
	/**	Description : Long Text	*/
	description?: string
	/**	Source Doctype : Link - DocType	*/
	source_doctype?: string
	/**	Source : Dynamic Link	*/
	source?: string
	/**	Serial Number : Data	*/
	serial_number?: string
	/**	Start After : Data	*/
	start_after?: string
	/**	Private? : Check	*/
	private?: 0 | 1
	/**	Status : Select	*/
	status: "Open" | "In Progress" | "Canceled" | "Completed" | "Closed"
	/**	Created By : Link - JH User Master	*/
	created_by?: string
	/**	Assigned To : Link - JH User Master	*/
	assigned_to: string
	/**	Business ID : Link - JH Business Master	*/
	business_id: string
	/**	Division ID : Link - JH Division Master	*/
	division_id?: string
	/**	Due Date : Date	*/
	due_date?: string
	/**	Revised Due Date : Date	*/
	revised_due_date?: string
	/**	Effort (In Hrs) : Data	*/
	effort?: string
	/**	Completion Date : Date	*/
	completion_date?: string
	/**	Deleted at : Date	*/
	deleted_at?: string
	/**	Reminded At : Datetime	*/
	reminded_at?: string
	/**	Escalated At : Datetime	*/
	escalated_at?: string
	/**	Change Log : Table - JH Change Log	*/
	changelog?: JHChangeLog[]
	/**	Assignee Comments : Long Text	*/
	assignee_comments?: string
}
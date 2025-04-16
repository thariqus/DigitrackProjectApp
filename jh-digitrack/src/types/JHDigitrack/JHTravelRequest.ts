import { JHFileAttachments } from './JHFileAttachments'

export interface JHTravelRequest{
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
	/**	Travel : Link - JH Travel	*/
	travel: string
	/**	Request Type : Select	*/
	request_type?: "Hotel" | "Flight" | "Other"
	/**	Description : Long Text	*/
	description?: string
	/**	Urgent : Check	*/
	urgent?: 0 | 1
	/**	Request Status : Select	*/
	request_status?: "Aproval Pending" | "Approved" | "Denied" | "Completed"
	/**	Attachments : Table - JH File Attachments	*/
	attachments?: JHFileAttachments[]
}
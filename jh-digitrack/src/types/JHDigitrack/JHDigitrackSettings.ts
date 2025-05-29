
export interface JHDigitrackSettings{
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
	/**	Send scheduled emails : Check	*/
	send_scheduled_emails?: 0 | 1
	/**	Send welcome emails for new users : Check	*/
	send_welcome_emails?: 0 | 1
	/**	User Manual : Attach	*/
	user_manual?: string
}
import { JHUserChildTable } from './JHUserChildTable'
import { JHChangeLog } from './JHChangeLog'

export interface JHGroupedTaskMaster{
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
	/**	Title : Data	*/
	title: string
	/**	Type : Select	*/
	type: "group_task" | "meeting"
	/**	Organizer : Link - JH User Master	*/
	organizer: string
	/**	Meeting Date : Date	*/
	meeting_date?: string
	/**	Completion Date : Date	*/
	completion_date?: string
	/**	Duration (in mins) : Data	*/
	duration?: string
	/**	Location/Meeting Room : Data	*/
	location?: string
	/**	Status : Select	*/
	status: "Open" | "Completed"
	/**	Participants (Internal) : Table MultiSelect - JH User Child Table	*/
	internal_participants?: JHUserChildTable[]
	/**	Participants (External) : Long Text	*/
	participants_external?: string
	/**	Agenda : Long Text	*/
	agenda?: string
	/**	Visible To All : Check	*/
	visible_to_all?: 0 | 1
	/**	Remarks/Decisions : Long Text	*/
	remarks?: string
	/**	Changelog : Table - JH Change Log	*/
	changelog?: JHChangeLog[]
	/**	naming_series : Data	*/
	naming_series?: string
	/**	Reminded At : Datetime	*/
	reminded_at?: string
}
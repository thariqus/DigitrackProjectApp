
export interface JHTravel{
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
	/**	Source City : Data	*/
	source_city?: string
	/**	Destination City : Data	*/
	destination_city?: string
	/**	Start Date : Date	*/
	start_date?: string
	/**	End Date : Date	*/
	end_date?: string
	/**	Description : Long Text	*/
	description?: string
}
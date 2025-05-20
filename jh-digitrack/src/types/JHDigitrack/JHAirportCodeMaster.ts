
export interface JHAirportCodeMaster{
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
	/**	City : Data	*/
	city?: string
	/**	Airport Code : Data	*/
	airport_code?: string
}
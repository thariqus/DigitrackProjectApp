
export interface JHChangeLog{
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
	/**	comment : Data - user inputted comment	*/
	comment?: string
	/**	creator : Link - JH User Master	*/
	creator?: string
	/**	commented at : Datetime	*/
	commented_at?: string
	/**	type : Data	*/
	type?: string
	/**	remark : Data - a system generated remark of the changelog, (eg: x changed to y)	*/
	remark?: string
}
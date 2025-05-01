
export interface JHDivisionMaster{
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
	/**	Division ID : Data	*/
	division_id?: string
	/**	Division Name : Data	*/
	division_name?: string
	/**	Business : Link - JH Business Master	*/
	business?: string
	/**	SAP Reference ID : Data	*/
	sap_reference_id?: string
}
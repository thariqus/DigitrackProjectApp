
export interface JHBusinessMaster{
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
	/**	Business ID : Data	*/
	business_id?: string
	/**	Business Name : Data	*/
	business_name?: string
	/**	SAP Reference ID : Data	*/
	sap_reference_id?: string
}
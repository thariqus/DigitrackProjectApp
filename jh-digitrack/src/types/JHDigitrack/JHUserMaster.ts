
export interface JHUserMaster{
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
	/**	Employee Code : Data	*/
	employee_code?: string
	/**	First Name : Data	*/
	first_name?: string
	/**	Middle Name : Data	*/
	middle_name?: string
	/**	Last Name : Data	*/
	last_name?: string
	/**	Name : Data	*/
	full_name?: string
	/**	Email : Data	*/
	email?: string
	/**	Location Name : Data	*/
	location_name?: string
	/**	Designation Name : Data	*/
	designation_name?: string
	/**	Department Name : Data	*/
	department_name?: string
	/**	Region : Data	*/
	region?: string
	/**	Country : Data	*/
	country?: string
	/**	City : Data	*/
	city?: string
	/**	Position : Data	*/
	position?: string
	/**	Cost Center : Data	*/
	cost_center?: string
	/**	Employee Status : Data	*/
	employee_status?: string
	/**	Active : Check	*/
	active?: 0 | 1
	/**	Is Admin : Check	*/
	is_admin?: 0 | 1
	/**	Is Head of Department : Check	*/
	is_head_of_department?: 0 | 1
	/**	Business : Link - JH Business Master	*/
	business?: string
	/**	Division : Link - JH Division Master	*/
	division?: string
	/**	Reporting Manager : Link - JH User Master	*/
	reporting_manager?: string
}
export interface PMSEmployee {
	name: string
	creation?: string
	modified?: string
	owner?: string
	modified_by?: string
	docstatus?: 0 | 1 | 2
	parent?: string
	parentfield?: string
	parenttype?: string
	idx?: number

	/** First Name : Data */
	first_name: string

	/** Middle Name : Data */
	middle_name?: string

	/** Last Name : Data */
	last_name?: string

	/** Full Name : Data */
	full_name?: string

	/** Employee Code : Data */
	employee_code: string

	/** Employee Email : Data */
	employee_email: string

	/** Band : Data */
	band?: string

	/** Business Unit : Data */
	business_unit?: string

	/** Manager Code : Data */
	manager_code?: string

	/** Manager Name : Link */
	manager_name?: string

	/** Manager Email : Data */
	manager_email?: string

	/** Self Assessment : Check */
	self_assessment?: 0 | 1

	/** PMS Admin : Check */
	pms_admin?: 0 | 1

	/** PMS Manager : Check */
	pms_manager?: 0 | 1

	/** PMS Employee : Check */
	pms_employee?: 0 | 1

	/** PMS Master : Check */
	pms_master?: 0 | 1
}

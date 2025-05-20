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
	/**	Request Type : Link - JH Travel Request Type - If 'Other', manually enter the article code.	*/
	request_type?: string
	/**	Article Code : Data	*/
	article_code?: string
	/**	Is Urgent : Check - If checked, the request will directly reach the credit card holder. Your manager can still see your request.	*/
	is_urgent?: 0 | 1
	/**	Reconfirmation Required : Check	*/
	reconfirmation_required?: 0 | 1
	/**	Request Status : Select - Check request status to see if your manager or credit card holder has engaged with your request.	*/
	request_status?: "Approval Pending" | "Approved" | "Denied" | "Completed" | "Urgent" | "Reconfirmation Pending" | "Reconfirmed" | "Assigned for PO / IEM" | "Assigned for GRN / Miro"
	/**	Requested By : Link - JH User Master	*/
	requested_by?: string
	/**	Assigned To : Link - JH User Master	*/
	assigned_to?: string
	/**	From City : Link - JH Airport Code Master	*/
	from_city?: string
	/**	To City : Link - JH Airport Code Master	*/
	to_city?: string
	/**	From Date : Date	*/
	from_date?: string
	/**	To Date : Date	*/
	to_date?: string
	/**	Travel Date : Date	*/
	travel_date?: string
	/**	Round Trip : Check	*/
	round_trip?: 0 | 1
	/**	Return date : Date	*/
	return_date?: string
	/**	Location : Data	*/
	location?: string
	/**	Preferred Hotel : Data - Name and location of the preferred hotel.	*/
	preferred_hotel?: string
	/**	Preferred Flight : Link - JH Travel Flight Master - Name of the preferred airlines.	*/
	preferred_flight?: string
	/**	Other Preffered Flight : Data	*/
	other_preffered_flight?: string
	/**	Passenger Information : Long Text	*/
	passenger_information?: string
	/**	Description (Budget, Other details etc.) : Long Text - Include any additional information like explanation, links or points.

	*/
	description?: string
	/**	Contact Number : Data	*/
	contact_number?: string
	/**	Attachments : Table - JH File Attachments	*/
	attachments?: JHFileAttachments[]
	/**	Company Code : Data	*/
	company_code?: string
	/**	Plant : Data	*/
	plant?: string
	/**	Assignment : Data	*/
	assignment?: string
	/**	Cost Center : Data	*/
	cost_center?: string
	/**	Qty : Data	*/
	qty?: string
	/**	GL : Data	*/
	gl?: string
	/**	PO. / IEM : Data	*/
	po_iem?: string
	/**	GRN / Miro : Data	*/
	grn_miro?: string
}
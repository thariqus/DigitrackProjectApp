export interface PropertyMaster {
  name: string;
  property_name: string;

  type_of_property: "Shop" | "Office" | "Warehouse" | "Other";
  business_used?: string;

  division_used: string;
  approver_1: string;
  approver_2?: string;
  booked_under: string;
  profit_center: string;

  number_of_units: number;
  number_of_premises: number;
  premise_number: string;

  staff_allocated: string;
  location: string;
  emirate: string;
  country: string;

  makani_number: string;
  po_box_number: string;
  po_box_renewal_date: string;

  landlord: string;
  real_estate: string;

  current_rent: number;
  renewal_date: string;
  landlord_security_deposit: number;

  tenancy_period: string;
  lease_start_date:string;

  electricity_accounts: number;
  electricity_connection_numbers: string;
  electricity_water_security_deposit: number;

  landline_numbers: string;
  internet_connection: string;

  cdc_expiry: string;
  hassantuk_expiry: string;

  documents?: {
    attachment?: string;
  }[];
}

export interface ChequeDetail {
  bank_name?: string;
  cheque_number?: string;
  cheque_amount?: number;
  cheque_date?: string;
  payee?: string;
  signatory?: string;
}

export interface RentalRenewal {
  name: string;
  property: string;
  current_rent: number;
  proposed_rent: number;
  additional_charges?: number;
  rent_change_percent?: number;
  renewal_from: string;
  renewal_to: string;

  payment_schedule?: string;
  new_security_deposit?: number;
  remarks?: string;
  supporting_documents?: string;
  renewed_contract_document?: string;

  // Child Table
  cheque_details?: ChequeDetail[];

  // PO / MIRO
  po_number?: string;
  miro_number?: string;

  // Fetched Property Information
  division?: string;
  location?: string;
  emirate?: string;
  landlord?: string;
  property_type?: string;
  number_of_units?: number;
  tenancy_period?: string;

  // Workflow
  workflow_state?:
    | "Draft"
    | "Pending Approver 1"
    | "Pending Approver 2"
    | "Pending CFO"
    | "Pending MD"
    | "Pending Cheque Details"
    | "Pending Property PO"
    | "Pending MIRO"
    | "Completed"
    | "Rejected";

  // Standard Frappe fields for dates
  creation: string;
  modified: string;
}

export interface DivisionMaster {
  name: string;
  division_name: string;
  division_code: string;
  division_head: string;
  division_gm: string;
  gm_user: string;
  active: boolean;
}

export interface PropertyAuditTrail {
  id: string;
  timestamp: string;
  user: string;
  document_type: string;
  document_name: string;
  action: string;
  changed_state: string;
  current_state: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  comments?: string;
}
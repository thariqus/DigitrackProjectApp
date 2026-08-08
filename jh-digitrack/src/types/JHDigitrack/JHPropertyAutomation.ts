export interface JHPropertyLandline {
  name?: string;
  landline_number: string;
  provider?: string;
  line_type?: "Fixed" | "Fax";
}

export interface JHPropertySewerageAccount {
  name?: string;
  location?: string;
  account_number?: number;
}

export interface PropertyMaster {
  name: string;
  property_name: string;

  co_code:number
  area_sqftmtr: number

  type_of_property: "Shop" | "Office" | "Warehouse" | "Other";
  other_property_type?: string;
  business_used?: string;

  division_used: string;
  approvers?: { order: number; approver: string }[];
  lease_type: string;
  per_staff_rent: number;
  property_status?: "Active" | "Closed" | "Vacated";
  remark: string;
  address:string;
  ownership: string;
  booked_under: string;
  profit_center: string;
  cost_center: string;
  per_sq_ft_rate:number;

  number_of_units: number;
  number_of_premises: number;
  // premise_number: string;

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
  security_deposit_cheques?: ChequeDetail[];

  tenancy_period: string;
  lease_start_date:string;

  electricity_accounts: number;
  electricity_connections?: JHPropertyElectricityConnection[];
  electricity_connection_numbers: string;
  electricity_water_security_deposit: number;

  landline_connections?: JHPropertyLandline[];
  landline_accounts?: number;
  landline_numbers?: string; // legacy
  sewerage_accounts?: JHPropertySewerageAccount[];
  internet_connection: number;

  cdc_expiry: string;
  hassantuk_expiry: string;
  cdc_certificate_document?: string;
  compliance_remarks?: string;
  has_active_renewal?: boolean;

  documents?: {
    document_type?: string;
    attachment?: string;
  }[];
}

export interface JHPropertyElectricityConnection {
  name?: string;
  premise_number: string;
  meter_id?: string;
  account_number?: string;
  connection_type?: "Electricity" | "Water" | "Dual";

  documents?: {
    attachment?: string;
  }[];
}

export interface ChequeDetail {
  cheque_type?: string;
  cheque_amount?: number;
  cheque_date?: string;
  payee?: string;
}

export interface MiroNumberDetail {
  name?: string;
  miro_number?: string;
}

export interface PropertyParticular {
  name?: string;
  label?: string;
  amount?: number;
}

export interface SupportingDocument {
  name?: string;
  document_type?: string;
  attachment?: string;
}

export interface RentalRenewal {
  name: string;
  property: string;
  property_name?: string;
  current_rent: number;
  proposed_rent: number;
  additional_charges?: number;
  rent_change?: number;
  rent_change_percent?: number;
  renewal_from: string;
  renewal_to: string;

  payment_schedule?: string;
  new_security_deposit?: number;
  remarks?: string;
  supporting_documents?: SupportingDocument[];
  renewed_contract_document?: string;

  // Child Table
  cheque_details?: ChequeDetail[];

  // PO / MIRO
  po_number?: string;
  table_gfwd?: MiroNumberDetail[];

  // Additional Charges / Particulars
  table_xqmr?: PropertyParticular[];

  // Fetched Property Information
  division?: string;
  location?: string;
  emirate?: string;
  landlord?: string;
  property_type?: string;
  number_of_units?: number;
  tenancy_period?: string;

  // Approver names (resolved from JH Property Master child table)
  approver_1_name?: string | null;
  approver_2_name?: string | null;
  approver_3_name?: string | null;
  approver_4_name?: string | null;
  approver_5_name?: string | null;
  approver_6_name?: string | null;

  // Workflow
  workflow_state?:
    | "Draft"
    | "Pending Approver 1"
    | "Pending Approver 2"
    | "Pending Approver 3"
    | "Pending Approver 4"
    | "Pending Approver 5"
    | "Pending Approver 6"
    | "Pending Cheque Details"
    | "Pending Admin HOD"
    | "Pending FC"
    | "Pending CFO"
    | "Pending MD"
    | "Pending Property PO"
    | "Pending MIRO"
    | "Completed"
    | "Withdrawn";

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
  action_time: string;
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
  role?: string;
}
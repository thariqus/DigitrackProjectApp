export interface PropertyMaster {
  name: string;
  property_name: string;
  type_of_property: "Shop" | "Office" | "Warehouse" | "Other";
  division_used: string;
  booked_under:string;
  profit_center:string;
  number_of_units: number;
  number_of_premises:number;
  premise_number: string;
  staff_allocated: string;
  location: string;
  emirate: string;
  country: string;
  makani_number: string;
  po_box_number: string;
  po_box_renewal_date:string;
  landlord: string;
  real_estate: string;
  current_rent: number;
  renewal_date: string;
  landlord_security_deposit: number;
  tenancy_period: string;
  electricity_accounts: number;
  electricity_connection_numbers : string;
  // electricity_security_desposit: number;
  electricity_water_security_deposit: number;
  landline_numbers: string;
  internet_connection:string;
  cdc_expiry : string;
  hassantuk_expiry : string;
  documents?: {
  attachment?: string;
}[];
}

export interface RentalRenewal {
  name: string;
  property: string;
  current_rent: number;
  proposed_rent: number;
  additional_charges?: number;
  rent_change_percent: number;
  renewal_from: string;
  renewal_to: string;
  payment_schedule: string;
  remarks?: string;
  supporting_documents?: string | string[];
  new_security_deposit?: string;
  renewed_contract_document : string | string[];
  // status: string;

  // Cheque Details
  bank_name?: string;
  cheque_number?: string;
  cheque_amount?: number;
  cheque_date?: string;
  payee:string;
  signatory: string;

  // PO
  po_number?: string;

  // MIRO
  miro_number?: string;
}

export interface DivisionMaster {
  name: string;
  division_name: string;
  division_code: string;
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
  previous_state: string;
  new_state: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  comment?: string;
}
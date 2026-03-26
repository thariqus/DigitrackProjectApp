export interface PropertyMaster {
  name: string;
  property_name: string;
  type_of_property: "Flat" | "Shop" | "Villa" | "Other";
  division_used: string;
  booked_under:string;
  profit_center:string;
  number_of_units: number;
  number_of_premises:number;
  premise_no: string;
  staff_allocated:number;
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
  electricity_accounts:string;
  electricity_connection_no : number;
  electricity_security_desposit: number;
  water_security_deposit: number;
  landline_numbers: number;
  internet_connection:string;
  CDC_exp: string;
  hassantuk_exp : string;
  attachments: string | string[];
}

export interface RentalRenewal {
  name: string;
  property: string;
  current_rent: number;
  proposed_rent: number;
  additional_charges?: number;
  rent_change_percentage: number;
  renewal_from: string;
  renewal_to: string;
  payment_schedule: string;
  remarks?: string;
  documents?: string | string[];

  status: string;

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
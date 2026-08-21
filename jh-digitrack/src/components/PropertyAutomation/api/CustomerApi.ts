import frappe from "@/utils/frappe-client";

export interface CustomerPayload {
  [key: string]: string | undefined;
  name?: string;
  customer_name: string;
  business_name: string;
  tr_number?: string;
  custom_trade_license_no?: string;
  address?: string;
  custom_street?: string;
  custom_area?: string;
  custom_region?: string;
  custom_city?: string;
  email_id?: string;
  po_box?: string;
  transportation_zone?: string;
  customer_group?: string;
  sales_district?: string;
  sales_office?: string;
  customer_code?: string;
  company_code?: string;
}

export interface ActivateCustomerResponse {
  status_code: number;
  message: string;
  matched: boolean;
  data?: Record<string, unknown>;
}

export interface TransportationZone {
  name: string;
  transportation_zone_code: string;
  transportation_zone_title: string;
}

export interface CustomerGroup {
  name: string;
  customer_group_name: string;
  customer_group_title: string;
}

export interface SalesDistrict {
  name: string;
  sales_district_code: string;
  sales_district_title: string;
}

const MASTER_MANAGEMENT_API = "jh_digitrack.api.mastermanagement_api";

export const createCustomer = async (payload: CustomerPayload) => {
  const res = await frappe.api.post(
    `${MASTER_MANAGEMENT_API}.create_customer`,
    payload
  );
  return res.message;
};

export const updateCustomer = async (payload: CustomerPayload) => {
  const res = await frappe.api.post(
    `${MASTER_MANAGEMENT_API}.update_customer`,
    payload
  );
  return res.message;
};

export const getCustomerList = async (page: number = 1, page_size: number = 20, search: string = "") => {
  const res = await frappe.api.get(
    `${MASTER_MANAGEMENT_API}.get_customer_list`,
    { page, page_size, search }
  );
  return res.message;
};

export const getTransportationZones = async (search: string = ""): Promise<TransportationZone[]> => {
  const res = await frappe.api.get(
    `${MASTER_MANAGEMENT_API}.get_transportation_zones`,
    { search }
  );
  return res.message?.data ?? [];
};

export const getCustomerGroups = async (search: string = ""): Promise<CustomerGroup[]> => {
  const res = await frappe.api.get(
    `${MASTER_MANAGEMENT_API}.get_customer_groups`,
    { search }
  );
  return res.message?.data ?? [];
};

export const getSalesDistricts = async (search: string = ""): Promise<SalesDistrict[]> => {
  const res = await frappe.api.get(
    `${MASTER_MANAGEMENT_API}.get_sales_districts`,
    { search }
  );
  return res.message?.data ?? [];
};

export const activateCustomer = async (
  customerCode: string,
  companyCode: string
): Promise<ActivateCustomerResponse> => {
  const res = await frappe.api.post(
    `${MASTER_MANAGEMENT_API}.activate_customer`,
    { customer_code: customerCode, company_code: companyCode }
  );
  return res.message;
};

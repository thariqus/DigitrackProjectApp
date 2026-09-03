import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createCustomer,
  updateCustomer,
  getCustomerList,
  getTransportationZones,
  getCustomerGroups,
  getSalesDistricts,
  activateCustomer,
  CustomerPayload,
  getEmirates,
} from "../api/CustomerApi";

export const useCreateCustomer = () =>
  useMutation({
    mutationFn: (payload: CustomerPayload) => createCustomer(payload),
  });

export const useUpdateCustomer = () =>
  useMutation({
    mutationFn: (payload: CustomerPayload) => updateCustomer(payload),
  });

export const useGetCustomerList = (page: number = 1, page_size: number = 20, search: string = "") =>
  useQuery({
    queryKey: ["customerList", page, page_size, search],
    queryFn: () => getCustomerList(page, page_size, search),
  });

export const useTransportationZones = (search: string = "") =>
  useQuery({
    queryKey: ["transportationZones", search],
    queryFn: () => getTransportationZones(search),
  });

export const useCustomerGroups = (search: string = "") =>
  useQuery({
    queryKey: ["customerGroups", search],
    queryFn: () => getCustomerGroups(search),
  });

export const useSalesDistricts = (search: string = "") =>
  useQuery({
    queryKey: ["salesDistricts", search],
    queryFn: () => getSalesDistricts(search),
  });

export const useActivateCustomer = () =>
  useMutation({
    mutationFn: ({ customerCode, companyCode }: { customerCode: string; companyCode: string }) =>
      activateCustomer(customerCode, companyCode),
  });

export const useEmirates = (search: string = "") =>
  useQuery({
    queryKey: ["emirates", search],
    queryFn: () => getEmirates(search),
  });

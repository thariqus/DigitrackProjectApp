import { useQuery } from "@tanstack/react-query";
import { propertyApi } from "../api/property";

export type QueryParams = Record<
  string,
  string | number | boolean | string[] | undefined
>;

export const useUserAccess = () =>
  useQuery({
    queryKey: ["UserAccess"],
    queryFn: propertyApi.getUserAccess,
    staleTime: 5 * 60 * 1000,
  });

export const usePropertyList = (params: QueryParams) =>
  useQuery({
    queryKey: ["PropertyList", JSON.stringify(params)],
    queryFn: () => propertyApi.getPropertyList(params),
  });

export const usePropertyDashboardCounts = () =>
  useQuery({
    queryKey: ["PropertyDashboardCounts"],
    queryFn: () => propertyApi.getPropertyDashboardCounts(),
    staleTime: 5 * 60 * 1000,
  });

export const useRenewalPipelineCounts = () =>
  useQuery({
    queryKey: ["RenewalPipelineCounts"],
    queryFn: () => propertyApi.getRenewalPipelineCounts(),
    staleTime: 5 * 60 * 1000,
  });

export const usePendingRenewals = (enabled: boolean) =>
  useQuery({
    queryKey: ["PendingRenewals"],
    queryFn: propertyApi.getPendingRenewals,
    enabled,
  });

export const useRenewalDoc = (name?: string) =>
  useQuery({
    queryKey: ["RenewalDoc", name],
    queryFn: () => propertyApi.getRenewalDoc(name!),
    enabled: !!name,
  });

export const usePropertyDoc = (name?: string) =>
  useQuery({
    queryKey: ["PropertyDoc", name],
    queryFn: () => propertyApi.getPropertyDoc(name!),
    enabled: !!name,
    staleTime: 1000, // Reduced for immediate fresh data after save
  });

export const useRenewalList = (params: QueryParams, enabled = true) =>
  useQuery({
    queryKey: ["RenewalList", JSON.stringify(params)],
    queryFn: () => propertyApi.getRenewalList(params),
    enabled,
  });

export const useRenewalAuditTrail = (renewalId?: string) =>
  useQuery({
    queryKey: ["RenewalAuditTrail", renewalId],
    queryFn: () => propertyApi.getRenewalAuditTrail(renewalId!),
    enabled: !!renewalId,
  });

export const useRenewalRole = (renewalId?: string) =>
  useQuery({
    queryKey: ["RenewalRole", renewalId],
    queryFn: () => propertyApi.getRenewalRole(renewalId!),
    enabled: !!renewalId,
  });

//  export const useBankAccounts = () =>
//   useQuery({
//     queryKey: ["BankAccounts"],
//     queryFn: propertyApi.getBankAccounts,
//     staleTime: 10 * 60 * 1000,
//   });

export const useChequeTypes = () =>
  useQuery({
    queryKey: ["ChequeTypes"],
    queryFn: propertyApi.getChequeTypes,
    staleTime: 30 * 60 * 1000,
  });

export const usePropertyTypes = () =>
  useQuery({
    queryKey: ["PropertyTypes"],
    queryFn: propertyApi.getPropertyTypes,
    staleTime: 30 * 60 * 1000,
  });

export const useDivisionsByBusiness = (business?: string | null) =>
  useQuery({
    queryKey: ["DivisionsByBusiness", business ?? ""],
    queryFn: () => propertyApi.getDivisionsByBusiness(business || undefined),
    staleTime: 5 * 60 * 1000,
  });
 
 
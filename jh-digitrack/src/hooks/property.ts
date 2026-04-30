import { PropertyMaster } from "@/types/JHDigitrack/JHPropertyAutomation"
import frappe from "@/utils/frappe-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"


export const usePropertyList = (filters?: any) => {
  return useQuery({
    queryKey: ["properties", filters],
    queryFn: async () => {
      const res = await frappe.api.get<{
        message: PropertyMaster[];
      }>("api_method", {
        doctype: "Property Master",  
        fields: ["*"],
        filters,
      });

      return res.message;
    },
  });
};

export const useProperty = (name:string) =>{
    return useQuery({
      queryKey:["property",name],
      queryFn: async ()=>{
        const res = await frappe.api.get<{
            message: PropertyMaster;
        }>("api_method",{
            doctype: "Property Master",
            name,
        })
        return res.message

      }  ,
      enabled : !!name,
    })
}


export const useCreateProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PropertyMaster) => {
      return frappe.api.post("api", {
        doc: {
          doctype: "Property Master",
          ...data,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
};


export const useUpdateProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PropertyMaster) => {
      return frappe.api.post("api", {
        doc: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
};
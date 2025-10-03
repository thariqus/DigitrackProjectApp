import { useQuery } from "@tanstack/react-query";
import frappeClient from "@/utils/frappe-client";
import { JHScrapItem } from "@/types/JHDigitrack/JHScrapItem";
import { useCurrentJhUser } from "@/hooks/auth";

export interface ScrapItemsResponse {
  data: JHScrapItem[];
  total: number;
}
export const useUserScrapItems = (
  created_by?: string,
  page: number = 1,
  page_size: number = 10,
  search_query?: string
) => {

  return useQuery({
    queryKey: ["scrap-items", created_by, page, page_size, search_query],
    queryFn: async () => {
      const response = await frappeClient.api.get<{
        message: {
          data: JHScrapItem[];
          total: number;
        };
      }>("jh_digitrack.api.scrapitem_search.user_scrap_items", {
        created_by,
        page,
        page_size,
        search_query,
      });

      console.log("Raw API response from frappeClient:", response);

      return response.message;
    },
    
    enabled: Boolean(created_by),
  });
};


import { useMutation } from "@tanstack/react-query";
import { parse, format } from "date-fns";

const formatDateToISO = (date?: string) => {
  if (!date) return undefined;

  try {
    const parsedDate = parse(date, "dd-MM-yyyy", new Date());
    const isoDate = format(parsedDate, "yyyy-MM-dd");
    return isoDate;
  } catch (e) {
    console.error("Date parsing error:", e);
    return date;
  }
};

export const useCreateScrapItem = () => {
  const { data: currentJhUser } = useCurrentJhUser();

  return useMutation({
    mutationFn: async (data: Partial<JHScrapItem>) => {
      const created_by = currentJhUser?.name;

      const payload = {
        ...data,
        created_by,
        date: formatDateToISO(data.date),
        modified_date: formatDateToISO(data.modified_date),
      };

      const response = await frappeClient.api.post<{ message: JHScrapItem }>(
        "jh_digitrack.api.scrapitem_search.create_scrap_item",
        payload
      );

      console.log("API response from create_scrap_item:", response);

      if (!response.message) {
        throw new Error("Failed to create scrap item");
      }

      return response.message;
    },
  });
};

export const useUpdateScrapItem = () => {
  return useMutation({
    mutationFn: async (data: Partial<JHScrapItem> & { name: string }) => {
      const payload = {
        ...data,
        date: formatDateToISO(data.date),
        modified_date: formatDateToISO(data.modified_date),
      };

      const response = await frappeClient.api.post<{ message: JHScrapItem }>(
        "jh_digitrack.api.scrapitem_search.update_scrap_item",
        payload
      );

      if (!response.message) {
        throw new Error("Failed to update scrap item");
      }

      return response.message;
    },
  });
};



export const useDeleteScrapItem = () => {
  return useMutation({
    mutationFn: async (name: string) => {
      const response = await frappeClient.api.post<{ message: string }>(
        "jh_digitrack.api.scrapitem_search.delete_scrap_item",
        { name }
      );

      if (!response.message) {
        throw new Error("Failed to delete scrap item");
      }

      return response.message;
    },
  });
};

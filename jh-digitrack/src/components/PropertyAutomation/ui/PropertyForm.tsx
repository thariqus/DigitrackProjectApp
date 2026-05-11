import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useCreateProperty } from "@/hooks/property";

const schema = z.object({
  property_name: z.string().min(1),
  emirate: z.string(),
  type: z.string(),
});

function PropertyForm({ onClose }: any) {
  const { mutate } = useCreateProperty();

  const form = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: any) => {
    mutate(data, {
      onSuccess: () => {
        onClose(false);
      },
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

      <Input placeholder="Property Name" {...form.register("property_name")} />
      <Input placeholder="Emirate" {...form.register("emirate")} />
      <Input placeholder="Type" {...form.register("type")} />

      <Button type="submit">Save</Button>
    </form>
  );
}

export default PropertyForm;
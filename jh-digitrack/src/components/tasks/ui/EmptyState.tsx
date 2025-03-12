export const EmptyState = () => (
  <div className="flex h-[300px] w-full flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50">
    <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
      <h3 className="mt-4 text-lg font-semibold">No tasks found</h3>
      <p className="mb-4 mt-2 text-sm text-muted-foreground">
        You don't have any tasks yet. Create one to get started.
      </p>
    </div>
  </div>
);

export default EmptyState;

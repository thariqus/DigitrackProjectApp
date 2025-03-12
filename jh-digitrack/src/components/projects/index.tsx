import { Clock } from "lucide-react";

function Projects() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(90vh-4rem)]">
      <Clock className="w-16 h-16 text-primary mb-4" />
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Projects</h1>
      <p className="text-xl text-gray-600">
        This feature is coming soon. Stay tuned!
      </p>
    </div>
  );
}

export default Projects;

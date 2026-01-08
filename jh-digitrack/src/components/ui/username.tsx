import { useCurrentJhUser } from '@/hooks/auth';
 
 
function Username() {
    const { data: currentJhUser } = useCurrentJhUser();
  return (
    <div className="pr-7 pt-1 text-right">
      <p className="text-base font-bold text-gray-900">
        {currentJhUser?.full_name}
      </p>
    </div>

  );
}
 
export default Username
 
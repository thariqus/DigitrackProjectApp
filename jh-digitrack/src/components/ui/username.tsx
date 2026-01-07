import { useCurrentJhUser } from '@/hooks/auth';
 
 
function Username() {
    const { data: currentJhUser } = useCurrentJhUser();
  return (
    <div className='text-black text-xs text-end pr-7 pt-1'>{currentJhUser?.full_name}</div>
  )
}
 
export default Username
 
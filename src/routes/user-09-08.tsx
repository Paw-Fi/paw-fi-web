import { useAuth } from '@/contexts/auth-context';
import { formatProfileForAI, useFinancialHealthProfile } from '@/hooks/use-financial-health-profile';
import { createFileRoute } from '@tanstack/react-router'
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm'; // Import the GFM plugin

export const Route = createFileRoute('/user-09-08')({
  component: RouteComponent,
})

function RouteComponent() {
    const { user } = useAuth();
    const { profile, isLoading: isProfileLoading, error: profileError, hasProfile, refetch: refetchProfile } = useFinancialHealthProfile(user?.id);
 if(!user){
    return <div>Please login to view this page</div>
 }
 if(isProfileLoading){
    return <div>Loading...</div>
 }
 if(profileError){
    return <div>Error: {profileError.message}</div>
 }
 if(!hasProfile){
    return <div>Please complete your financial health profile to view this page</div>
 }
 return(
    <div>
        <article className="prose prose-purple mx-auto max-w-none dark:prose-invert lg:prose-lg px-4 py-6">
    <ReactMarkdown remarkPlugins={[remarkGfm]} >{formatProfileForAI(user, profile)}</ReactMarkdown>
  </article>
    </div>
 )

}

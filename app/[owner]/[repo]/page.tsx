import LandingPage from '@/components/LandingPage'

interface RepoRoutePageProps {
 
  params: Promise<{
    owner: string
    repo: string
  }>
}

export default async function RepoRoutePage({
  params,
}: RepoRoutePageProps) {
  const { owner, repo } = await params
  const initialRepo = `${owner}/${repo}`

  return <LandingPage initialRepo={initialRepo} />
}

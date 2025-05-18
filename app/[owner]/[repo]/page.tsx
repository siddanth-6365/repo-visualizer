import LandingPage from '@/components/LandingPage';

interface RepoRoutePageProps {
    params: { owner: string; repo: string };
}

export default function RepoRoutePage({ params }: RepoRoutePageProps) {
    const initialRepo = `${params.owner}/${params.repo}`;
    return <LandingPage initialRepo={initialRepo} />;
}
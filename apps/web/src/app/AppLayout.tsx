import { TriangleAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useRouteError } from 'react-router';
import { ButtonLink } from '../components/ui';
import { ProjectSidebar } from '../features/projects/ProjectSidebar';
import { errorMessage } from '../lib/format';

export function AppLayout() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <ProjectSidebar />
      <main ref={mainRef} className="scrollbar-thin min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export function RouteError() {
  const error = useRouteError();
  return (
    <div className="grid h-dvh place-items-center p-8">
      <div className="max-w-md text-center">
        <TriangleAlert className="mx-auto mb-4 size-8 text-amber-400" />
        <h1 className="text-lg font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-zinc-400">{errorMessage(error)}</p>
        <ButtonLink to="/" className="mt-6">
          Voltar ao início
        </ButtonLink>
      </div>
    </div>
  );
}

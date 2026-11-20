import { createBrowserRouter } from 'react-router';
import { IdeaEditorPage } from '../features/ideas/IdeaEditorPage';
import { IdeasPage } from '../features/ideas/IdeasPage';
import { AppLayout, RouteError } from './AppLayout';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <IdeasPage /> },
      { path: 'ideas/new', element: <IdeaEditorPage /> },
      { path: 'ideas/:id', element: <IdeaEditorPage /> },
      {
        path: 'notes/:noteId?',
        lazy: () => import('../features/notes/NotesPage').then(({ NotesPage }) => ({ Component: NotesPage })),
      },
    ],
  },
]);

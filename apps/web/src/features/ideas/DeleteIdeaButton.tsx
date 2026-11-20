import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useDeleteIdea } from '../../api/hooks';
import type { IdeaDetail } from '../../api/types';
import { HoldButton } from '../../components/HoldButton';
import { projectIdeasPath } from '../../lib/routes';

export function DeleteIdeaButton({ idea }: { idea: Pick<IdeaDetail, 'id' | 'projectId'> }) {
  const remove = useDeleteIdea();
  const navigate = useNavigate();

  return (
    <HoldButton
      label="Segure 3 s para excluir a ideia"
      disabled={remove.isPending}
      onConfirm={() =>
        void remove.mutateAsync(idea.id).then(() => navigate(projectIdeasPath(idea.projectId), { replace: true }))
      }
      className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-rose-500/10 hover:text-rose-400"
    >
      <Trash2 className="size-4" />
      Segure para excluir
    </HoldButton>
  );
}

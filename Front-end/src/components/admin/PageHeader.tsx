import { ArrowLeft, LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  description?: string;
  icon?: LucideIcon;
  backTo?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, description, icon: Icon, backTo = "/admin", actions }: Props) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
      <div className="flex items-start gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate(backTo)}
          aria-label="Voltar"
          className="mt-0.5"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            {Icon ? <Icon className="w-6 h-6 text-primary" /> : null}
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

import { TogglePillButton } from "@/components/toggle-pill";
import { useTranslation } from "react-i18next";
import AmberButton from "@/components/amber-button";
import GreenSquareButton from "@/components/green-square-button";
import OrangeButton from "@/components/orange-button";
import RedButton from "@/components/red-button";
import { ticketStatusMeta } from "@/lib/ticket-status-meta";

interface TicketStatusActionPillProps {
  status: string;
}

export default function TicketStatusActionPill({ status }: TicketStatusActionPillProps) {
  const { t } = useTranslation();
  const meta = ticketStatusMeta[status];
  if (!meta?.actionPill) return null;

  const { variant, icon: Icon, labelKey } = meta.actionPill;
  const testId = `status-${meta.testIdStem}`;
  const content = (
    <>
      <Icon className="w-4 h-4" />
      {t(labelKey)}
    </>
  );

  switch (variant) {
    case "green-square":
      return <GreenSquareButton data-testid={testId}>{content}</GreenSquareButton>;
    case "orange-disabled":
      return (
        <OrangeButton disabled data-testid={testId}>
          {content}
        </OrangeButton>
      );
    case "amber-disabled":
      return (
        <TogglePillButton color="amber" disabled data-testid={testId}>
          {content}
        </TogglePillButton>
      );
    case "red-disabled":
      return (
        <TogglePillButton color="red" disabled data-testid={testId}>
          {content}
        </TogglePillButton>
      );
    default:
      return null;
  }
}

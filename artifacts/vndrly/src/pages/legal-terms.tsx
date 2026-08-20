import { LegalDocumentPage } from "@/components/legal-document-page";
import { TERMS_SECTIONS } from "@/lib/legal-docs";

export default function LegalTermsPage(): React.ReactElement {
  return (
    <LegalDocumentPage
      kind="terms"
      title="Terms & Conditions"
      description="The terms for using VNDRLY web, iOS, notification, ticketing, reporting, and field operations workflows."
      sections={TERMS_SECTIONS}
    />
  );
}

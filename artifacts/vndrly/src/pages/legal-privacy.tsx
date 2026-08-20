import { LegalDocumentPage } from "@/components/legal-document-page";
import { PRIVACY_POLICY_SECTIONS } from "@/lib/legal-docs";

export default function LegalPrivacyPage(): React.ReactElement {
  return (
    <LegalDocumentPage
      kind="privacy"
      title="Privacy Policy"
      description="How VNDRLY collects, uses, protects, and shares information for field operations, account administration, notifications, GPS-enabled workflows, tax-support records, and platform support."
      sections={PRIVACY_POLICY_SECTIONS}
    />
  );
}

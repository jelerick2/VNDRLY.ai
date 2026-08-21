# VNDRLY Communications Launch Readiness

This checklist covers the production communication pieces needed before broad vendor, partner, and field-employee onboarding.

## Public Compliance URLs

- Privacy Policy: https://vndrly.ai/legal/privacy
- Terms & Conditions: https://vndrly.ai/legal/terms
- Messaging consent disclosure: https://vndrly.ai/legal/messaging

## SendGrid

Required before production email:

- `SENDGRID_API_KEY` is a restricted SendGrid API key with Mail Send permission.
- `SENDGRID_FROM_EMAIL` uses a verified sender or authenticated VNDRLY domain.
- `SENDGRID_FROM_NAME` is set to `VNDRLY`.
- `SENDGRID_REPLY_TO` is set to a monitored support address.
- `SENDGRID_SANDBOX_MODE` is unset or `false`.
- SendGrid domain authentication is verified with the required DKIM/SPF CNAME records.
- After SendGrid confirms domain authentication, set `SENDGRID_DOMAIN_AUTHENTICATED=true` in the local SendGrid env file so deploys can publish that readiness status.

Validation:

```powershell
pnpm run smoke:communications
```

## Twilio SMS

For US production SMS, complete sender registration before depending on delivery.

Required before production SMS:

- `TWILIO_ACCOUNT_SID` is set.
- `TWILIO_API_KEY` and `TWILIO_API_SECRET` are set.
- `TWILIO_PHONE_NUMBER` is SMS-capable, or `TWILIO_MESSAGING_SERVICE_SID` is set.
- A2P 10DLC or toll-free verification is approved for the sender.
- After Twilio approves the sender/campaign, set `TWILIO_SENDER_REGISTRATION_STATUS=approved` in the local Twilio env file so deploys can publish that readiness status.

Recommended A2P campaign use case:

```text
Mixed / Low-volume mixed: account notifications, customer care, delivery notifications, and public service/operational alerts for VNDRLY field operations workflows.
```

Opt-in flow description:

```text
VNDRLY users opt in during partner or vendor onboarding at https://vndrly.ai/signup/partner or https://vndrly.ai/signup/vendor. SMS consent is presented as a separate, unchecked, voluntary checkbox. Users can create an account and continue onboarding without opting in to SMS. The opt-in text identifies VNDRLY, describes transactional and operational field-operations messages, states that message frequency varies, says message and data rates may apply, provides STOP and HELP instructions, and links to VNDRLY's Privacy Policy and Terms & Conditions. A public disclosure page is available at https://vndrly.ai/legal/messaging.
```

Sample SMS messages:

```text
VNDRLY: Ticket #1042 was assigned to you at Pioneer Midland. Reply STOP to opt out, HELP for help.
```

```text
VNDRLY: Your password reset link is ready: https://vndrly.ai/reset-password?token=example Reply STOP to opt out, HELP for help.
```

```text
VNDRLY: Ticket #1042 is missing required parts/labor details before submission. Open VNDRLY to complete it. Reply STOP to opt out, HELP for help.
```

```text
VNDRLY: Your field employee invite is ready. Finish setup at https://vndrly.ai/onboarding/field/example Reply STOP to opt out, HELP for help.
```

## Production Health Page

Admins can verify readiness at:

```text
https://vndrly.ai/admin/communications-health
```

The page intentionally separates configured credentials from production readiness:

- SendGrid is not fully ready until sandbox mode is off and `SENDGRID_DOMAIN_AUTHENTICATED=true`.
- Twilio is not fully ready until credentials and sender are present and `TWILIO_SENDER_REGISTRATION_STATUS=approved`.
- Expo push is reported as endpoint-ready; true delivery still depends on valid stored device push tokens.

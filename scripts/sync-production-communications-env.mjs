#!/usr/bin/env node
import "./load-env-local.mjs";

import { Client } from "ssh2";
import { loadVpsSshConfig } from "./ssh-vps-config.mjs";

const COMMUNICATIONS_ENV_KEYS = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_API_KEY",
  "TWILIO_API_SECRET",
  "TWILIO_PHONE_NUMBER",
  "TWILIO_MESSAGING_SERVICE_SID",
  "TWILIO_SENDER_REGISTRATION_STATUS",
  "TWILIO_A2P_STATUS",
  "TWILIO_TOLL_FREE_VERIFICATION_STATUS",
  "SENDGRID_API_KEY",
  "SENDGRID_FROM_EMAIL",
  "SENDGRID_FROM_NAME",
  "SENDGRID_REPLY_TO",
  "SENDGRID_SANDBOX_MODE",
  "SENDGRID_DOMAIN_AUTHENTICATED",
];

function envFragment() {
  return (
    COMMUNICATIONS_ENV_KEYS.map((key) => {
      const value = process.env[key]?.trim() ?? "";
      return value ? `${key}=${value}` : "";
    })
      .filter(Boolean)
      .join("\n") + "\n"
  );
}

function redactedStatus() {
  return COMMUNICATIONS_ENV_KEYS.map((key) => {
    const value = process.env[key]?.trim() ?? "";
    return `${key}=${value ? "present" : "missing"}`;
  }).join("\n");
}

function remoteCommand(fragmentB64) {
  const pattern = `^(${COMMUNICATIONS_ENV_KEYS.join("|")})=`;
  return `
set -e
cd /var/www/vndrly
tmp=$(mktemp)
sudo cp .env.production "$tmp"
(sudo grep -vE '${pattern}' "$tmp" || true) | sudo tee .env.production >/dev/null
echo '${fragmentB64}' | base64 -d | sudo tee -a .env.production >/dev/null
sudo chown vndrly:vndrly .env.production
sudo chmod 600 .env.production
sudo systemctl restart vndrly-api
sleep 5
curl -sS http://127.0.0.1:8080/api/healthz
`;
}

function runRemote(command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const timer = setTimeout(() => {
      conn.end();
      reject(new Error("Timed out waiting for VPS SSH"));
    }, 120000);

    conn
      .on("ready", () => {
        clearTimeout(timer);
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }
          let stderr = "";
          stream.on("data", (d) => process.stdout.write(d));
          stream.stderr.on("data", (d) => {
            stderr += d.toString();
            process.stderr.write(d);
          });
          stream.on("close", (code) => {
            conn.end();
            if (code === 0) resolve();
            else reject(new Error(`Remote command failed (${code}): ${stderr}`));
          });
        });
      })
      .on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      })
      .connect(loadVpsSshConfig());
  });
}

async function main() {
  console.log(redactedStatus());
  const fragment = envFragment();
  if (!fragment.trim()) {
    throw new Error("No communications env values found locally.");
  }
  await runRemote(remoteCommand(Buffer.from(fragment, "utf8").toString("base64")));
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});

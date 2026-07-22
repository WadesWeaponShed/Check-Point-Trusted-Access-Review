import { mkdir, writeFile } from "node:fs/promises";
import { generateTrustedAccessReviewPdf } from "./direct_report_pdf.js";

const repeatedRows = Array.from({ length: 18 }, (_, index) => ({
  Name: `Gateway-${index + 1}`,
  "Allowed Host Access": index % 3 === 0 ? "Any IP address" : `192.168.${index}.0 / 24`,
  "Stealth Rule": index % 4 === 0 ? "Disabled - open access is at risk" : "Enabled",
  Information: `This representative evidence row verifies wrapping and pagination for gateway ${index + 1}.`
}));

const scan = {
  scannedAt: new Date().toISOString(),
  user: "Sample Operator",
  managementObjectName: "Sample-Management",
  baseUrl: "https://management.example.test:443",
  checks: [
    {
      id: "management.sample",
      category: "Management Plane Protection",
      title: "Restrict Administrative Source IP Addresses",
      recommendation: "Restrict administrative access to explicitly approved source addresses and validate translated management destinations in every applicable policy package.",
      recommendationWarning: "The management server is referenced by a manual NAT rule. Review all access rules associated with the original destination object.",
      status: "remediation-recommended",
      severity: "high",
      details: "The direct PDF generator must preserve long narrative content while keeping the report readable and consistently aligned.",
      detailRows: [{
        label: "Remediation Review Recommendation",
        text: "This intentionally long label verifies that labels wrap inside their own column and never overlap the corresponding value."
      }],
      source: "Hardening guide: Restrict Administrative Source IP Addresses",
      evidenceTable: {
        title: "NAT Rules Translating To The Management Server",
        columns: ["Policy Package", "Rule #", "Rule Name", "Original Destination", "Translated Destination", "Disabled"],
        rows: Array.from({ length: 10 }, (_, index) => ({
          "Policy Package": "Standard",
          "Rule #": index + 1,
          "Rule Name": `Representative Manual NAT Rule ${index + 1}`,
          "Original Destination": `mgmt_nat_${index + 1}`,
          "Translated Destination": "Sample-Management",
          Disabled: index === 4 ? "Yes" : "No"
        }))
      }
    },
    {
      id: "gateway.sample",
      category: "Decreasing Security Gateway Exposure with Policy",
      title: "Implement Security Gateway Stealth Rule",
      recommendation: "Configure and enable a Stealth Rule for every Security Gateway.",
      detailsWarning: "Gateway-5 stealth rule is currently disabled. Please review and enable the stealth rule.",
      status: "needs-review",
      severity: "high",
      source: "Hardening guide: Security Gateway Stealth Rule",
      evidenceTable: {
        title: "Policy Package: Standard Access Policy: Network",
        columns: ["Gateway", "Rule #", "Disabled", "Rule Name", "Source", "Destination", "Service", "Action", "Log", "Stealth Rule"],
        rows: Array.from({ length: 12 }, (_, index) => ({
          Gateway: "Gateway-5",
          "Rule #": index + 1,
          Disabled: index === 5 ? "Disabled" : "",
          "Rule Name": index === 5 ? "Stealth Rule" : `Administrative Access ${index + 1}`,
          Source: "Management Networks, Trusted Administrators",
          Destination: "Gateway-5",
          Service: "HTTPS, SSH, CPMI",
          Action: index === 5 ? "Drop" : "Accept",
          Log: "Log",
          "Stealth Rule": index === 5 ? "Yes" : "Above Stealth"
        }))
      }
    },
    {
      id: "gaia.sample",
      category: "Gaia OS Hardening",
      title: "Enable Security Gateway System Logging To The Management Server Without Crowding Status Badges",
      recommendation: "Restrict Gaia WebUI and SSH access to approved hosts or networks.",
      status: "informational",
      severity: "medium",
      detailRows: [{ label: "Details", text: "Representative device evidence is shown below.", bullets: ["Review AnyHost entries", "Confirm the Stealth Rule is enabled"] }],
      source: "Hardening guide: Gaia OS allowed host access",
      evidenceTable: {
        title: "Information",
        columns: ["Name", "Allowed Host Access", "Stealth Rule", "Information"],
        rows: repeatedRows
      }
    }
  ]
};

await mkdir("output/pdf", { recursive: true });
await writeFile("output/pdf/trusted-access-review-sample.pdf", await generateTrustedAccessReviewPdf(scan));
console.log("output/pdf/trusted-access-review-sample.pdf");

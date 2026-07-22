# Check Point Trusted Access Review

Local web app for conducting a Check Point Trusted Access Review with trusted Check Point Management API commands. Most checks are review-only. Any available remediation action requires explicit operator approval.

## Self-Contained Releases

Prebuilt versions are available under [`dist/`](dist/) for users who do not want to install Node.js, npm, Git, or the source code:

- **Windows x64:** [`dist/windows-x64/`](dist/windows-x64/) contains the standalone `.exe` and a matching ZIP.
- **macOS Apple Silicon:** [`dist/macos-apple-silicon/`](dist/macos-apple-silicon/) contains the distributable `.app` ZIP, extracted app, and standalone arm64 executable.

The self-contained releases include the Node.js runtime, web interface, backend, and direct PDF report generator. They bind only to `127.0.0.1`, prefer port `4000`, automatically try `4001`, `4002`, and higher ports when needed, and open the selected local URL in the default browser.

For GitHub, publish the platform ZIPs—and optionally the Windows `.exe`—as **GitHub Release assets**. Users should not download `node_modules` or the source tree merely to run a self-contained release. See [`dist/README.md`](dist/README.md) for the artifact layout.

The current app is aligned to the Check Point Gateway and Management Hardening Administration Guide.

This tool is not created or supported by Check Point and should be used at your own risk.

The app runs locally, logs in to a Check Point Security Management Server or MDS, scans available Management API evidence, and presents guide-aligned hardening checks. Most checks are review-only; specific remediation actions are offered only when explicitly implemented and require operator approval. Checks that require network design review, Gaia Portal, Gaia API, SSH/Clish, identity provider settings, or out-of-band management inspection are marked for manual validation.

## What It Checks

The scanner currently covers these hardening-guide areas:

- Security Gateway stealth rule review.
- Implied rules and implied-rule logging review.
- Management Server protected-segment and administrative source restriction review.
- SmartConsole trusted client restriction evidence.
- Administrator account, MFA, password, idle timeout, expiration, and lockout review.
- MFA and external Identity Provider administrative authentication review.
- Least-privilege integration credential review.
- Dynamic updates / AutoUpdater consent evidence.
- cpdiag / diagnostics and telemetry consent evidence.
- Gaia OS hardening review inventory for gateways.
- SNMP, syslog, Expert mode, LOM, and advanced implied-rule replacement manual checks.
- Security Feature Usage review for licensed blades and feature expiration evidence.

## Workflow

1. Log in with a Check Point Management API user.
2. Click **Scan Hardening Posture**.
3. Review pass, remediation-required, needs-review, manual, and unknown findings.
4. Use the evidence and guide section references to drive operator validation.

For MDS environments, enable **MDS Scan** on the login form. This exposes two fields that matter:

- **Domain** selects the Management API domain context for domain-level policy and object checks.
- **Global MDS Object Name** names the actual MDS object used for Gaia `run-script` checks against the box itself. This is required when the login host is the MDS IP but the selected API domain is a CMA/domain, because commands such as `run-script` must target the MDS object name, not the MDS IP or the CMA/domain IP.

When **MDS Scan** is enabled, the app creates two Check Point Management API sessions:

- A domain/CMA session logs in with the selected **Domain** and is used for domain-level objects, policy packages, access rules, administrators, trusted clients, and other normal domain checks.
- An MDS/global session logs in to the same Management host without a domain and is used only for Gaia `run-script` commands that target the **Global MDS Object Name**. This is necessary for checks that inspect the MDS server operating system itself, such as management server interface/default-route discovery, Gaia administrator settings, Gaia password policy, SNMP, and management server syslog forwarding.
- A Global domain session is also opened when available. This is used when a domain policy is installed under a Global Policy layer and the app needs to read Global parent access rules above the domain placeholder.

In `mgmt_cli` terms, the domain checks behave like commands that include `--domain "<Domain>"`, while MDS host checks behave like `mgmt_cli -r true run-script targets.1 "<Global MDS Object Name>" ...` executed in the global MDS context.

Some MDS checks intentionally evaluate more than one management plane. For example, **Restrict Administrative Source IP Addresses** evaluates both the MDS/global management host IP and the selected Domain/CMA IP. For each IP, it attempts to resolve the matching object in the selected domain, checks network objects and address ranges containing the IP, follows groups containing those objects, and then collects access rules that reference them. If the matching domain rule is under a Global Policy parent layer, the app reads the Global access rulebase up to `Placeholder for domain rules` and includes those Global rules in the same Policy Package evidence table with a `GLOBAL RULES` marker.

For Smart-1 Cloud, enable **Smart-1 Cloud context URL** on the login form and enter the Management host with its context path, for example:

```text
tenant-name.maas.checkpoint.com/context-id/web_api
```

The app preserves that path and sends API requests to:

```text
https://tenant-name.maas.checkpoint.com/context-id/web_api/<command>
```

This matches the `mgmt_cli` Smart-1 Cloud context structure:

```bash
mgmt_cli -m tenant-name.maas.checkpoint.com --session-id <sid> --context context-id/web_api <cli_command>
```

When **Smart-1 Cloud context URL** is enabled, checks that require direct access to a customer-owned Management Server Gaia object are skipped. In practice, this removes the **Management Plane Protection** checks such as **Protect Management Server Behind A Firewall** and **Restrict Administrative Source IP Addresses**, because the management server is hosted by Check Point and does not exist as a normal customer-managed Gaia object in the tenant domain.

The scan summary shows the current scan time and the previous scan recorded by the local app, including the Management API username that ran it. This history is kept in memory and resets when the local Node process restarts.

### Large Environment Mode

The login form includes **Large environment mode** for MDS or large multi-gateway environments. This mode does not skip checks or change evidence collection. It lowers scan pressure against the Management API by throttling concurrent API requests and Gaia `run-script` tasks during a full scan.

Default standard scan behavior:

- Management API collection commands run as fast as the local Node process schedules them.
- Gaia `run-script` collection is limited by `RUN_SCRIPT_CONCURRENCY`, which defaults to `8`.
- Administrator last-login audit queries use `show-logs` and are serialized by `SHOW_LOGS_CONCURRENCY`, which defaults to `1`.
- `show-task` polling waits `750 ms` between polling attempts.

Large environment mode behavior:

- Management API scan calls are throttled by `LARGE_ENV_API_CONCURRENCY`, which defaults to `10`.
- Gaia `run-script` collection is limited by `LARGE_ENV_RUN_SCRIPT_CONCURRENCY`, which defaults to `3`.
- `show-logs` administrator last-login lookups remain serialized by `SHOW_LOGS_CONCURRENCY` to avoid parallel audit-search pressure.
- `show-task` polling waits `LARGE_ENV_TASK_POLL_INTERVAL_MS`, which defaults to `1250 ms`.
- Gaia `run-script` task output polling uses `TASK_POLL_ATTEMPTS`, which defaults to `20`. This is helpful when Smart-1 Cloud or remote gateways accept the `run-script` request before the decoded `show-task details-level full` output is ready.
- Security Gateway Stealth Rule checks use `show-access-rulebase` first in Large environment mode and Smart-1 Cloud mode. This avoids one `where-used details-level full` call per gateway, which can be expensive or time out in large/MDS/Smart-1 Cloud environments.

These values can be tuned with environment variables before starting the local backend:

```sh
LARGE_ENV_API_CONCURRENCY=8 LARGE_ENV_RUN_SCRIPT_CONCURRENCY=2 LARGE_ENV_TASK_POLL_INTERVAL_MS=1500 TASK_POLL_ATTEMPTS=20 TASK_POLL_INTERVAL_MS=1000 SHOW_LOGS_CONCURRENCY=1 CP_LOG_API_TIMEOUT_MS=120000 CP_VPN_API_TIMEOUT_MS=120000 VPN_COMMUNITY_PAGE_LIMIT=50 npm start
```

Administrator last-login checks query SmartConsole audit logins with a filter equivalent to `administrator:<name> AND SmartConsole AND "Log In"`. `CP_LOG_API_TIMEOUT_MS` controls the timeout for these `show-logs` requests separately from normal Management API calls.

CVE IKE VPN community checks page `show-vpn-communities-star` and `show-vpn-communities-meshed` with `VPN_COMMUNITY_PAGE_LIMIT`, which defaults to `50`, and use `CP_VPN_API_TIMEOUT_MS`, which defaults to `120000 ms`. This keeps Smart-1 Cloud and MDS scans from requesting very large `details-level full` VPN community payloads in one call.

Use this mode when scanning production MDS environments, busy management servers, or deployments with dozens of gateways where protecting `fwm` / Management API responsiveness is more important than the absolute fastest scan time.

Some checks require operator review even when the automated high-risk condition is absent. SmartConsole trusted clients, administrator accounts, and administrator password / idle timeout / expiration / lockout policy checks can be marked reviewed. In the same login session, the status changes to **Reviewed**. A new login changes the status back to **Needs review**, while the last review approval remains visible with the logged-in Management API username and timestamp.

For the administrator password / idle timeout / expiration / lockout policy check, operators can also mark the check reviewed while it is **Remediation Required**. The app warns that the operator is accepting settings Check Point does not recommend before recording that review.

The top summary combines **Remediation Required** and **Remediation Recommended** findings into one **Remediation Needed** count.

## Security Notes

- The app defaults to HTTPS when connecting to the Check Point management server.
- Do not enter the management server as `http://...`; that would send the Check Point API login over cleartext HTTP.
- The browser talks to the local backend over `http://127.0.0.1:4000` by default, or the next available local port.
- The username and password are sent from the browser to the local backend only on localhost.
- The backend sends the username and password to Check Point through the Management API login request.
- Passwords are not logged by the app.
- The Check Point session ID is stored only in server memory for the life of the local Node process.
- The **Allow self-signed certificate** option keeps TLS encryption but disables certificate validation. Use it only when needed.
- Remediation actions require explicit operator approval in the browser before the backend sends a change command.

## API Commands Used

The backend proxies these Check Point Management API commands:

- `login`
- `logout`
- `show-trusted-clients`
- `delete-trusted-client`
- `show-api-settings`
- `set-api-settings`
- `publish`
- `discard`
- `show-administrators`
- `delete-administrator`
- `show-default-administrator-settings`
- `set-default-administrator-settings`
- `show-smart-console-idle-timeout`
- `set-smart-console-idle-timeout`
- `show-login-restrictions`
- `show-cp-password-requirements`
- `set-cp-password-requirements`
- `show-simple-gateways`
- `show-global-properties`
- `set-global-properties`
- `run-script`
- `show-task`
- `insights/v3.0/show-suggestions-summary`
- `insights/v3.0/show-suggestions`

The Security Feature Usage check runs a Gaia `run-script` against each managed gateway target:

```sh
mgmt_cli run-script script-name "show license" targets.1 "GATEWAY_OBJECT_NAME" script "clish -c 'show license status'" --format json
mgmt_cli show-task task-id "<task-id>" details-level full --format json
```

The app decodes `task-details[].responseMessage`, extracts known blade codes such as `FW`, `VPN`, `IPS`, and `URLF` from license feature/date rows, and also includes perpetual built-in blade codes from the top feature line (`FW`, `VPN`, `IA`). Appliance/model/term suffixes such as `3950-2Y` are ignored, and known blade codes are translated into human-readable blade names such as `IPS`, `URL Filtering`, or `Anti-Bot`. Evidence is grouped by gateway with compact `License Feature`, `Expiration Date`, and `Enabled/Disabled` tables. The enabled state is read from `show gateways-and-servers details-level full` under `network-security-blades`; missing blade keys are treated as disabled. Advanced DNS Security is marked for manual confirmation in the assigned Threat Profile because it is not exposed as a normal gateway blade flag.

The SmartConsole trusted clients check runs the equivalent of:

```sh
mgmt_cli -r true show trusted-clients --domain "System Data" details-level full --format json
```

The webapp logs in to the Management API domain `System Data`, pulls trusted client `name`, `type`, and type-specific IP data, and displays them in an evidence table. It marks the check as **Remediation Required** when a returned object has `type` set to `any`.

When a trusted client object has `type` set to `any`, the app offers the first remediation action. It looks up that object's actual `uid` and runs the equivalent of:

```sh
mgmt_cli delete trusted-client uid "<returned-any-object-uid>" --domain "System Data"
mgmt_cli publish --domain "System Data"
```

If publish fails after the delete command, the app attempts `discard` in the same `System Data` session so the object is not left locked by an unpublished change.

The trusted clients evidence table also lets operators select one or more returned trusted client objects and delete them from the webapp. The app validates the selected `uid` values against the current `show-trusted-clients` output, then runs the equivalent of:

```sh
mgmt_cli delete trusted-client uid "<selected-trusted-client-uid>" --domain "System Data"
mgmt_cli publish --domain "System Data"
```

For multiple selected clients, the delete command is run once per selected `uid`, followed by a single publish. If a delete or publish fails after changes begin, the app attempts `discard` in the same `System Data` session.

The implied rules logging check runs the equivalent of:

```sh
mgmt_cli -r true show global-properties details-level full --format json
```

The webapp pulls every key/value pair inside the returned `firewall` object and displays it in a table. If `log-implied-rules` is `false`, the check is marked **Remediation Required** and the row offers an inline remediation button that runs the equivalent of:

```sh
mgmt_cli set global-properties firewall.log-implied-rules true
mgmt_cli publish
```

The Management API Access check runs the equivalent of:

```sh
mgmt_cli -r true show api-settings --domain "System Data" --format json
```

The webapp displays the `accepted-api-calls-from` value. If it is `all ip addresses`, the check is marked **Remediation Required** and offers the equivalent of:

```sh
mgmt_cli set api-settings accepted-api-calls-from "all ip addresses that can be used for gui clients" --domain "System Data" --format json
mgmt_cli publish --domain "System Data"
```

If API access is already limited to GUI clients, the check displays the trusted clients evidence table for review.

The Policy Insights checks run read-only Access Control Insights calls:

```sh
mgmt_cli insights/v3.0/show-suggestions-summary --method POST --format json
mgmt_cli insights/v3.0/show-suggestions --method POST --format json
```

The detailed suggestions request is filtered for `unused-objects`, `tighten-rule`, `delete-disabled-rule`, and `zero-hits-rule`, with a first-page limit of 50 suggestions.

The administrator account review runs the equivalent of:

```sh
mgmt_cli -r true show-administrators --domain "System Data" details-level full --format json
```

The webapp logs in to the Management API domain `System Data` for this collection step, then displays an evidence table with `Name`, `Permission Profile Name`, `Authentication-Method`, and `expiration-date`. Expiration values are converted from `iso-8601` into a human-readable date and time. Administrators without an `expiration-date` key are shown as `Never`.

The MFA and Identity Provider Integration check uses `show default-administrator-settings` to display the default `authentication-method`, then uses `show-administrators` to list administrators whose `authentication-method` is `check point password` or `os password`. If the default method or any administrator uses password-based authentication, the check is marked **Remediation Recommended**. Operators can mark the section reviewed, and the same reviewed-by history pattern is shown. The check includes a setup-help button with SmartConsole and external IdP SAML configuration guidance.

The administrator account table lets operators select one or more returned administrator objects and delete them from the webapp. The app validates the selected `uid` values against the current `show-administrators` output, then runs the equivalent of:

```sh
mgmt_cli delete administrator uid "<selected-administrator-uid>" --domain "System Data"
mgmt_cli publish --domain "System Data"
```

For multiple selected administrators, the delete command is run once per selected `uid`, followed by a single publish. If a delete or publish fails after changes begin, the app attempts `discard` in the same `System Data` session.

The administrator password, idle timeout, expiration, and lockout policy check runs the equivalent of:

```sh
mgmt_cli show default-administrator-settings --domain "System Data" --format json
mgmt_cli show smart-console-idle-timeout --domain "System Data" --format json
mgmt_cli show login-restrictions --domain "System Data" --format json
mgmt_cli show cp-password-requirements --domain "System Data" --format json
```

The webapp displays the returned settings in a `Setting`, `Value`, and `State` table. Default administrator expiration set to `never`, disabled SmartConsole idle timeout, disabled admin account lockout, disabled automatic unlock, or `min-password-length` less than `10` are marked as needing remediation.

When the default administrator authentication method is `check point password`, the `State` column recommends using an authentication method that supports MFA or an external Identity Provider.

For default administrator expiration, the `State` column displays the returned expiration detail: a formatted `expiration-date` value, or the `expiration-period` plus `expiration-period-time-units` value when the type is `expiration-period`.

When default administrator expiration is set to `never`, the app offers a recommended remediation action. It runs the equivalent of:

```sh
mgmt_cli set default-administrator-settings expiration-type "expiration period" expiration-period "4" expiration-period-time-units "months" --domain "System Data" --format json
mgmt_cli publish --domain "System Data"
```

If publish fails after the settings change, the app attempts `discard` in the same `System Data` session so the setting is not left locked by an unpublished change.

When SmartConsole idle timeout is disabled, the app offers a recommended remediation action. It runs the equivalent of:

```sh
mgmt_cli set smart-console-idle-timeout enabled true timeout-duration "10" --domain "System Data" --format json
mgmt_cli publish --domain "System Data"
```

If publish fails after the idle timeout change, the app attempts `discard` in the same `System Data` session.

When minimum password length is less than `10`, the app offers a recommended remediation action. It runs the equivalent of:

```sh
mgmt_cli set cp-password-requirements min-password-length "10" --domain "System Data" --format json
mgmt_cli publish --domain "System Data"
```

If publish fails after the password requirement change, the app attempts `discard` in the same `System Data` session.

## Install and Run

Running from source requires Node.js 18 or newer and the npm dependencies declared in `package.json`. Users of the self-contained releases do not need Node.js, npm, or Git.

### macOS From Source

1. Install Node.js 18 or newer from [nodejs.org](https://nodejs.org/) or Homebrew.

   ```sh
   brew install node
   ```

2. Download or clone this project.

   ```sh
   git clone <repo-url>
   cd "Check Point Trusted Access Review"
   ```

3. Install dependencies and start the local app.

   ```sh
   npm install
   npm start
   ```

4. Open the app.

   ```text
   http://127.0.0.1:4000
   ```

### Windows From Source

1. Install Node.js 18 or newer from [nodejs.org](https://nodejs.org/).

2. Download and extract the project ZIP, or clone the repository with Git for Windows.

   ```powershell
   git clone <repo-url>
   cd "Check Point Trusted Access Review"
   ```

3. Install dependencies and start the local app.

   ```powershell
   npm install
   npm start
   ```

4. Open the app in a browser.

   ```text
   http://127.0.0.1:4000
   ```

### Optional Port Change

By default the app prefers `127.0.0.1:4000` and automatically moves upward if the port is occupied. To require a specific port:

macOS:

```sh
PORT=4500 npm start
```

Windows PowerShell:

```powershell
$env:PORT = "4500"
npm start
```

Then open:

```text
http://127.0.0.1:4500
```

## Troubleshooting

The server prints request diagnostics to the terminal. A successful login attempt will show lines similar to:

```text
Local API request requestId=abc12345 route=/api/login
Login request received target=https://mgmt.example.com/web_api/login user=admin
Check Point API request starting command=login target=https://mgmt.example.com/web_api/login
```

If the browser shows a login error with a request ID but packet capture shows no outbound attempt to the management server, compare the terminal `target=` value with your packet capture filter.

If there is no `Local API request` line at all, the browser is not reaching the local backend. Confirm the app is running and that you opened the correct local URL.

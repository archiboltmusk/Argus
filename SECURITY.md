# Security Policy

The Argus Project maintains strict security, privacy, and integrity standards across all supported operating systems and architectures.

---

## Supported Releases

Security patches are actively applied to `main` and all official production releases.

| Version / Target | Supported | Security Update Cadence |
| :--- | :---: | :--- |
| `main` (Development) | :white_check_mark: | Continuous CI/CD deployment |
| Latest Stable Release (v3.17.x) | :white_check_mark: | Critical hotfixes within 24–48 hours |
| Older Minor Releases | :x: | Upgrades to latest release recommended |

---

## Reporting a Security Vulnerability

If you identify a security defect, memory corruption vulnerability, credential disclosure, or sandbox escape:

1. **Do not create a public issue.**
2. Report the vulnerability confidentially via GitHub's [Private Vulnerability Reporting](https://github.com/archiboltmusk/Argus/security/advisories/new).
3. Include:
   - Vulnerability category (e.g. Memory Safety, Sandbox Escape, Path Traversal, Credential Exposure).
   - Affected client platform (macOS, Windows, Linux, iOS, Android, tvOS).
   - Detailed reproduction steps or proof-of-concept payload.
   - Recommended mitigation if available.

### Response Timelines & SLA
- **Initial Acknowledgment**: Within 48 hours.
- **Triage & Reproduction**: Within 5 business days.
- **Remediation & Patch Release**: Coordinated security release before public disclosure.

---

## Security Architecture & Defense Safeguards

1. **Zero Central Surveillance**: Argus operates with zero centralized behavioral tracking, analytics cookies, or usage telemetry.
2. **Local Credential Storage**: All OAuth tokens, user profiles, and API credentials reside strictly in local client storage or system keyrings.
3. **Isolated Network Layer**: Network requests are routed through safeFetch isolation boundaries preventing cross-origin IPC and token leakages.
4. **Automated SAST & Secret Scanning**: Every pull request is statically analyzed via GitHub CodeQL and Gitleaks to detect secret leaks, command injection, and buffer risks prior to merging.
5. **Least Privilege Execution**: GitHub Actions workflows run with explicit read-only permissions (`permissions: contents: read`) to prevent malicious PR supply chain attacks.

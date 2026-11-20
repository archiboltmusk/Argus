# Security Policy

The Argus maintainers prioritize the privacy, security, and integrity of the application.

---

## Supported Versions

Security updates are applied to the active development branch (`main`) and official releases.

| Version / Branch | Supported          |
| ---------------- | ------------------ |
| `main`           | :white_check_mark: |
| Latest Release   | :white_check_mark: |
| Older Releases   | :x:                |

---

## Reporting a Vulnerability

If you discover a potential security vulnerability:

1. **Please do not report security issues via public GitHub issues.**
2. Report vulnerabilities confidentially through GitHub Security Advisories under the repository's **Security** tab.
3. Provide:
   - A summary of the vulnerability.
   - Steps to reproduce or proof-of-concept material.
   - Affected client platform(s).

Maintainers aim to acknowledge reports within 48 hours and coordinate fixes prior to public disclosure.

---

## Architecture Safeguards

* **Zero Surveillance**: Argus contains no centralized tracking or analytics servers.
* **On-Device Storage**: User credentials, local tokens, and keys reside on the local device.
* **Local AI**: Automated speech recognition and educational processing run locally on-device.

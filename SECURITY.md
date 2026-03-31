# Security policy

## Reporting a vulnerability

If you discover a security vulnerability in ThriveMap, please **do not open a public issue**. Public issues are visible to everyone before the problem is fixed.

Instead, use GitHub's private disclosure feature:

1. Go to the [Security tab](../../security) of this repository
2. Click **Report a vulnerability**
3. Describe what you found and how to reproduce it

You'll receive a response as soon as possible. Once the issue is resolved, a public advisory will be published.

## Scope

ThriveMap is a static single-page application with no user accounts, no backend, and no stored personal data. The main areas of concern are:

- Exposed API keys or secrets in the source code or compiled bundle
- Dependencies with known vulnerabilities
- Cross-site scripting (XSS) in rendered content

## Out of scope

- Theoretical attacks with no practical impact on users
- Issues in third-party services (Equaldex, World Bank API, WHO GHO)
- Social engineering

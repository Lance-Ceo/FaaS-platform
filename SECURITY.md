# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Yes    |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email: security@faas.local (replace with your actual address)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

You will receive a response within 48 hours. We aim to release a patch within 7 days of confirmation.

## Security Hardening Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` and `JWT_REFRESH_SECRET` to random 64-char strings
- [ ] Change all default passwords (PostgreSQL, Redis, OpenFaaS, Grafana)
- [ ] Enable HTTPS in NGINX with valid TLS certificates
- [ ] Set `NODE_ENV=production`
- [ ] Restrict `CORS_ORIGINS` to your actual domain
- [ ] Enable Redis AUTH password
- [ ] Restrict Docker socket access to trusted containers only
- [ ] Set up network policies to isolate function containers
- [ ] Enable PostgreSQL SSL connections
- [ ] Rotate API keys regularly
- [ ] Set up log monitoring and alerting
- [ ] Review and tighten rate limits for your traffic patterns
